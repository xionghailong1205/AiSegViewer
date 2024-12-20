import { Events } from '../../enums';
import { getEnabledElement, utilities as csUtils, StackViewport, } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import throttle from '../../utilities/throttle';
import { addAnnotation, getAnnotations, removeAnnotation, } from '../../stateManagement/annotation/annotationState';
import { triggerAnnotationCompleted, triggerAnnotationModified, } from '../../stateManagement/annotation/helpers/state';
import { drawHandle as drawHandleSvg, drawLine as drawLineSvg, drawLinkedTextBox as drawLinkedTextBoxSvg, } from '../../drawingSvg';
import { state } from '../../store/state';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import { distanceToPoint } from '../../utilities/math/point';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { resetElementCursor, hideElementCursor, } from '../../cursors/elementCursor';
import { getCalibratedProbeUnitsAndValue } from '../../utilities/getCalibratedUnits';
const { transformWorldToIndex } = csUtils;
class UltrasoundDirectionalTool extends AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            shadow: true,
            preventHandleOutsideImage: false,
            getTextLines: defaultGetTextLines,
            displayBothAxesDistances: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.addNewAnnotation = (evt) => {
            if (this.startedDrawing) {
                return;
            }
            this.startedDrawing = true;
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = getEnabledElement(element);
            const { viewport, renderingEngine } = enabledElement;
            if (!(viewport instanceof StackViewport)) {
                throw new Error('UltrasoundDirectionalTool can only be used on a StackViewport');
            }
            hideElementCursor(element);
            this.isDrawing = true;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const referencedImageId = this.getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp);
            const FrameOfReferenceUID = viewport.getFrameOfReferenceUID();
            const annotation = {
                highlighted: true,
                invalidated: true,
                metadata: {
                    toolName: this.getToolName(),
                    viewPlaneNormal: [...viewPlaneNormal],
                    viewUp: [...viewUp],
                    FrameOfReferenceUID,
                    referencedImageId,
                },
                data: {
                    handles: {
                        points: [[...worldPos], [...worldPos]],
                        activeHandleIndex: null,
                        textBox: {
                            hasMoved: false,
                            worldPosition: [0, 0, 0],
                            worldBoundingBox: {
                                topLeft: [0, 0, 0],
                                topRight: [0, 0, 0],
                                bottomLeft: [0, 0, 0],
                                bottomRight: [0, 0, 0],
                            },
                        },
                    },
                    label: '',
                    cachedStats: {},
                },
            };
            addAnnotation(annotation, element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                handleIndex: 1,
                movingTextBox: false,
                newAnnotation: true,
                hasMoved: false,
            };
            this._activateDraw(element);
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            return annotation;
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            return false;
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation, hasMoved } = this.editData;
            const { data } = annotation;
            if (newAnnotation && !hasMoved) {
                return;
            }
            if (this.startedDrawing && data.handles.points.length === 1) {
                this.editData.handleIndex = 1;
                return;
            }
            this.startedDrawing = false;
            data.handles.activeHandleIndex = null;
            this._deactivateModify(element);
            this._deactivateDraw(element);
            resetElementCursor(element);
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            if (this.isHandleOutsideImage &&
                this.configuration.preventHandleOutsideImage) {
                removeAnnotation(annotation.annotationUID);
            }
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            if (newAnnotation) {
                triggerAnnotationCompleted(annotation);
            }
            this.editData = null;
            this.isDrawing = false;
        };
        this._dragCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, handleIndex, movingTextBox } = this.editData;
            const { data } = annotation;
            if (movingTextBox) {
                const { deltaPoints } = eventDetail;
                const worldPosDelta = deltaPoints.world;
                const { textBox } = data.handles;
                const { worldPosition } = textBox;
                worldPosition[0] += worldPosDelta[0];
                worldPosition[1] += worldPosDelta[1];
                worldPosition[2] += worldPosDelta[2];
                textBox.hasMoved = true;
            }
            else if (handleIndex === undefined) {
                const { deltaPoints } = eventDetail;
                const worldPosDelta = deltaPoints.world;
                const points = data.handles.points;
                points.forEach((point) => {
                    point[0] += worldPosDelta[0];
                    point[1] += worldPosDelta[1];
                    point[2] += worldPosDelta[2];
                });
                annotation.invalidated = true;
            }
            else {
                const { currentPoints } = eventDetail;
                const worldPos = currentPoints.world;
                data.handles.points[handleIndex] = [...worldPos];
                annotation.invalidated = true;
            }
            this.editData.hasMoved = true;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this.cancel = (element) => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this._deactivateDraw(element);
                this._deactivateModify(element);
                resetElementCursor(element);
                const { annotation, viewportIdsToRender, newAnnotation } = this.editData;
                const { data } = annotation;
                annotation.highlighted = false;
                data.handles.activeHandleIndex = null;
                triggerAnnotationRenderForViewportIds(viewportIdsToRender);
                if (newAnnotation) {
                    triggerAnnotationCompleted(annotation);
                }
                this.editData = null;
                this.startedDrawing = false;
                return annotation.annotationUID;
            }
        };
        this._activateModify = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragCallback);
        };
        this._deactivateModify = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback);
        };
        this._activateDraw = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(Events.MOUSE_MOVE, this._dragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragCallback);
        };
        this._deactivateDraw = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(Events.MOUSE_MOVE, this._dragCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport } = enabledElement;
            const { element } = viewport;
            let annotations = getAnnotations(this.getToolName(), element);
            if (!annotations?.length) {
                return renderStatus;
            }
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!annotations?.length) {
                return renderStatus;
            }
            const targetId = this.getTargetId(viewport);
            const renderingEngine = viewport.getRenderingEngine();
            const styleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
            };
            for (let i = 0; i < annotations.length; i++) {
                const annotation = annotations[i];
                const { annotationUID, data } = annotation;
                const { points } = data.handles;
                styleSpecifier.annotationUID = annotationUID;
                const color = this.getStyle('color', styleSpecifier, annotation);
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                if (!data.cachedStats[targetId] ||
                    data.cachedStats[targetId].xValues == null) {
                    data.cachedStats[targetId] = {
                        xValues: [0, 0],
                        yValues: [0, 0],
                        isHorizontal: false,
                        units: [''],
                        isUnitless: false,
                    };
                    this._calculateCachedStats(annotation, renderingEngine, enabledElement);
                }
                else if (annotation.invalidated) {
                    this._throttledCalculateCachedStats(annotation, renderingEngine, enabledElement);
                }
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return renderStatus;
                }
                let handleGroupUID = '0';
                drawHandleSvg(svgDrawingHelper, annotationUID, handleGroupUID, canvasCoordinates[0], {
                    color,
                }, 0);
                renderStatus = true;
                if (canvasCoordinates.length !== 2) {
                    return renderStatus;
                }
                handleGroupUID = '1';
                drawHandleSvg(svgDrawingHelper, annotationUID, handleGroupUID, canvasCoordinates[1], {
                    color,
                }, 1);
                const isUnitless = data.cachedStats[targetId].isUnitless;
                if (!isUnitless) {
                    const canvasPoint1 = canvasCoordinates[0];
                    const canvasPoint2 = canvasCoordinates[1];
                    const canvasDeltaY = canvasPoint2[1] - canvasPoint1[1];
                    const canvasDeltaX = canvasPoint2[0] - canvasPoint1[0];
                    const isHorizontal = data.cachedStats[targetId].isHorizontal;
                    let projectedPointCanvas = [0, 0];
                    if (isHorizontal) {
                        projectedPointCanvas = [
                            canvasPoint1[0] + canvasDeltaX,
                            canvasPoint1[1],
                        ];
                    }
                    else {
                        projectedPointCanvas = [
                            canvasPoint1[0],
                            canvasPoint1[1] + canvasDeltaY,
                        ];
                    }
                    let dataId = `${annotationUID}-line-1`;
                    let lineUID = '1';
                    drawLineSvg(svgDrawingHelper, annotationUID, lineUID, canvasCoordinates[0], projectedPointCanvas, {
                        color,
                        width: 1,
                        shadow: this.configuration.shadow,
                    }, dataId);
                    dataId = `${annotationUID}-line-2`;
                    lineUID = '2';
                    drawLineSvg(svgDrawingHelper, annotationUID, lineUID, canvasCoordinates[1], projectedPointCanvas, {
                        color,
                        width: 1,
                        lineDash: [1, 1],
                        shadow: this.configuration.shadow,
                    }, dataId);
                }
                else {
                    const dataId = `${annotationUID}-line-1`;
                    const lineUID = '1';
                    drawLineSvg(svgDrawingHelper, annotationUID, lineUID, canvasCoordinates[0], canvasCoordinates[1], {
                        color,
                        width: 1,
                        shadow: this.configuration.shadow,
                    }, dataId);
                }
                const options = this.getLinkedTextBoxStyle(styleSpecifier, annotation);
                if (!options.visibility) {
                    data.handles.textBox = {
                        hasMoved: false,
                        worldPosition: [0, 0, 0],
                        worldBoundingBox: {
                            topLeft: [0, 0, 0],
                            topRight: [0, 0, 0],
                            bottomLeft: [0, 0, 0],
                            bottomRight: [0, 0, 0],
                        },
                    };
                    continue;
                }
                const textLines = this.configuration.getTextLines(data, targetId, this.configuration);
                if (!data.handles.textBox.hasMoved) {
                    const canvasTextBoxCoords = canvasCoordinates[1];
                    data.handles.textBox.worldPosition =
                        viewport.canvasToWorld(canvasTextBoxCoords);
                }
                const textBoxPosition = viewport.worldToCanvas(data.handles.textBox.worldPosition);
                const textBoxUID = '1';
                const boundingBox = drawLinkedTextBoxSvg(svgDrawingHelper, annotationUID, textBoxUID, textLines, textBoxPosition, canvasCoordinates, {}, options);
                const { x: left, y: top, width, height } = boundingBox;
                data.handles.textBox.worldBoundingBox = {
                    topLeft: viewport.canvasToWorld([left, top]),
                    topRight: viewport.canvasToWorld([left + width, top]),
                    bottomLeft: viewport.canvasToWorld([left, top + height]),
                    bottomRight: viewport.canvasToWorld([left + width, top + height]),
                };
            }
            return renderStatus;
        };
        this._throttledCalculateCachedStats = throttle(this._calculateCachedStats, 100, { trailing: true });
    }
    toolSelectedCallback(evt, annotation, interactionType, canvasCoords) {
        return;
    }
    handleSelectedCallback(evt, annotation, handle) {
        const eventDetail = evt.detail;
        const { element } = eventDetail;
        const { data } = annotation;
        annotation.highlighted = true;
        const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
        let movingTextBox = false;
        let handleIndex;
        if (handle.worldPosition) {
            movingTextBox = true;
        }
        else {
            handleIndex = data.handles.points.findIndex((p) => p === handle);
        }
        this.editData = {
            handleIndex,
            annotation,
            viewportIdsToRender,
        };
        this._activateModify(element);
        hideElementCursor(element);
        const enabledElement = getEnabledElement(element);
        const { renderingEngine } = enabledElement;
        triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        evt.preventDefault();
    }
    _calculateCachedStats(annotation, renderingEngine, enabledElement) {
        const data = annotation.data;
        const { element } = enabledElement.viewport;
        if (data.handles.points.length !== 2) {
            return;
        }
        const { cachedStats } = data;
        const targetIds = Object.keys(cachedStats);
        for (let i = 0; i < targetIds.length; i++) {
            const targetId = targetIds[i];
            const image = this.getTargetImageData(targetId);
            if (!image) {
                continue;
            }
            const { imageData } = image;
            const worldPos1 = data.handles.points[0];
            const worldPos2 = data.handles.points[1];
            const imageIndex1 = transformWorldToIndex(imageData, worldPos1);
            const imageIndex2 = transformWorldToIndex(imageData, worldPos2);
            const { values: values1, units: units1 } = getCalibratedProbeUnitsAndValue(image, [imageIndex1]);
            const { values: values2, units: units2 } = getCalibratedProbeUnitsAndValue(image, [imageIndex2]);
            let xValues, yValues, units, isHorizontal;
            let isUnitless = false;
            if (units1[0] !== units2[0] ||
                units1[1] !== units2[1] ||
                (units1[0] === 'raw' && units2[0] === 'raw')) {
                const value = distanceToPoint(worldPos1, worldPos2);
                xValues = [value, 0];
                yValues = [value, 0];
                units = ['px'];
                isUnitless = true;
            }
            else {
                const canvasPoint1 = enabledElement.viewport.worldToCanvas(worldPos1);
                const canvasPoint2 = enabledElement.viewport.worldToCanvas(worldPos2);
                const canvasDeltaY = canvasPoint2[1] - canvasPoint1[1];
                const canvasDeltaX = canvasPoint2[0] - canvasPoint1[0];
                isHorizontal = Math.abs(canvasDeltaX) > Math.abs(canvasDeltaY);
                xValues = [values1[0], values2[0]];
                yValues = [values1[1], values2[1]];
                units = [units1[0], units1[1]];
            }
            cachedStats[targetId] = {
                xValues,
                yValues,
                isHorizontal,
                units,
                isUnitless,
            };
        }
        annotation.invalidated = false;
        triggerAnnotationModified(annotation, element);
        return cachedStats;
    }
}
function defaultGetTextLines(data, targetId, configuration) {
    const cachedStats = data.cachedStats[targetId];
    const { xValues, yValues, units, isUnitless, isHorizontal } = cachedStats;
    if (isUnitless) {
        return [`${csUtils.roundNumber(xValues[0])} px`];
    }
    if (configuration.displayBothAxesDistances) {
        const dist1 = Math.abs(xValues[1] - xValues[0]);
        const dist2 = Math.abs(yValues[1] - yValues[0]);
        return [
            `${csUtils.roundNumber(dist1)} ${units[0]}`,
            `${csUtils.roundNumber(dist2)} ${units[1]}`,
        ];
    }
    if (isHorizontal) {
        const dist = Math.abs(xValues[1] - xValues[0]);
        return [`${csUtils.roundNumber(dist)} ${units[0]}`];
    }
    else {
        const dist = Math.abs(yValues[1] - yValues[0]);
        return [`${csUtils.roundNumber(dist)} ${units[1]}`];
    }
}
UltrasoundDirectionalTool.toolName = 'UltrasoundDirectionalTool';
export default UltrasoundDirectionalTool;
