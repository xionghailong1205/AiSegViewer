import { getEnabledElement } from '@cornerstonejs/core';
import { BaseTool } from './base';
import { getAnnotations } from '../stateManagement';
import { point } from '../utilities/math';
import { Events, ToolModes, AnnotationStyleStates } from '../enums';
import { triggerAnnotationRenderForViewportIds } from '../utilities/triggerAnnotationRenderForViewportIds';
import { hideElementCursor, resetElementCursor, } from '../cursors/elementCursor';
import { getStyleProperty } from '../stateManagement/annotation/config/helpers';
import { triggerAnnotationModified } from '../stateManagement/annotation/helpers/state';
import CircleSculptCursor from './SculptorTool/CircleSculptCursor';
import { distancePointToContour } from './distancePointToContour';
import { getToolGroupForViewport } from '../store/ToolGroupManager';
class SculptorTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            minSpacing: 1,
            referencedToolNames: [
                'PlanarFreehandROI',
                'PlanarFreehandContourSegmentationTool',
            ],
            toolShape: 'circle',
            referencedToolName: 'PlanarFreehandROI',
        },
    }) {
        super(toolProps, defaultToolProps);
        this.registeredShapes = new Map();
        this.isActive = false;
        this.commonData = {
            activeAnnotationUID: null,
            viewportIdsToRender: [],
            isEditingOpenContour: false,
            canvasLocation: undefined,
        };
        this.preMouseDownCallback = (evt) => {
            const eventData = evt.detail;
            const element = eventData.element;
            this.configureToolSize(evt);
            this.selectFreehandTool(eventData);
            if (this.commonData.activeAnnotationUID === null) {
                return;
            }
            this.isActive = true;
            hideElementCursor(element);
            this.activateModify(element);
            return true;
        };
        this.mouseMoveCallback = (evt) => {
            if (this.mode === ToolModes.Active) {
                this.configureToolSize(evt);
                this.updateCursor(evt);
            }
            else {
                this.commonData.canvasLocation = undefined;
            }
        };
        this.endCallback = (evt) => {
            const eventData = evt.detail;
            const { element } = eventData;
            const config = this.configuration;
            const enabledElement = getEnabledElement(element);
            this.isActive = false;
            this.deactivateModify(element);
            resetElementCursor(element);
            const { renderingEngineId, viewportId } = enabledElement;
            const toolGroup = getToolGroupForViewport(viewportId, renderingEngineId);
            const toolInstance = toolGroup.getToolInstance(config.referencedToolName);
            const annotations = this.filterSculptableAnnotationsForElement(element);
            const activeAnnotation = annotations.find((annotation) => annotation.annotationUID === this.commonData.activeAnnotationUID);
            if (toolInstance.configuration.calculateStats) {
                activeAnnotation.invalidated = true;
            }
            triggerAnnotationModified(activeAnnotation, element);
        };
        this.dragCallback = (evt) => {
            const eventData = evt.detail;
            const element = eventData.element;
            this.updateCursor(evt);
            const annotations = this.filterSculptableAnnotationsForElement(element);
            const activeAnnotation = annotations.find((annotation) => annotation.annotationUID === this.commonData.activeAnnotationUID);
            if (!annotations?.length || !this.isActive) {
                return;
            }
            const points = activeAnnotation.data.contour.polyline;
            this.sculpt(eventData, points);
        };
        this.registerShapes(CircleSculptCursor.shapeName, CircleSculptCursor);
        this.setToolShape(this.configuration.toolShape);
    }
    registerShapes(shapeName, shapeClass) {
        const shape = new shapeClass();
        this.registeredShapes.set(shapeName, shape);
    }
    sculpt(eventData, points) {
        const config = this.configuration;
        const element = eventData.element;
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const cursorShape = this.registeredShapes.get(this.selectedShape);
        this.sculptData = {
            mousePoint: eventData.currentPoints.world,
            mouseCanvasPoint: eventData.currentPoints.canvas,
            points,
            maxSpacing: cursorShape.getMaxSpacing(config.minSpacing),
            element: element,
        };
        const pushedHandles = cursorShape.pushHandles(viewport, this.sculptData);
        if (pushedHandles.first !== undefined) {
            this.insertNewHandles(pushedHandles);
        }
    }
    interpolatePointsWithinMaxSpacing(i, points, indicesToInsertAfter, maxSpacing) {
        const { element } = this.sculptData;
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const nextHandleIndex = contourIndex(i + 1, points.length);
        const currentCanvasPoint = viewport.worldToCanvas(points[i]);
        const nextCanvasPoint = viewport.worldToCanvas(points[nextHandleIndex]);
        const distanceToNextHandle = point.distanceToPoint(currentCanvasPoint, nextCanvasPoint);
        if (distanceToNextHandle > maxSpacing) {
            indicesToInsertAfter.push(i);
        }
    }
    updateCursor(evt) {
        const eventData = evt.detail;
        const element = eventData.element;
        const enabledElement = getEnabledElement(element);
        const { renderingEngine, viewport } = enabledElement;
        this.commonData.viewportIdsToRender = [viewport.id];
        const annotations = this.filterSculptableAnnotationsForElement(element);
        if (!annotations?.length) {
            return;
        }
        const activeAnnotation = annotations.find((annotation) => annotation.annotationUID === this.commonData.activeAnnotationUID);
        this.commonData.canvasLocation = eventData.currentPoints.canvas;
        if (this.isActive) {
            activeAnnotation.highlighted = true;
        }
        else {
            const cursorShape = this.registeredShapes.get(this.selectedShape);
            const canvasCoords = eventData.currentPoints.canvas;
            cursorShape.updateToolSize(canvasCoords, viewport, activeAnnotation);
        }
        triggerAnnotationRenderForViewportIds(this.commonData.viewportIdsToRender);
    }
    filterSculptableAnnotationsForElement(element) {
        const config = this.configuration;
        const enabledElement = getEnabledElement(element);
        const { renderingEngineId, viewportId } = enabledElement;
        const sculptableAnnotations = [];
        const toolGroup = getToolGroupForViewport(viewportId, renderingEngineId);
        const toolInstance = toolGroup.getToolInstance(config.referencedToolName);
        config.referencedToolNames.forEach((referencedToolName) => {
            const annotations = getAnnotations(referencedToolName, element);
            if (annotations) {
                sculptableAnnotations.push(...annotations);
            }
        });
        return toolInstance.filterInteractableAnnotationsForElement(element, sculptableAnnotations);
    }
    configureToolSize(evt) {
        const cursorShape = this.registeredShapes.get(this.selectedShape);
        cursorShape.configureToolSize(evt);
    }
    insertNewHandles(pushedHandles) {
        const indicesToInsertAfter = this.findNewHandleIndices(pushedHandles);
        let newIndexModifier = 0;
        for (let i = 0; i < indicesToInsertAfter?.length; i++) {
            const insertIndex = indicesToInsertAfter[i] + 1 + newIndexModifier;
            this.insertHandleRadially(insertIndex);
            newIndexModifier++;
        }
    }
    findNewHandleIndices(pushedHandles) {
        const { points, maxSpacing } = this.sculptData;
        const indicesToInsertAfter = [];
        for (let i = pushedHandles.first; i <= pushedHandles.last; i++) {
            this.interpolatePointsWithinMaxSpacing(i, points, indicesToInsertAfter, maxSpacing);
        }
        return indicesToInsertAfter;
    }
    insertHandleRadially(insertIndex) {
        const { points } = this.sculptData;
        if (insertIndex > points.length - 1 &&
            this.commonData.isEditingOpenContour) {
            return;
        }
        const cursorShape = this.registeredShapes.get(this.selectedShape);
        const previousIndex = insertIndex - 1;
        const nextIndex = contourIndex(insertIndex, points.length);
        const insertPosition = cursorShape.getInsertPosition(previousIndex, nextIndex, this.sculptData);
        const handleData = insertPosition;
        points.splice(insertIndex, 0, handleData);
    }
    selectFreehandTool(eventData) {
        const closestAnnotationUID = this.getClosestFreehandToolOnElement(eventData);
        if (closestAnnotationUID === undefined) {
            return;
        }
        this.commonData.activeAnnotationUID = closestAnnotationUID;
    }
    getClosestFreehandToolOnElement(eventData) {
        const { element } = eventData;
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const config = this.configuration;
        const annotations = this.filterSculptableAnnotationsForElement(element);
        if (!annotations?.length) {
            return;
        }
        const canvasPoints = eventData.currentPoints.canvas;
        const closest = {
            distance: Infinity,
            toolIndex: undefined,
            annotationUID: undefined,
        };
        for (let i = 0; i < annotations?.length; i++) {
            if (annotations[i].isLocked || !annotations[i].isVisible) {
                continue;
            }
            const distanceFromTool = distancePointToContour(viewport, annotations[i], canvasPoints);
            if (distanceFromTool === -1) {
                continue;
            }
            if (distanceFromTool < closest.distance) {
                closest.distance = distanceFromTool;
                closest.toolIndex = i;
                closest.annotationUID = annotations[i].annotationUID;
            }
        }
        this.commonData.isEditingOpenContour =
            !annotations[closest.toolIndex].data.contour.closed;
        config.referencedToolName =
            annotations[closest.toolIndex].metadata.toolName;
        return closest.annotationUID;
    }
    activateModify(element) {
        element.addEventListener(Events.MOUSE_UP, this.endCallback);
        element.addEventListener(Events.MOUSE_CLICK, this.endCallback);
        element.addEventListener(Events.MOUSE_DRAG, this.dragCallback);
        element.addEventListener(Events.TOUCH_TAP, this.endCallback);
        element.addEventListener(Events.TOUCH_END, this.endCallback);
        element.addEventListener(Events.TOUCH_DRAG, this.dragCallback);
    }
    deactivateModify(element) {
        element.removeEventListener(Events.MOUSE_UP, this.endCallback);
        element.removeEventListener(Events.MOUSE_CLICK, this.endCallback);
        element.removeEventListener(Events.MOUSE_DRAG, this.dragCallback);
        element.removeEventListener(Events.TOUCH_TAP, this.endCallback);
        element.removeEventListener(Events.TOUCH_END, this.endCallback);
        element.removeEventListener(Events.TOUCH_DRAG, this.dragCallback);
    }
    setToolShape(toolShape) {
        this.selectedShape =
            this.registeredShapes.get(toolShape) ?? CircleSculptCursor.shapeName;
    }
    renderAnnotation(enabledElement, svgDrawingHelper) {
        const { viewport } = enabledElement;
        const { element } = viewport;
        const viewportIdsToRender = this.commonData.viewportIdsToRender;
        if (!this.commonData.canvasLocation ||
            this.mode !== ToolModes.Active ||
            !viewportIdsToRender.includes(viewport.id)) {
            return;
        }
        const annotations = this.filterSculptableAnnotationsForElement(element);
        if (!annotations?.length) {
            return;
        }
        const styleSpecifier = {
            toolGroupId: this.toolGroupId,
            toolName: this.getToolName(),
            viewportId: enabledElement.viewport.id,
        };
        let color = getStyleProperty('color', styleSpecifier, AnnotationStyleStates.Default, this.mode);
        if (this.isActive) {
            color = getStyleProperty('color', styleSpecifier, AnnotationStyleStates.Highlighted, this.mode);
        }
        const cursorShape = this.registeredShapes.get(this.selectedShape);
        cursorShape.renderShape(svgDrawingHelper, this.commonData.canvasLocation, {
            color,
        });
    }
}
export const contourIndex = (i, length) => {
    return (i + length) % length;
};
SculptorTool.toolName = 'SculptorTool';
export default SculptorTool;
