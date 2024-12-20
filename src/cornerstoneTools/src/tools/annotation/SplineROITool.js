import { getEnabledElement, eventTarget, triggerEvent, utilities, } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
import { getChildAnnotations, removeAnnotation, } from '../../stateManagement/annotation/annotationState';
import { drawHandles as drawHandlesSvg, drawPolyline as drawPolylineSvg, drawLinkedTextBox as drawLinkedTextBoxSvg, } from '../../drawingSvg';
import { state } from '../../store/state';
import { Events, MouseBindings, KeyboardBindings, ChangeTypes, } from '../../enums';
import { resetElementCursor } from '../../cursors/elementCursor';
import * as math from '../../utilities/math';
import throttle from '../../utilities/throttle';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import { getTextBoxCoordsCanvas } from '../../utilities/drawing';
import { getCalibratedLengthUnitsAndScale } from '../../utilities/getCalibratedUnits';
import getMouseModifierKey from '../../eventDispatchers/shared/getMouseModifier';
import { ContourWindingDirection } from '../../types/ContourAnnotation';
import { CardinalSpline } from './splines/CardinalSpline';
import { LinearSpline } from './splines/LinearSpline';
import { CatmullRomSpline } from './splines/CatmullRomSpline';
import { BSpline } from './splines/BSpline';
import ContourSegmentationBaseTool from '../base/ContourSegmentationBaseTool';
import { triggerAnnotationRenderForViewportIds } from '../../utilities';
const SPLINE_MIN_POINTS = 3;
const SPLINE_CLICK_CLOSE_CURVE_DIST = 10;
const DEFAULT_SPLINE_CONFIG = {
    resolution: 20,
    controlPointAdditionDistance: 6,
    controlPointDeletionDistance: 6,
    showControlPointsConnectors: false,
    controlPointAdditionEnabled: true,
    controlPointDeletionEnabled: true,
};
var SplineTypesEnum;
(function (SplineTypesEnum) {
    SplineTypesEnum["Cardinal"] = "CARDINAL";
    SplineTypesEnum["Linear"] = "LINEAR";
    SplineTypesEnum["CatmullRom"] = "CATMULLROM";
    SplineTypesEnum["BSpline"] = "BSPLINE";
})(SplineTypesEnum || (SplineTypesEnum = {}));
var SplineToolActions;
(function (SplineToolActions) {
    SplineToolActions["AddControlPoint"] = "addControlPoint";
    SplineToolActions["DeleteControlPoint"] = "deleteControlPoint";
})(SplineToolActions || (SplineToolActions = {}));
class SplineROITool extends ContourSegmentationBaseTool {
    static { this.SplineTypes = SplineTypesEnum; }
    static { this.Actions = SplineToolActions; }
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            preventHandleOutsideImage: false,
            calculateStats: true,
            getTextLines: defaultGetTextLines,
            contourHoleAdditionModifierKey: KeyboardBindings.Shift,
            decimate: {
                enabled: false,
                epsilon: 0.1,
            },
            spline: {
                configuration: {
                    [SplineTypesEnum.Cardinal]: {
                        Class: CardinalSpline,
                        scale: 0.5,
                    },
                    [SplineTypesEnum.CatmullRom]: {
                        Class: CatmullRomSpline,
                    },
                    [SplineTypesEnum.Linear]: {
                        Class: LinearSpline,
                    },
                    [SplineTypesEnum.BSpline]: {
                        Class: BSpline,
                        controlPointAdditionEnabled: false,
                        controlPointDeletionEnabled: false,
                        showControlPointsConnectors: true,
                    },
                },
                type: SplineTypesEnum.CatmullRom,
                drawPreviewEnabled: true,
                lastControlPointDeletionKeys: ['Backspace', 'Delete'],
            },
            actions: {
                [SplineToolActions.AddControlPoint]: {
                    method: 'addControlPointCallback',
                    bindings: [
                        {
                            mouseButton: MouseBindings.Primary,
                            modifierKey: KeyboardBindings.Shift,
                        },
                    ],
                },
                [SplineToolActions.DeleteControlPoint]: {
                    method: 'deleteControlPointCallback',
                    bindings: [
                        {
                            mouseButton: MouseBindings.Primary,
                            modifierKey: KeyboardBindings.Ctrl,
                        },
                    ],
                },
            },
        },
    }) {
        super(toolProps, defaultToolProps);
        this.isHandleOutsideImage = false;
        this.fireChangeOnUpdate = null;
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const { instance: spline } = annotation.data.spline;
            return spline.isPointNearCurve(canvasCoords, proximity);
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
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation, contourHoleProcessingEnabled, } = this.editData;
            const { data } = annotation;
            annotation.autoGenerated = false;
            data.handles.activeHandleIndex = null;
            this._deactivateModify(element);
            this._deactivateDraw(element);
            resetElementCursor(element);
            const enabledElement = getEnabledElement(element);
            const image = this.getTargetImageData(this.getTargetId(enabledElement.viewport));
            const { imageData, dimensions } = image;
            this.isHandleOutsideImage = data.handles.points
                .map((p) => utilities.transformWorldToIndex(imageData, p))
                .some((index) => !utilities.indexWithinDimensions(index, dimensions));
            if (this.isHandleOutsideImage &&
                this.configuration.preventHandleOutsideImage) {
                removeAnnotation(annotation.annotationUID);
            }
            const changeType = newAnnotation
                ? ChangeTypes.Completed
                : ChangeTypes.HandlesUpdated;
            if (!this.fireChangeOnUpdate) {
                this.fireChangeOnUpdate = {
                    annotationUID: annotation.annotationUID,
                    changeType,
                    contourHoleProcessingEnabled,
                };
            }
            else {
                this.fireChangeOnUpdate.annotationUID = annotation.annotationUID;
                this.fireChangeOnUpdate.changeType = changeType;
            }
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            this.editData = null;
            this.isDrawing = false;
        };
        this._keyDownCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const key = eventDetail.key ?? '';
            const { lastControlPointDeletionKeys } = this.configuration.spline;
            const deleteLastPoint = lastControlPointDeletionKeys.includes(key);
            if (!deleteLastPoint) {
                return;
            }
            const { annotation } = this.editData;
            const { data } = annotation;
            if (data.handles.points.length === SPLINE_MIN_POINTS) {
                this.cancel(element);
                return;
            }
            else {
                const controlPointIndex = data.handles.points.length - 1;
                this._deleteControlPointByIndex(element, annotation, controlPointIndex);
            }
            evt.preventDefault();
        };
        this._mouseMoveCallback = (evt) => {
            const { drawPreviewEnabled } = this.configuration.spline;
            if (!drawPreviewEnabled) {
                return;
            }
            const { element } = evt.detail;
            const { renderingEngine } = getEnabledElement(element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData.lastCanvasPoint = evt.detail.currentPoints.canvas;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            evt.preventDefault();
        };
        this._mouseDownCallback = (evt) => {
            const doubleClick = evt.type === Events.MOUSE_DOUBLE_CLICK;
            const { annotation, viewportIdsToRender } = this.editData;
            const { data } = annotation;
            if (data.contour.closed) {
                return;
            }
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { currentPoints } = eventDetail;
            const { canvas: canvasPoint, world: worldPoint } = currentPoints;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            let closeContour = data.handles.points.length >= 2 && doubleClick;
            let addNewPoint = true;
            if (data.handles.points.length >= 3) {
                const { instance: spline } = data.spline;
                const closestControlPoint = spline.getClosestControlPointWithinDistance(canvasPoint, SPLINE_CLICK_CLOSE_CURVE_DIST);
                if (closestControlPoint?.index === 0) {
                    addNewPoint = false;
                    closeContour = true;
                }
            }
            if (addNewPoint) {
                data.handles.points.push(worldPoint);
            }
            data.contour.closed = data.contour.closed || closeContour;
            annotation.invalidated = true;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            if (data.contour.closed) {
                this._endCallback(evt);
            }
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
                const { deltaPoints } = eventDetail;
                const worldPosDelta = deltaPoints.world;
                this.moveAnnotation(annotation, worldPosDelta);
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
        this.triggerAnnotationCompleted = (annotation, contourHoleProcessingEnabled) => {
            const eventType = Events.ANNOTATION_COMPLETED;
            const eventDetail = {
                annotation,
                changeType: ChangeTypes.Completed,
                contourHoleProcessingEnabled,
            };
            triggerEvent(eventTarget, eventType, eventDetail);
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
        this.triggerChangeEvent = (annotation, enabledElement, changeType = ChangeTypes.StatsUpdated, contourHoleProcessingEnabled) => {
            if (changeType === ChangeTypes.Completed) {
                this.triggerAnnotationCompleted(annotation, contourHoleProcessingEnabled);
            }
            else {
                this.triggerAnnotationModified(annotation, enabledElement, changeType);
            }
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
            element.addEventListener(Events.KEY_DOWN, this._keyDownCallback);
            element.addEventListener(Events.MOUSE_MOVE, this._mouseMoveCallback);
            element.addEventListener(Events.MOUSE_DOWN, this._mouseDownCallback);
            element.addEventListener(Events.MOUSE_DOUBLE_CLICK, this._mouseDownCallback);
            element.addEventListener(Events.TOUCH_TAP, this._mouseDownCallback);
        };
        this._deactivateDraw = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.KEY_DOWN, this._keyDownCallback);
            element.removeEventListener(Events.MOUSE_MOVE, this._mouseMoveCallback);
            element.removeEventListener(Events.MOUSE_DOWN, this._mouseDownCallback);
            element.removeEventListener(Events.MOUSE_DOUBLE_CLICK, this._mouseDownCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._mouseDownCallback);
        };
        this._renderStats = (annotation, viewport, svgDrawingHelper, textboxStyle) => {
            const data = annotation.data;
            const targetId = this.getTargetId(viewport);
            if (!data.spline.instance.closed || !textboxStyle.visibility) {
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
        this.addControlPointCallback = (evt, annotation) => {
            const { data } = annotation;
            const splineType = data.spline.type;
            const splineConfig = this._getSplineConfig(splineType);
            const maxDist = splineConfig.controlPointAdditionDistance;
            if (splineConfig.controlPointAdditionEnabled === false) {
                return;
            }
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine, viewport } = enabledElement;
            const { canvasToWorld } = viewport;
            const { instance: spline } = data.spline;
            const canvasPos = evt.detail.currentPoints.canvas;
            const closestPointInfo = spline.getClosestPoint(canvasPos);
            if (closestPointInfo.distance > maxDist) {
                return;
            }
            const { index, point: canvasPoint } = spline.addControlPointAtU(closestPointInfo.uValue);
            data.handles.points.splice(index, 0, canvasToWorld(canvasPoint));
            annotation.invalidated = true;
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this.deleteControlPointCallback = (evt, annotation) => {
            const splineType = annotation.data.spline.type;
            const splineConfig = this._getSplineConfig(splineType);
            const maxDist = splineConfig.controlPointDeletionDistance;
            if (splineConfig.controlPointDeletionEnabled === false) {
                return;
            }
            const eventDetail = evt.detail;
            const { element, currentPoints } = eventDetail;
            const { canvas: canvasPos } = currentPoints;
            const { instance: spline } = annotation.data.spline;
            const closestControlPoint = spline.getClosestControlPointWithinDistance(canvasPos, maxDist);
            if (!closestControlPoint) {
                return;
            }
            this._deleteControlPointByIndex(element, annotation, closestControlPoint.index);
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
            const { viewport } = enabledElement;
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
                    areaUnit,
                };
            }
            this.triggerAnnotationModified(annotation, enabledElement, ChangeTypes.StatsUpdated);
            return cachedStats;
        };
        this._throttledCalculateCachedStats = throttle(this._calculateCachedStats, 100, { trailing: true });
    }
    addNewAnnotation(evt) {
        const eventDetail = evt.detail;
        const { currentPoints, element } = eventDetail;
        const { canvas: canvasPos } = currentPoints;
        const contourHoleProcessingEnabled = getMouseModifierKey(evt.detail.event) ===
            this.configuration.contourHoleAdditionModifierKey;
        const enabledElement = getEnabledElement(element);
        const { renderingEngine } = enabledElement;
        const annotation = this.createAnnotation(evt);
        this.isDrawing = true;
        this.addAnnotation(annotation, element);
        const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
        this.editData = {
            annotation,
            viewportIdsToRender,
            movingTextBox: false,
            newAnnotation: true,
            hasMoved: false,
            lastCanvasPoint: canvasPos,
            contourHoleProcessingEnabled,
        };
        this._activateDraw(element);
        evt.preventDefault();
        triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        return annotation;
    }
    cancel(element) {
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
        super.cancelAnnotation(annotation);
        const enabledElement = getEnabledElement(element);
        const { renderingEngine } = enabledElement;
        triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        this.editData = null;
        return annotation.annotationUID;
    }
    isContourSegmentationTool() {
        return false;
    }
    renderAnnotationInstance(renderContext) {
        const { enabledElement, targetId, svgDrawingHelper, annotationStyle } = renderContext;
        const { viewport } = enabledElement;
        const { worldToCanvas } = viewport;
        const { element } = viewport;
        const annotation = renderContext.annotation;
        const { annotationUID, data, highlighted } = annotation;
        const { handles } = data;
        const { points: controlPoints, activeHandleIndex } = handles;
        const newAnnotation = this.editData?.newAnnotation;
        const { lineWidth, lineDash, color, locked: annotationLocked, } = annotationStyle;
        const canvasCoordinates = controlPoints.map((p) => worldToCanvas(p));
        const { drawPreviewEnabled } = this.configuration.spline;
        const splineType = annotation.data.spline.type;
        const splineConfig = this._getSplineConfig(splineType);
        const spline = annotation.data.spline.instance;
        const childAnnotations = getChildAnnotations(annotation);
        const missingAnnotation = childAnnotations.findIndex((it) => !it);
        if (missingAnnotation !== -1) {
            throw new Error(`Can't find annotation for child ${annotation.childAnnotationUIDs.join()}`);
        }
        const splineAnnotationsGroup = [annotation, ...childAnnotations].filter((annotation) => this._isSplineROIAnnotation(annotation));
        splineAnnotationsGroup.forEach((annotation) => {
            const spline = this._updateSplineInstance(element, annotation);
            const splinePolylineCanvas = spline.getPolylinePoints();
            this.updateContourPolyline(annotation, {
                points: splinePolylineCanvas,
                closed: data.contour.closed,
                targetWindingDirection: ContourWindingDirection.Clockwise,
            }, viewport, { updateWindingDirection: data.contour.closed });
        });
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
        let activeHandleCanvasCoords;
        if (!annotationLocked && !this.editData && activeHandleIndex !== null) {
            activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
        }
        if (activeHandleCanvasCoords || newAnnotation || highlighted) {
            const handleGroupUID = '0';
            drawHandlesSvg(svgDrawingHelper, annotationUID, handleGroupUID, canvasCoordinates, {
                color,
                lineWidth,
                handleRadius: '3',
            });
        }
        if (drawPreviewEnabled &&
            spline.numControlPoints > 1 &&
            this.editData?.lastCanvasPoint &&
            !spline.closed) {
            const { lastCanvasPoint } = this.editData;
            const previewPolylinePoints = spline.getPreviewPolylinePoints(lastCanvasPoint, SPLINE_CLICK_CLOSE_CURVE_DIST);
            drawPolylineSvg(svgDrawingHelper, annotationUID, 'previewSplineChange', previewPolylinePoints, {
                color: '#9EA0CA',
                lineDash: lineDash,
                lineWidth: 1,
            });
        }
        if (splineConfig.showControlPointsConnectors) {
            const controlPointsConnectors = [...canvasCoordinates];
            if (spline.closed) {
                controlPointsConnectors.push(canvasCoordinates[0]);
            }
            drawPolylineSvg(svgDrawingHelper, annotationUID, 'controlPointsConnectors', controlPointsConnectors, {
                color: 'rgba(255, 255, 255, 0.5)',
                lineWidth: 1,
            });
        }
        this._renderStats(annotation, viewport, svgDrawingHelper, annotationStyle.textbox);
        if (this.fireChangeOnUpdate?.annotationUID === annotationUID) {
            this.triggerChangeEvent(annotation, enabledElement, this.fireChangeOnUpdate.changeType, this.fireChangeOnUpdate.contourHoleProcessingEnabled);
            this.fireChangeOnUpdate = null;
        }
        annotation.invalidated = false;
        return true;
    }
    createInterpolatedSplineControl(annotation) {
        if (annotation.data.handles.points?.length) {
            return;
        }
        const { polyline } = annotation.data.contour;
        if (!polyline || !polyline.length) {
            return;
        }
        annotation.data.handles.points = [];
        const { points } = annotation.data.handles;
        const increment = Math.max(10, Math.floor(polyline.length / 20));
        for (let i = 0; i < polyline.length - increment; i += increment) {
            points.push(polyline[i]);
        }
        points.push(polyline[polyline.length - 1]);
    }
    createAnnotation(evt) {
        const contourAnnotation = super.createAnnotation(evt);
        const { world: worldPos } = evt.detail.currentPoints;
        const { type: splineType } = this.configuration.spline;
        const splineConfig = this._getSplineConfig(splineType);
        const spline = new splineConfig.Class();
        const createSpline = () => ({
            type: splineConfig.type,
            instance: spline,
            resolution: splineConfig.resolution,
        });
        let onInterpolationComplete;
        if (this.configuration.interpolation?.enabled) {
            onInterpolationComplete = (annotation) => {
                annotation.data.spline ||= createSpline();
                this.createInterpolatedSplineControl(annotation);
            };
        }
        return utilities.deepMerge(contourAnnotation, {
            data: {
                handles: {
                    points: [[...worldPos]],
                },
                spline: createSpline(),
                cachedStats: {},
            },
            onInterpolationComplete,
        });
    }
    _deleteControlPointByIndex(element, annotation, controlPointIndex) {
        const enabledElement = getEnabledElement(element);
        const { points: controlPoints } = annotation.data.handles;
        if (controlPoints.length === 3) {
            removeAnnotation(annotation.annotationUID);
        }
        else {
            controlPoints.splice(controlPointIndex, 1);
        }
        const { renderingEngine } = enabledElement;
        const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
        annotation.invalidated = true;
        triggerAnnotationRenderForViewportIds(viewportIdsToRender);
    }
    _isSplineROIAnnotation(annotation) {
        return !!annotation.data?.spline;
    }
    _getSplineConfig(type) {
        const { configuration: config } = this;
        const splineConfigs = config.spline.configuration;
        return Object.assign({ type }, DEFAULT_SPLINE_CONFIG, splineConfigs[type]);
    }
    _updateSplineInstance(element, annotation) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const { worldToCanvas } = viewport;
        const { data } = annotation;
        const { type: splineType, instance: spline } = annotation.data.spline;
        const splineConfig = this._getSplineConfig(splineType);
        const worldPoints = data.handles.points;
        const canvasPoints = worldPoints.map(worldToCanvas);
        const resolution = splineConfig.resolution !== undefined
            ? parseInt(splineConfig.resolution)
            : undefined;
        const scale = splineConfig.scale !== undefined
            ? parseFloat(splineConfig.scale)
            : undefined;
        spline.setControlPoints(canvasPoints);
        spline.closed = !!data.contour.closed;
        if (!spline.fixedResolution &&
            resolution !== undefined &&
            spline.resolution !== resolution) {
            spline.resolution = resolution;
            annotation.invalidated = true;
        }
        if (spline instanceof CardinalSpline &&
            !spline.fixedScale &&
            scale !== undefined &&
            spline.scale !== scale) {
            spline.scale = scale;
            annotation.invalidated = true;
        }
        return spline;
    }
}
function defaultGetTextLines(data, targetId) {
    const cachedVolumeStats = data.cachedStats[targetId];
    const { area, isEmptyArea, areaUnit } = cachedVolumeStats;
    const textLines = [];
    if (area) {
        const areaLine = isEmptyArea
            ? `Area: Oblique not supported`
            : `Area: ${utilities.roundNumber(area)} ${areaUnit}`;
        textLines.push(areaLine);
    }
    return textLines;
}
SplineROITool.toolName = 'SplineROI';
export default SplineROITool;
