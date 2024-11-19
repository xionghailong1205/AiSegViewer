import { getEnabledElement, utilities as csUtils } from '@cornerstonejs/core';
import getViewportsForAnnotation from '../../../utilities/getViewportsForAnnotation';
import * as math from '../../../utilities/math';
import triggerAnnotationRenderForViewportIds from '../../../utilities/triggerAnnotationRenderForViewportIds';
import { getViewportIdsWithToolToRender } from '../../../utilities/viewportFilters';
import { addAnnotation, removeAnnotation, getAllAnnotations, getChildAnnotations, addChildAnnotation, clearParentAnnotation, } from '../../../stateManagement/annotation/annotationState';
import { ContourWindingDirection } from '../../../types/ContourAnnotation';
import { triggerAnnotationModified } from '../../../stateManagement/annotation/helpers/state';
import updateContourPolyline from '../../../utilities/contours/updateContourPolyline';
import { addContourSegmentationAnnotation, areSameSegment, isContourSegmentationAnnotation, removeContourSegmentationAnnotation, } from '../../../utilities/contourSegmentation';
import { getToolGroupForViewport } from '../../../store/ToolGroupManager';
import { hasTool, hasToolByName } from '../../../store/addTool';
const DEFAULT_CONTOUR_SEG_TOOL_NAME = 'PlanarFreehandContourSegmentationTool';
export default async function contourSegmentationCompletedListener(evt) {
    const sourceAnnotation = evt.detail
        .annotation;
    if (!isContourSegmentationAnnotation(sourceAnnotation)) {
        return;
    }
    const viewport = getViewport(sourceAnnotation);
    const contourSegmentationAnnotations = getValidContourSegmentationAnnotations(viewport, sourceAnnotation);
    if (!contourSegmentationAnnotations.length) {
        return;
    }
    const sourcePolyline = convertContourPolylineToCanvasSpace(sourceAnnotation.data.contour.polyline, viewport);
    const targetAnnotationInfo = findIntersectingContour(viewport, sourcePolyline, contourSegmentationAnnotations);
    if (!targetAnnotationInfo) {
        return;
    }
    const { targetAnnotation, targetPolyline, isContourHole } = targetAnnotationInfo;
    if (isContourHole) {
        const { contourHoleProcessingEnabled = false } = evt.detail;
        if (!contourHoleProcessingEnabled) {
            return;
        }
        createPolylineHole(viewport, targetAnnotation, sourceAnnotation);
    }
    else {
        combinePolylines(viewport, targetAnnotation, targetPolyline, sourceAnnotation, sourcePolyline);
    }
}
function isFreehandContourSegToolRegisteredForViewport(viewport, silent = false) {
    const toolName = 'PlanarFreehandContourSegmentationTool';
    const toolGroup = getToolGroupForViewport(viewport.id, viewport.renderingEngineId);
    let errorMessage;
    if (!toolGroup.hasTool(toolName)) {
        errorMessage = `Tool ${toolName} not added to ${toolGroup.id} toolGroup`;
    }
    else if (!toolGroup.getToolOptions(toolName)) {
        errorMessage = `Tool ${toolName} must be in active/passive state`;
    }
    if (errorMessage && !silent) {
        console.warn(errorMessage);
    }
    return !errorMessage;
}
function getViewport(annotation) {
    const viewports = getViewportsForAnnotation(annotation);
    const viewportWithToolRegistered = viewports.find((viewport) => isFreehandContourSegToolRegisteredForViewport(viewport, true));
    return viewportWithToolRegistered ?? viewports[0];
}
function convertContourPolylineToCanvasSpace(polyline, viewport) {
    const numPoints = polyline.length;
    const projectedPolyline = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
        projectedPolyline[i] = viewport.worldToCanvas(polyline[i]);
    }
    return projectedPolyline;
}
function getValidContourSegmentationAnnotations(viewport, sourceAnnotation) {
    const { annotationUID: sourceAnnotationUID } = sourceAnnotation;
    const allAnnotations = getAllAnnotations();
    return allAnnotations.filter((targetAnnotation) => targetAnnotation.annotationUID &&
        targetAnnotation.annotationUID !== sourceAnnotationUID &&
        isContourSegmentationAnnotation(targetAnnotation) &&
        areSameSegment(targetAnnotation, sourceAnnotation) &&
        viewport.isReferenceViewable(targetAnnotation.metadata));
}
function findIntersectingContour(viewport, sourcePolyline, contourSegmentationAnnotations) {
    const sourceAABB = math.polyline.getAABB(sourcePolyline);
    for (let i = 0; i < contourSegmentationAnnotations.length; i++) {
        const targetAnnotation = contourSegmentationAnnotations[i];
        const targetPolyline = convertContourPolylineToCanvasSpace(targetAnnotation.data.contour.polyline, viewport);
        const targetAABB = math.polyline.getAABB(targetPolyline);
        const aabbIntersect = math.aabb.intersectAABB(sourceAABB, targetAABB);
        const lineSegmentsIntersect = aabbIntersect &&
            math.polyline.intersectPolyline(sourcePolyline, targetPolyline);
        const isContourHole = aabbIntersect &&
            !lineSegmentsIntersect &&
            math.polyline.containsPoints(targetPolyline, sourcePolyline);
        if (lineSegmentsIntersect || isContourHole) {
            return { targetAnnotation, targetPolyline, isContourHole };
        }
    }
}
export function createPolylineHole(viewport, targetAnnotation, holeAnnotation) {
    const { windingDirection: targetWindingDirection } = targetAnnotation.data.contour;
    const { windingDirection: holeWindingDirection } = holeAnnotation.data.contour;
    addChildAnnotation(targetAnnotation, holeAnnotation);
    removeContourSegmentationAnnotation(holeAnnotation);
    const { contour: holeContour } = holeAnnotation.data;
    const holePolyline = convertContourPolylineToCanvasSpace(holeContour.polyline, viewport);
    updateContourPolyline(holeAnnotation, {
        points: holePolyline,
        closed: holeContour.closed,
    }, viewport);
    const { element } = viewport;
    const updatedToolNames = new Set([
        DEFAULT_CONTOUR_SEG_TOOL_NAME,
        targetAnnotation.metadata.toolName,
        holeAnnotation.metadata.toolName,
    ]);
    for (const toolName of updatedToolNames.values()) {
        const viewportIdsToRender = getViewportIdsWithToolToRender(element, toolName);
        triggerAnnotationRenderForViewportIds(viewportIdsToRender);
    }
}
function getContourHolesData(viewport, annotation) {
    return getChildAnnotations(annotation).map((holeAnnotation) => {
        const polyline = convertContourPolylineToCanvasSpace(holeAnnotation.data.contour.polyline, viewport);
        return { annotation: holeAnnotation, polyline };
    });
}
function combinePolylines(viewport, targetAnnotation, targetPolyline, sourceAnnotation, sourcePolyline) {
    if (!hasToolByName(DEFAULT_CONTOUR_SEG_TOOL_NAME)) {
        console.warn(`${DEFAULT_CONTOUR_SEG_TOOL_NAME} is not registered in cornerstone`);
        return;
    }
    if (!isFreehandContourSegToolRegisteredForViewport(viewport)) {
        return;
    }
    const sourceStartPoint = sourcePolyline[0];
    const mergePolylines = math.polyline.containsPoint(targetPolyline, sourceStartPoint);
    const contourHolesData = getContourHolesData(viewport, targetAnnotation);
    const unassignedContourHolesSet = new Set(contourHolesData);
    const reassignedContourHolesMap = new Map();
    const assignHoleToPolyline = (parentPolyline, holeData) => {
        let holes = reassignedContourHolesMap.get(parentPolyline);
        if (!holes) {
            holes = [];
            reassignedContourHolesMap.set(parentPolyline, holes);
        }
        holes.push(holeData);
        unassignedContourHolesSet.delete(holeData);
    };
    const newPolylines = [];
    if (mergePolylines) {
        const mergedPolyline = math.polyline.mergePolylines(targetPolyline, sourcePolyline);
        newPolylines.push(mergedPolyline);
        Array.from(unassignedContourHolesSet.keys()).forEach((holeData) => assignHoleToPolyline(mergedPolyline, holeData));
    }
    else {
        const subtractedPolylines = math.polyline.subtractPolylines(targetPolyline, sourcePolyline);
        subtractedPolylines.forEach((newPolyline) => {
            newPolylines.push(newPolyline);
            Array.from(unassignedContourHolesSet.keys()).forEach((holeData) => {
                const containsHole = math.polyline.containsPoints(newPolyline, holeData.polyline);
                if (containsHole) {
                    assignHoleToPolyline(newPolyline, holeData);
                    unassignedContourHolesSet.delete(holeData);
                }
            });
        });
    }
    Array.from(reassignedContourHolesMap.values()).forEach((contourHolesDataArray) => contourHolesDataArray.forEach((contourHoleData) => clearParentAnnotation(contourHoleData.annotation)));
    const { element } = viewport;
    const enabledElement = getEnabledElement(element);
    const { metadata, data } = targetAnnotation;
    const { handles, segmentation } = data;
    const { textBox } = handles;
    removeAnnotation(sourceAnnotation.annotationUID);
    removeAnnotation(targetAnnotation.annotationUID);
    for (let i = 0; i < newPolylines.length; i++) {
        const polyline = newPolylines[i];
        const startPoint = viewport.canvasToWorld(polyline[0]);
        const endPoint = viewport.canvasToWorld(polyline[polyline.length - 1]);
        const newAnnotation = {
            metadata: {
                ...metadata,
                toolName: DEFAULT_CONTOUR_SEG_TOOL_NAME,
                originalToolName: metadata.originalToolName || metadata.toolName,
            },
            data: {
                cachedStats: {},
                handles: {
                    points: [startPoint, endPoint],
                    textBox: textBox ? { ...textBox } : undefined,
                },
                contour: {
                    polyline: [],
                    closed: true,
                },
                spline: targetAnnotation.data.spline,
                segmentation: {
                    ...segmentation,
                },
            },
            annotationUID: csUtils.uuidv4(),
            highlighted: true,
            invalidated: true,
            isLocked: false,
            isVisible: undefined,
            interpolationUID: targetAnnotation.interpolationUID,
            interpolationCompleted: targetAnnotation.interpolationCompleted,
        };
        updateContourPolyline(newAnnotation, {
            points: polyline,
            closed: true,
            targetWindingDirection: ContourWindingDirection.Clockwise,
        }, viewport);
        addAnnotation(newAnnotation, element);
        addContourSegmentationAnnotation(newAnnotation);
        triggerAnnotationModified(newAnnotation, viewport.element);
        reassignedContourHolesMap
            .get(polyline)
            ?.forEach((holeData) => addChildAnnotation(newAnnotation, holeData.annotation));
    }
    updateViewports(enabledElement, targetAnnotation, sourceAnnotation);
}
function updateViewports(enabledElement, targetAnnotation, sourceAnnotation) {
    const { viewport } = enabledElement;
    const { element } = viewport;
    const updatedTtoolNames = new Set([
        DEFAULT_CONTOUR_SEG_TOOL_NAME,
        targetAnnotation.metadata.toolName,
        sourceAnnotation.metadata.toolName,
    ]);
    for (const toolName of updatedTtoolNames.values()) {
        const viewportIdsToRender = getViewportIdsWithToolToRender(element, toolName);
        triggerAnnotationRenderForViewportIds(viewportIdsToRender);
    }
    return new Promise((resolve) => window.requestAnimationFrame(resolve));
}
