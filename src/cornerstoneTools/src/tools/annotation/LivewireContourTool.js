import { vec3 } from 'gl-matrix';
import { getEnabledElement, utilities as csUtils, VolumeViewport, utilities, triggerEvent, eventTarget, } from '@cornerstonejs/core';
import { removeAnnotation } from '../../stateManagement/annotation/annotationState';
import { drawHandles as drawHandlesSvg, drawLinkedTextBox as drawLinkedTextBoxSvg, } from '../../drawingSvg';
import { state } from '../../store/state';
import { Events, KeyboardBindings, ChangeTypes } from '../../enums';
import { resetElementCursor } from '../../cursors/elementCursor';
import getMouseModifierKey from '../../eventDispatchers/shared/getMouseModifier';
import * as math from '../../utilities/math';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import findHandlePolylineIndex from '../../utilities/contours/findHandlePolylineIndex';
import { ContourWindingDirection } from '../../types/ContourAnnotation';
import { triggerAnnotationModified, triggerContourAnnotationCompleted, } from '../../stateManagement/annotation/helpers/state';
import { LivewireScissors } from '../../utilities/livewire/LivewireScissors';
import { LivewirePath } from '../../utilities/livewire/LiveWirePath';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import ContourSegmentationBaseTool from '../base/ContourSegmentationBaseTool';
import { getTextBoxCoordsCanvas } from '../../utilities/drawing';
import { getCalibratedLengthUnitsAndScale, throttle } from '../../utilities';
const CLICK_CLOSE_CURVE_SQR_DIST = 10 ** 2;
class LivewireContourTool extends ContourSegmentationBaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            getTextLines: defaultGetTextLines,
            calculateStats: true,
            preventHandleOutsideImage: false,
            contourHoleAdditionModifierKey: KeyboardBindings.Shift,
            snapHandleNearby: 2,
            interpolation: {
                enabled: false,
                nearestEdge: 2,
                showInterpolationPolyline: false,
            },
            decimate: {
                enabled: false,
                epsilon: 0.1,
            },
            actions: {
                undo: {
                    method: 'undo',
                    bindings: [
                        {
                            key: 'Escape',
                        },
                    ],
                },
            },
        },
    }) {
        super(toolProps, defaultToolProps);
        this.isHandleOutsideImage = false;
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            const proximitySquared = proximity * proximity;
            const canvasPoints = annotation.data.contour.polyline.map((p) => viewport.worldToCanvas(p));
            let startPoint = canvasPoints[canvasPoints.length - 1];
            for (let i = 0; i < canvasPoints.length; i++) {
                const endPoint = canvasPoints[i];
                const distanceToPointSquared = math.lineSegment.distanceToPointSquared(startPoint, endPoint, canvasCoords);
                if (distanceToPointSquared <= proximitySquared) {
                    return true;
                }
                startPoint = endPoint;
            }
            return false;
        };
        this.toolSelectedCallback = (evt, annotation) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            annotation.highlighted = true;
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                movingTextBox: false,
            };
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            this._activateModify(element);
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            evt.preventDefault();
        };
        this.handleSelectedCallback = (evt, annotation, handle) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { data } = annotation;
            annotation.highlighted = true;
            let movingTextBox = false;
            let handleIndex;
            if (handle.worldPosition) {
                movingTextBox = true;
            }
            else {
                const { points } = data.handles;
                handleIndex = points.findIndex((p) => p === handle);
            }
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                handleIndex,
                movingTextBox,
            };
            this._activateModify(element);
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            evt.preventDefault();
        };
        this._endCallback = (evt, clearAnnotation = false) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation, contourHoleProcessingEnabled, } = this.editData;
            const { data } = annotation;
            data.handles.activeHandleIndex = null;
            this._deactivateModify(element);
            this._deactivateDraw(element);
            resetElementCursor(element);
            const enabledElement = getEnabledElement(element);
            if ((this.isHandleOutsideImage &&
                this.configuration.preventHandleOutsideImage) ||
                clearAnnotation) {
                removeAnnotation(annotation.annotationUID);
                this.clearEditData();
                triggerAnnotationRenderForViewportIds(viewportIdsToRender);
                return;
            }
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            const changeType = newAnnotation
                ? ChangeTypes.Completed
                : ChangeTypes.HandlesUpdated;
            this.triggerChangeEvent(annotation, enabledElement, changeType, contourHoleProcessingEnabled);
            this.clearEditData();
        };
        this.triggerChangeEvent = (annotation, enabledElement, changeType = ChangeTypes.StatsUpdated, contourHoleProcessingEnabled = false) => {
            if (changeType === ChangeTypes.Completed) {
                triggerContourAnnotationCompleted(annotation, contourHoleProcessingEnabled);
            }
            else {
                triggerAnnotationModified(annotation, enabledElement.viewport.element, changeType);
            }
        };
        this._mouseDownCallback = (evt) => {
            const doubleClick = evt.type === Events.MOUSE_DOUBLE_CLICK;
            const { annotation, viewportIdsToRender, worldToSlice, sliceToWorld } = this.editData;
            if (this.editData.closed) {
                return;
            }
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { currentPoints } = eventDetail;
            const { canvas: canvasPos, world: worldPosOriginal } = currentPoints;
            let worldPos = worldPosOriginal;
            const enabledElement = getEnabledElement(element);
            const { viewport, renderingEngine } = enabledElement;
            const controlPoints = this.editData.currentPath.getControlPoints();
            let closePath = controlPoints.length >= 2 && doubleClick;
            if (controlPoints.length >= 2) {
                const closestHandlePoint = {
                    index: -1,
                    distSquared: Infinity,
                };
                for (let i = 0, len = controlPoints.length; i < len; i++) {
                    const controlPoint = controlPoints[i];
                    const worldControlPoint = sliceToWorld(controlPoint);
                    const canvasControlPoint = viewport.worldToCanvas(worldControlPoint);
                    const distSquared = math.point.distanceToPointSquared(canvasPos, canvasControlPoint);
                    if (distSquared <= CLICK_CLOSE_CURVE_SQR_DIST &&
                        distSquared < closestHandlePoint.distSquared) {
                        closestHandlePoint.distSquared = distSquared;
                        closestHandlePoint.index = i;
                    }
                }
                if (closestHandlePoint.index === 0) {
                    closePath = true;
                }
            }
            const { snapHandleNearby } = this.configuration;
            if (snapHandleNearby && !this.editData.closed) {
                const currentPath = new LivewirePath();
                const snapPoint = this.scissors.findMinNearby(worldToSlice(worldPosOriginal), 1);
                const pathPoints = this.scissors.findPathToPoint(snapPoint);
                currentPath.addPoints(pathPoints);
                currentPath.prependPath(this.editData.confirmedPath);
                worldPos = sliceToWorld(snapPoint);
                this.editData.currentPath = currentPath;
            }
            this.editData.closed = this.editData.closed || closePath;
            this.editData.confirmedPath = this.editData.currentPath;
            const lastPoint = this.editData.currentPath.getLastPoint();
            this.editData.confirmedPath.addControlPoint(lastPoint);
            annotation.data.handles.points.push(sliceToWorld(lastPoint));
            this.scissors.startSearch(worldToSlice(worldPos));
            annotation.invalidated = true;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            if (this.editData.closed) {
                this.updateAnnotation(this.editData.confirmedPath);
                this._endCallback(evt);
            }
            evt.preventDefault();
        };
        this._mouseMoveCallback = (evt) => {
            const { element, currentPoints } = evt.detail;
            const { world: worldPos, canvas: canvasPos } = currentPoints;
            const { renderingEngine } = getEnabledElement(element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData.lastCanvasPoint = canvasPos;
            const { width: imgWidth, height: imgHeight } = this.scissors;
            const { worldToSlice } = this.editData;
            const slicePoint = worldToSlice(worldPos);
            if (slicePoint[0] < 0 ||
                slicePoint[1] < 0 ||
                slicePoint[0] >= imgWidth ||
                slicePoint[1] >= imgHeight) {
                return;
            }
            const pathPoints = this.scissors.findPathToPoint(slicePoint);
            const currentPath = new LivewirePath();
            currentPath.addPoints(pathPoints);
            currentPath.prependPath(this.editData.confirmedPath);
            this.editData.currentPath = currentPath;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            evt.preventDefault();
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
                console.warn('Drag annotation not implemented');
            }
            else {
                const { currentPoints } = eventDetail;
                const worldPos = currentPoints.world;
                this.editHandle(worldPos, element, annotation, handleIndex);
            }
            this.editData.hasMoved = true;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this.cancel = (element) => {
            if (!this.isDrawing) {
                return;
            }
            this.isDrawing = false;
            this._deactivateDraw(element);
            this._deactivateModify(element);
            resetElementCursor(element);
            const { annotation, viewportIdsToRender, newAnnotation } = this.editData;
            if (newAnnotation) {
                removeAnnotation(annotation.annotationUID);
            }
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            this.editData = null;
            this.scissors = null;
            return annotation.annotationUID;
        };
        this._activateModify = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateModify = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._activateDraw = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_MOVE, this._mouseMoveCallback);
            element.addEventListener(Events.MOUSE_DOWN, this._mouseDownCallback);
            element.addEventListener(Events.MOUSE_DOUBLE_CLICK, this._mouseDownCallback);
            element.addEventListener(Events.TOUCH_TAP, this._mouseDownCallback);
        };
        this._deactivateDraw = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_MOVE, this._mouseMoveCallback);
            element.removeEventListener(Events.MOUSE_DOWN, this._mouseDownCallback);
            element.removeEventListener(Events.MOUSE_DOUBLE_CLICK, this._mouseDownCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._mouseDownCallback);
        };
        this._calculateCachedStats = (annotation, element) => {
            if (!this.configuration.calculateStats) {
                return;
            }
            const data = annotation.data;
            if (!data.contour.closed) {
                return;
            }
            const enabledElement = getEnabledElement(element);
            const { viewport, renderingEngine } = enabledElement;
            const { cachedStats } = data;
            const { polyline: points } = data.contour;
            const targetIds = Object.keys(cachedStats);
            for (let i = 0; i < targetIds.length; i++) {
                const targetId = targetIds[i];
                const image = this.getTargetImageData(targetId);
                if (!image) {
                    continue;
                }
                const { metadata } = image;
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                const canvasPoint = canvasCoordinates[0];
                const originalWorldPoint = viewport.canvasToWorld(canvasPoint);
                const deltaXPoint = viewport.canvasToWorld([
                    canvasPoint[0] + 1,
                    canvasPoint[1],
                ]);
                const deltaYPoint = viewport.canvasToWorld([
                    canvasPoint[0],
                    canvasPoint[1] + 1,
                ]);
                const deltaInX = vec3.distance(originalWorldPoint, deltaXPoint);
                const deltaInY = vec3.distance(originalWorldPoint, deltaYPoint);
                const { imageData } = image;
                const { scale, areaUnit } = getCalibratedLengthUnitsAndScale(image, () => {
                    const { maxX: canvasMaxX, maxY: canvasMaxY, minX: canvasMinX, minY: canvasMinY, } = math.polyline.getAABB(canvasCoordinates);
                    const topLeftBBWorld = viewport.canvasToWorld([
                        canvasMinX,
                        canvasMinY,
                    ]);
                    const topLeftBBIndex = utilities.transformWorldToIndex(imageData, topLeftBBWorld);
                    const bottomRightBBWorld = viewport.canvasToWorld([
                        canvasMaxX,
                        canvasMaxY,
                    ]);
                    const bottomRightBBIndex = utilities.transformWorldToIndex(imageData, bottomRightBBWorld);
                    return [topLeftBBIndex, bottomRightBBIndex];
                });
                let area = math.polyline.getArea(canvasCoordinates) / scale / scale;
                area *= deltaInX * deltaInY;
                cachedStats[targetId] = {
                    Modality: metadata.Modality,
                    area,
                    areaUnit: areaUnit,
                };
            }
            this.triggerAnnotationModified(annotation, enabledElement, ChangeTypes.StatsUpdated);
            return cachedStats;
        };
        this._renderStats = (annotation, viewport, svgDrawingHelper, textboxStyle) => {
            const data = annotation.data;
            const targetId = this.getTargetId(viewport);
            if (!data.contour.closed || !textboxStyle.visibility) {
                return;
            }
            const textLines = this.configuration.getTextLines(data, targetId);
            if (!textLines || textLines.length === 0) {
                return;
            }
            const canvasCoordinates = data.handles.points.map((p) => viewport.worldToCanvas(p));
            if (!data.handles.textBox.hasMoved) {
                const canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);
                data.handles.textBox.worldPosition =
                    viewport.canvasToWorld(canvasTextBoxCoords);
            }
            const textBoxPosition = viewport.worldToCanvas(data.handles.textBox.worldPosition);
            const textBoxUID = 'textBox';
            const boundingBox = drawLinkedTextBoxSvg(svgDrawingHelper, annotation.annotationUID ?? '', textBoxUID, textLines, textBoxPosition, canvasCoordinates, {}, textboxStyle);
            const { x: left, y: top, width, height } = boundingBox;
            data.handles.textBox.worldBoundingBox = {
                topLeft: viewport.canvasToWorld([left, top]),
                topRight: viewport.canvasToWorld([left + width, top]),
                bottomLeft: viewport.canvasToWorld([left, top + height]),
                bottomRight: viewport.canvasToWorld([left + width, top + height]),
            };
        };
        this.triggerAnnotationModified = (annotation, enabledElement, changeType = ChangeTypes.StatsUpdated) => {
            const { viewportId, renderingEngineId } = enabledElement;
            const eventType = Events.ANNOTATION_MODIFIED;
            const eventDetail = {
                annotation,
                viewportId,
                renderingEngineId,
                changeType,
            };
            triggerEvent(eventTarget, eventType, eventDetail);
        };
        this._throttledCalculateCachedStats = throttle(this._calculateCachedStats, 100, { trailing: true });
    }
    setupBaseEditData(worldPos, element, annotation, nextPos, contourHoleProcessingEnabled) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        this.isDrawing = true;
        const viewportImageData = viewport.getImageData();
        const { imageData: vtkImageData } = viewportImageData;
        let worldToSlice;
        let sliceToWorld;
        let width;
        let height;
        let scalarData;
        if (!(viewport instanceof VolumeViewport)) {
            width = viewportImageData.dimensions[0];
            height = viewportImageData.dimensions[1];
            worldToSlice = (point) => {
                const ijkPoint = csUtils.transformWorldToIndex(vtkImageData, point);
                return [ijkPoint[0], ijkPoint[1]];
            };
            sliceToWorld = (point) => csUtils.transformIndexToWorld(vtkImageData, [point[0], point[1], 0]);
            scalarData = viewportImageData.scalarData;
        }
        else if (viewport instanceof VolumeViewport) {
            const sliceImageData = csUtils.getCurrentVolumeViewportSlice(viewport);
            const { sliceToIndexMatrix, indexToSliceMatrix } = sliceImageData;
            worldToSlice = (point) => {
                const ijkPoint = csUtils.transformWorldToIndex(vtkImageData, point);
                const slicePoint = vec3.transformMat4([0, 0, 0], ijkPoint, indexToSliceMatrix);
                return [slicePoint[0], slicePoint[1]];
            };
            sliceToWorld = (point) => {
                const ijkPoint = vec3.transformMat4([0, 0, 0], [point[0], point[1], 0], sliceToIndexMatrix);
                return csUtils.transformIndexToWorld(vtkImageData, ijkPoint);
            };
            scalarData = sliceImageData.scalarData;
            width = sliceImageData.width;
            height = sliceImageData.height;
        }
        else {
            throw new Error('Viewport not supported');
        }
        scalarData = csUtils.convertToGrayscale(scalarData, width, height);
        const { voiRange } = viewport.getProperties();
        const startPos = worldToSlice(worldPos);
        this.scissors = LivewireScissors.createInstanceFromRawPixelData(scalarData, width, height, voiRange);
        if (nextPos) {
            this.scissorsNext = LivewireScissors.createInstanceFromRawPixelData(scalarData, width, height, voiRange);
            this.scissorsNext.startSearch(worldToSlice(nextPos));
        }
        this.scissors.startSearch(startPos);
        const newAnnotation = !nextPos;
        const confirmedPath = new LivewirePath();
        const currentPath = new LivewirePath();
        const currentPathNext = newAnnotation ? undefined : new LivewirePath();
        confirmedPath.addPoint(startPos);
        confirmedPath.addControlPoint(startPos);
        const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
        const lastCanvasPoint = viewport.worldToCanvas(worldPos);
        this.editData = {
            annotation,
            viewportIdsToRender,
            newAnnotation,
            hasMoved: false,
            lastCanvasPoint,
            confirmedPath,
            currentPath,
            confirmedPathNext: currentPathNext,
            closed: false,
            handleIndex: this.editData?.handleIndex ?? annotation.handles?.activeHandleIndex,
            worldToSlice,
            sliceToWorld,
            contourHoleProcessingEnabled,
        };
    }
    addNewAnnotation(evt) {
        const eventDetail = evt.detail;
        const { currentPoints, element } = eventDetail;
        const { world: worldPos } = currentPoints;
        const annotation = this.createAnnotation(evt);
        const contourHoleProcessingEnabled = getMouseModifierKey(evt.detail.event) ===
            this.configuration.contourHoleAdditionModifierKey;
        this.setupBaseEditData(worldPos, element, annotation, undefined, contourHoleProcessingEnabled);
        this.addAnnotation(annotation, element);
        this._activateDraw(element);
        evt.preventDefault();
        triggerAnnotationRenderForViewportIds(this.editData.viewportIdsToRender);
        return annotation;
    }
    clearEditData() {
        this.editData = null;
        this.scissors = null;
        this.scissorsNext = null;
        this.isDrawing = false;
    }
    editHandle(worldPos, element, annotation, handleIndex) {
        const { data } = annotation;
        const { points: handlePoints } = data.handles;
        const { length: numHandles } = handlePoints;
        const previousHandle = handlePoints[(handleIndex - 1 + numHandles) % numHandles];
        const nextHandle = handlePoints[(handleIndex + 1) % numHandles];
        if (!this.editData?.confirmedPathNext) {
            this.setupBaseEditData(previousHandle, element, annotation, nextHandle);
            const { polyline } = data.contour;
            const confirmedPath = new LivewirePath();
            const confirmedPathNext = new LivewirePath();
            const { worldToSlice } = this.editData;
            const previousIndex = findHandlePolylineIndex(annotation, handleIndex - 1);
            const nextIndex = findHandlePolylineIndex(annotation, handleIndex + 1);
            if (nextIndex === -1 || previousIndex === -1) {
                throw new Error(`Can't find handle index ${nextIndex === -1 && nextHandle} ${previousIndex === -1 && previousHandle}`);
            }
            if (handleIndex === 0) {
                confirmedPathNext.addPoints(polyline.slice(nextIndex + 1, previousIndex).map(worldToSlice));
            }
            else {
                confirmedPath.addPoints(polyline.slice(0, previousIndex + 1).map(worldToSlice));
                confirmedPathNext.addPoints(polyline.slice(nextIndex, polyline.length).map(worldToSlice));
            }
            this.editData.confirmedPath = confirmedPath;
            this.editData.confirmedPathNext = confirmedPathNext;
        }
        const { editData, scissors } = this;
        const { worldToSlice, sliceToWorld } = editData;
        const { activeHandleIndex } = data.handles;
        if (activeHandleIndex === null || activeHandleIndex === undefined) {
            data.handles.activeHandleIndex = handleIndex;
        }
        else if (activeHandleIndex !== handleIndex) {
            throw new Error(`Trying to edit a different handle than the one currently being edited ${handleIndex}!==${data.handles.activeHandleIndex}`);
        }
        const slicePos = worldToSlice(worldPos);
        if (slicePos[0] < 0 ||
            slicePos[0] >= scissors.width ||
            slicePos[1] < 0 ||
            slicePos[1] >= scissors.height) {
            return;
        }
        handlePoints[handleIndex] = sliceToWorld(slicePos);
        const pathPointsLeft = scissors.findPathToPoint(slicePos);
        const pathPointsRight = this.scissorsNext.findPathToPoint(slicePos);
        const currentPath = new LivewirePath();
        currentPath.prependPath(editData.confirmedPath);
        if (handleIndex !== 0) {
            currentPath.addPoints(pathPointsLeft);
        }
        currentPath.addPoints(pathPointsRight.reverse());
        currentPath.appendPath(editData.confirmedPathNext);
        if (handleIndex === 0) {
            currentPath.addPoints(pathPointsLeft);
        }
        editData.currentPath = currentPath;
        annotation.invalidated = true;
        editData.hasMoved = true;
        editData.closed = true;
    }
    renderAnnotation(enabledElement, svgDrawingHelper) {
        this.updateAnnotation(this.editData?.currentPath);
        return super.renderAnnotation(enabledElement, svgDrawingHelper);
    }
    isContourSegmentationTool() {
        return false;
    }
    createAnnotation(evt) {
        const contourSegmentationAnnotation = super.createAnnotation(evt);
        const { world: worldPos } = evt.detail.currentPoints;
        const annotation = csUtils.deepMerge(contourSegmentationAnnotation, {
            data: {
                handles: {
                    points: [[...worldPos]],
                },
            },
        });
        return annotation;
    }
    undo(element, config, evt) {
        if (!this.editData) {
            return;
        }
        this._endCallback(evt, true);
    }
    renderAnnotationInstance(renderContext) {
        const { annotation, enabledElement, svgDrawingHelper, annotationStyle, targetId, } = renderContext;
        const { viewport } = enabledElement;
        const { element } = viewport;
        const { worldToCanvas } = viewport;
        const { annotationUID, data, highlighted } = annotation;
        const { handles } = data;
        const newAnnotation = this.editData?.newAnnotation;
        const { lineWidth, lineDash, color } = annotationStyle;
        if (highlighted ||
            (newAnnotation &&
                annotation.annotationUID === this.editData?.annotation?.annotationUID)) {
            const handleGroupUID = '0';
            const canvasHandles = handles.points.map(worldToCanvas);
            drawHandlesSvg(svgDrawingHelper, annotationUID, handleGroupUID, canvasHandles, {
                color,
                lineDash,
                lineWidth,
            });
        }
        super.renderAnnotationInstance(renderContext);
        if (!data.cachedStats[targetId] ||
            data.cachedStats[targetId].areaUnit == null) {
            data.cachedStats[targetId] = {
                Modality: null,
                area: null,
                areaUnit: null,
            };
            this._calculateCachedStats(annotation, element);
        }
        else if (annotation.invalidated) {
            this._throttledCalculateCachedStats(annotation, element);
        }
        this._renderStats(annotation, viewport, svgDrawingHelper, annotationStyle.textbox);
        return true;
    }
    updateAnnotation(livewirePath) {
        if (!this.editData || !livewirePath) {
            return;
        }
        const { annotation, sliceToWorld, worldToSlice, closed, newAnnotation } = this.editData;
        let { pointArray: imagePoints } = livewirePath;
        if (imagePoints.length > 1) {
            imagePoints = [...imagePoints, imagePoints[0]];
        }
        const targetWindingDirection = newAnnotation && closed ? ContourWindingDirection.Clockwise : undefined;
        this.updateContourPolyline(annotation, {
            points: imagePoints,
            closed,
            targetWindingDirection,
        }, {
            canvasToWorld: sliceToWorld,
            worldToCanvas: worldToSlice,
        });
    }
}
LivewireContourTool.toolName = 'LivewireContour';
export default LivewireContourTool;
function defaultGetTextLines(data, targetId) {
    const cachedVolumeStats = data.cachedStats[targetId];
    const { area, areaUnit } = cachedVolumeStats;
    const textLines = [];
    if (area) {
        const areaLine = `Area: ${csUtils.roundNumber(area)} ${areaUnit}`;
        textLines.push(areaLine);
    }
    return textLines;
}
