import { vec3, vec2 } from 'gl-matrix';
import { getEnabledElement } from '@cornerstonejs/core';
import { state } from '../../../store/state';
import { Events } from '../../../enums';
import { resetElementCursor, hideElementCursor, } from '../../../cursors/elementCursor';
import { polyline } from '../../../utilities/math';
import { ContourWindingDirection } from '../../../types/ContourAnnotation';
import { getInterpolatedPoints, shouldSmooth, } from '../../../utilities/planarFreehandROITool/smoothPoints';
import triggerAnnotationRenderForViewportIds from '../../../utilities/triggerAnnotationRenderForViewportIds';
import updateContourPolyline from '../../../utilities/contours/updateContourPolyline';
import { triggerAnnotationModified } from '../../../stateManagement/annotation/helpers/state';
const { getSubPixelSpacingAndXYDirections, addCanvasPointsToArray, getArea } = polyline;
function activateClosedContourEdit(evt, annotation, viewportIdsToRender) {
    this.isEditingClosed = true;
    const eventDetail = evt.detail;
    const { currentPoints, element } = eventDetail;
    const canvasPos = currentPoints.canvas;
    const enabledElement = getEnabledElement(element);
    if (!enabledElement) {
        return;
    }
    const { viewport } = enabledElement;
    const prevCanvasPoints = annotation.data.contour.polyline.map(viewport.worldToCanvas);
    const { spacing, xDir, yDir } = getSubPixelSpacingAndXYDirections(viewport, this.configuration.subPixelResolution);
    this.editData = {
        prevCanvasPoints,
        editCanvasPoints: [canvasPos],
        startCrossingIndex: undefined,
        editIndex: 0,
    };
    this.commonData = {
        annotation,
        viewportIdsToRender,
        spacing,
        xDir,
        yDir,
        movingTextBox: false,
    };
    state.isInteractingWithTool = true;
    element.addEventListener(Events.MOUSE_UP, this.mouseUpClosedContourEditCallback);
    element.addEventListener(Events.MOUSE_DRAG, this.mouseDragClosedContourEditCallback);
    element.addEventListener(Events.MOUSE_CLICK, this.mouseUpClosedContourEditCallback);
    element.addEventListener(Events.TOUCH_END, this.mouseUpClosedContourEditCallback);
    element.addEventListener(Events.TOUCH_DRAG, this.mouseDragClosedContourEditCallback);
    element.addEventListener(Events.TOUCH_TAP, this.mouseUpClosedContourEditCallback);
    hideElementCursor(element);
}
function deactivateClosedContourEdit(element) {
    state.isInteractingWithTool = false;
    element.removeEventListener(Events.MOUSE_UP, this.mouseUpClosedContourEditCallback);
    element.removeEventListener(Events.MOUSE_DRAG, this.mouseDragClosedContourEditCallback);
    element.removeEventListener(Events.MOUSE_CLICK, this.mouseUpClosedContourEditCallback);
    element.removeEventListener(Events.TOUCH_END, this.mouseUpClosedContourEditCallback);
    element.removeEventListener(Events.TOUCH_DRAG, this.mouseDragClosedContourEditCallback);
    element.removeEventListener(Events.TOUCH_TAP, this.mouseUpClosedContourEditCallback);
    resetElementCursor(element);
}
function mouseDragClosedContourEditCallback(evt) {
    const eventDetail = evt.detail;
    const { currentPoints, element } = eventDetail;
    const worldPos = currentPoints.world;
    const canvasPos = currentPoints.canvas;
    const enabledElement = getEnabledElement(element);
    const { renderingEngine, viewport } = enabledElement;
    const { viewportIdsToRender, xDir, yDir, spacing } = this.commonData;
    const { editIndex, editCanvasPoints, startCrossingIndex } = this.editData;
    const lastCanvasPoint = editCanvasPoints[editCanvasPoints.length - 1];
    const lastWorldPoint = viewport.canvasToWorld(lastCanvasPoint);
    const worldPosDiff = vec3.create();
    vec3.subtract(worldPosDiff, worldPos, lastWorldPoint);
    const xDist = Math.abs(vec3.dot(worldPosDiff, xDir));
    const yDist = Math.abs(vec3.dot(worldPosDiff, yDir));
    if (xDist <= spacing[0] && yDist <= spacing[1]) {
        return;
    }
    if (startCrossingIndex !== undefined) {
        this.checkAndRemoveCrossesOnEditLine(evt);
    }
    const numPointsAdded = addCanvasPointsToArray(element, editCanvasPoints, canvasPos, this.commonData);
    const currentEditIndex = editIndex + numPointsAdded;
    this.editData.editIndex = currentEditIndex;
    if (startCrossingIndex === undefined && editCanvasPoints.length > 1) {
        this.checkForFirstCrossing(evt, true);
    }
    this.editData.snapIndex = this.findSnapIndex();
    if (this.editData.snapIndex === -1) {
        this.finishEditAndStartNewEdit(evt);
        return;
    }
    this.editData.fusedCanvasPoints = this.fuseEditPointsWithClosedContour(evt);
    if (startCrossingIndex !== undefined &&
        this.checkForSecondCrossing(evt, true)) {
        this.removePointsAfterSecondCrossing(true);
        this.finishEditAndStartNewEdit(evt);
    }
    triggerAnnotationRenderForViewportIds(viewportIdsToRender);
}
function finishEditAndStartNewEdit(evt) {
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const enabledElement = getEnabledElement(element);
    const { viewport, renderingEngine } = enabledElement;
    const { annotation, viewportIdsToRender } = this.commonData;
    const { fusedCanvasPoints, editCanvasPoints } = this.editData;
    updateContourPolyline(annotation, {
        points: fusedCanvasPoints,
        closed: true,
        targetWindingDirection: ContourWindingDirection.Clockwise,
    }, viewport);
    if (annotation.autoGenerated) {
        annotation.autoGenerated = false;
    }
    triggerAnnotationModified(annotation, element);
    const lastEditCanvasPoint = editCanvasPoints.pop();
    this.editData = {
        prevCanvasPoints: fusedCanvasPoints,
        editCanvasPoints: [lastEditCanvasPoint],
        startCrossingIndex: undefined,
        editIndex: 0,
        snapIndex: undefined,
    };
    triggerAnnotationRenderForViewportIds(viewportIdsToRender);
}
function fuseEditPointsWithClosedContour(evt) {
    const { prevCanvasPoints, editCanvasPoints, startCrossingIndex, snapIndex } = this.editData;
    if (startCrossingIndex === undefined || snapIndex === undefined) {
        return;
    }
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const augmentedEditCanvasPoints = [...editCanvasPoints];
    addCanvasPointsToArray(element, augmentedEditCanvasPoints, prevCanvasPoints[snapIndex], this.commonData);
    if (augmentedEditCanvasPoints.length > editCanvasPoints.length) {
        augmentedEditCanvasPoints.pop();
    }
    let lowIndex;
    let highIndex;
    if (startCrossingIndex > snapIndex) {
        lowIndex = snapIndex;
        highIndex = startCrossingIndex;
    }
    else {
        lowIndex = startCrossingIndex;
        highIndex = snapIndex;
    }
    const distanceBetweenLowAndFirstPoint = vec2.distance(prevCanvasPoints[lowIndex], augmentedEditCanvasPoints[0]);
    const distanceBetweenLowAndLastPoint = vec2.distance(prevCanvasPoints[lowIndex], augmentedEditCanvasPoints[augmentedEditCanvasPoints.length - 1]);
    const distanceBetweenHighAndFirstPoint = vec2.distance(prevCanvasPoints[highIndex], augmentedEditCanvasPoints[0]);
    const distanceBetweenHighAndLastPoint = vec2.distance(prevCanvasPoints[highIndex], augmentedEditCanvasPoints[augmentedEditCanvasPoints.length - 1]);
    const pointSet1 = [];
    for (let i = 0; i < lowIndex; i++) {
        const canvasPoint = prevCanvasPoints[i];
        pointSet1.push([canvasPoint[0], canvasPoint[1]]);
    }
    let inPlaceDistance = distanceBetweenLowAndFirstPoint + distanceBetweenHighAndLastPoint;
    let reverseDistance = distanceBetweenLowAndLastPoint + distanceBetweenHighAndFirstPoint;
    if (inPlaceDistance < reverseDistance) {
        for (let i = 0; i < augmentedEditCanvasPoints.length; i++) {
            const canvasPoint = augmentedEditCanvasPoints[i];
            pointSet1.push([canvasPoint[0], canvasPoint[1]]);
        }
    }
    else {
        for (let i = augmentedEditCanvasPoints.length - 1; i >= 0; i--) {
            const canvasPoint = augmentedEditCanvasPoints[i];
            pointSet1.push([canvasPoint[0], canvasPoint[1]]);
        }
    }
    for (let i = highIndex; i < prevCanvasPoints.length; i++) {
        const canvasPoint = prevCanvasPoints[i];
        pointSet1.push([canvasPoint[0], canvasPoint[1]]);
    }
    const pointSet2 = [];
    for (let i = lowIndex; i < highIndex; i++) {
        const canvasPoint = prevCanvasPoints[i];
        pointSet2.push([canvasPoint[0], canvasPoint[1]]);
    }
    inPlaceDistance =
        distanceBetweenHighAndFirstPoint + distanceBetweenLowAndLastPoint;
    reverseDistance =
        distanceBetweenHighAndLastPoint + distanceBetweenLowAndFirstPoint;
    if (inPlaceDistance < reverseDistance) {
        for (let i = 0; i < augmentedEditCanvasPoints.length; i++) {
            const canvasPoint = augmentedEditCanvasPoints[i];
            pointSet2.push([canvasPoint[0], canvasPoint[1]]);
        }
    }
    else {
        for (let i = augmentedEditCanvasPoints.length - 1; i >= 0; i--) {
            const canvasPoint = augmentedEditCanvasPoints[i];
            pointSet2.push([canvasPoint[0], canvasPoint[1]]);
        }
    }
    const areaPointSet1 = getArea(pointSet1);
    const areaPointSet2 = getArea(pointSet2);
    const pointsToRender = areaPointSet1 > areaPointSet2 ? pointSet1 : pointSet2;
    return pointsToRender;
}
function mouseUpClosedContourEditCallback(evt) {
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    this.completeClosedContourEdit(element);
}
function completeClosedContourEdit(element) {
    const enabledElement = getEnabledElement(element);
    const { viewport, renderingEngine } = enabledElement;
    const { annotation, viewportIdsToRender } = this.commonData;
    const { fusedCanvasPoints, prevCanvasPoints } = this.editData;
    if (fusedCanvasPoints) {
        const updatedPoints = shouldSmooth(this.configuration, annotation)
            ? getInterpolatedPoints(this.configuration, fusedCanvasPoints, prevCanvasPoints)
            : fusedCanvasPoints;
        const decimateConfig = this.configuration?.decimate || {};
        updateContourPolyline(annotation, {
            points: updatedPoints,
            closed: true,
            targetWindingDirection: ContourWindingDirection.Clockwise,
        }, viewport, {
            decimate: {
                enabled: !!decimateConfig.enabled,
                epsilon: decimateConfig.epsilon,
            },
        });
        if (annotation.autoGenerated) {
            annotation.autoGenerated = false;
        }
        triggerAnnotationModified(annotation, element);
    }
    this.isEditingClosed = false;
    this.editData = undefined;
    this.commonData = undefined;
    triggerAnnotationRenderForViewportIds(viewportIdsToRender);
    this.deactivateClosedContourEdit(element);
}
function cancelClosedContourEdit(element) {
    this.completeClosedContourEdit(element);
}
function registerClosedContourEditLoop(toolInstance) {
    toolInstance.activateClosedContourEdit =
        activateClosedContourEdit.bind(toolInstance);
    toolInstance.deactivateClosedContourEdit =
        deactivateClosedContourEdit.bind(toolInstance);
    toolInstance.mouseDragClosedContourEditCallback =
        mouseDragClosedContourEditCallback.bind(toolInstance);
    toolInstance.mouseUpClosedContourEditCallback =
        mouseUpClosedContourEditCallback.bind(toolInstance);
    toolInstance.finishEditAndStartNewEdit =
        finishEditAndStartNewEdit.bind(toolInstance);
    toolInstance.fuseEditPointsWithClosedContour =
        fuseEditPointsWithClosedContour.bind(toolInstance);
    toolInstance.cancelClosedContourEdit =
        cancelClosedContourEdit.bind(toolInstance);
    toolInstance.completeClosedContourEdit =
        completeClosedContourEdit.bind(toolInstance);
}
export default registerClosedContourEditLoop;
