import { AnnotationTool } from '../base';
import { getEnabledElement } from '@cornerstonejs/core';
import { addAnnotation, getAnnotations, removeAnnotation, } from '../../stateManagement/annotation/annotationState';
import { isAnnotationVisible } from '../../stateManagement/annotation/annotationVisibility';
import { triggerAnnotationCompleted } from '../../stateManagement/annotation/helpers/state';
import { drawCircle as drawCircleSvg, drawLine } from '../../drawingSvg';
import { state } from '../../store/state';
import { Events } from '../../enums';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import { resetElementCursor, hideElementCursor, } from '../../cursors/elementCursor';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { getCanvasCircleRadius } from '../../utilities/math/circle';
import { vec3 } from 'gl-matrix';
const CROSSHAIR_SIZE = 5;
class ETDRSGridTool extends AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            shadow: true,
            preventHandleOutsideImage: false,
            degrees: [45, 135, 225, 315],
            diameters: [10, 30, 60],
        },
    }) {
        super(toolProps, defaultToolProps);
        this.isHandleOutsideImage = false;
        this.addNewAnnotation = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = getEnabledElement(element);
            const { viewport, renderingEngine } = enabledElement;
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
                    ...viewport.getViewReference({ points: [worldPos] }),
                },
                data: {
                    label: '',
                    handles: {
                        points: [[...worldPos]],
                    },
                },
            };
            addAnnotation(annotation, element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                newAnnotation: true,
            };
            this._activateDraw(element);
            hideElementCursor(element);
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            return annotation;
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            const { data } = annotation;
            const { points } = data.handles;
            const center = viewport.worldToCanvas(points[0]);
            const radius = getCanvasCircleRadius([center, canvasCoords]);
            if (Math.abs(radius) < proximity) {
                return true;
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
            };
            hideElementCursor(element);
            this._activateModify(element);
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            evt.preventDefault();
        };
        this.handleSelectedCallback = (evt, annotation) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            annotation.highlighted = true;
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
            };
            this._activateModify(element);
            hideElementCursor(element);
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            evt.preventDefault();
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation, hasMoved } = this.editData;
            const { data } = annotation;
            if (newAnnotation && !hasMoved) {
                return;
            }
            annotation.highlighted = false;
            data.handles.activeHandleIndex = null;
            this._deactivateModify(element);
            this._deactivateDraw(element);
            resetElementCursor(element);
            const { renderingEngine } = getEnabledElement(element);
            this.editData = null;
            this.isDrawing = false;
            if (this.isHandleOutsideImage &&
                this.configuration.preventHandleOutsideImage) {
                removeAnnotation(annotation.annotationUID);
            }
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            if (newAnnotation) {
                triggerAnnotationCompleted(annotation);
            }
        };
        this._dragDrawCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { currentPoints } = eventDetail;
            const currentCanvasPoints = currentPoints.canvas;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine, viewport } = enabledElement;
            const { canvasToWorld } = viewport;
            const { annotation, viewportIdsToRender } = this.editData;
            const { data } = annotation;
            data.handles.points = [
                canvasToWorld(currentCanvasPoints),
                canvasToWorld(currentCanvasPoints),
            ];
            annotation.invalidated = true;
            this.editData.hasMoved = true;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this._dragModifyCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender } = this.editData;
            const { data } = annotation;
            const { deltaPoints } = eventDetail;
            const worldPosDelta = deltaPoints.world;
            const points = data.handles.points;
            points.forEach((point) => {
                point[0] += worldPosDelta[0];
                point[1] += worldPosDelta[1];
                point[2] += worldPosDelta[2];
            });
            annotation.invalidated = true;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this._dragHandle = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const enabledElement = getEnabledElement(element);
            const { canvasToWorld, worldToCanvas } = enabledElement.viewport;
            const { annotation } = this.editData;
            const { data } = annotation;
            const { points } = data.handles;
            const canvasCoordinates = points.map((p) => worldToCanvas(p));
            const { currentPoints } = eventDetail;
            const currentCanvasPoints = currentPoints.canvas;
            const dXCanvas = currentCanvasPoints[0] - canvasCoordinates[0][0];
            const dYCanvas = currentCanvasPoints[1] - canvasCoordinates[0][1];
            const canvasCenter = currentCanvasPoints;
            const canvasEnd = [
                canvasCoordinates[1][0] + dXCanvas,
                canvasCoordinates[1][1] + dYCanvas,
            ];
            points[0] = canvasToWorld(canvasCenter);
            points[1] = canvasToWorld(canvasEnd);
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
                const { renderingEngine } = getEnabledElement(element);
                triggerAnnotationRenderForViewportIds(viewportIdsToRender);
                if (newAnnotation) {
                    triggerAnnotationCompleted(annotation);
                }
                this.editData = null;
                return annotation.annotationUID;
            }
        };
        this._activateModify = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragModifyCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragModifyCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateModify = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragModifyCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragModifyCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._activateDraw = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragDrawCallback);
            element.addEventListener(Events.MOUSE_MOVE, this._dragDrawCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragDrawCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateDraw = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragDrawCallback);
            element.removeEventListener(Events.MOUSE_MOVE, this._dragDrawCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragDrawCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
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
            const styleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
            };
            for (let i = 0; i < annotations.length; i++) {
                const annotation = annotations[i];
                const { annotationUID, data } = annotation;
                const { handles } = data;
                const { points } = handles;
                styleSpecifier.annotationUID = annotationUID;
                const { color, lineWidth, lineDash } = this.getAnnotationStyle({
                    annotation,
                    styleSpecifier,
                });
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                const center = canvasCoordinates[0];
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return renderStatus;
                }
                if (!isAnnotationVisible(annotationUID)) {
                    continue;
                }
                let lineUID = `${annotationUID}-crosshair-vertical`;
                let start = [center[0], center[1] + CROSSHAIR_SIZE];
                let end = [center[0], center[1] - CROSSHAIR_SIZE];
                drawLine(svgDrawingHelper, annotationUID, lineUID, start, end, {
                    color,
                    lineDash,
                    lineWidth,
                });
                lineUID = `${annotationUID}-crosshair-horizontal`;
                start = [center[0] + CROSSHAIR_SIZE, center[1]];
                end = [center[0] - CROSSHAIR_SIZE, center[1]];
                drawLine(svgDrawingHelper, annotationUID, lineUID, start, end, {
                    color,
                    lineDash,
                    lineWidth,
                });
                const diametersCanvas = this.configuration.diameters.map((diameter) => this.worldMeasureToCanvas(diameter, viewport));
                for (let i = 0; i < diametersCanvas.length; i++) {
                    const dataId = `${annotationUID}-circle-${i}`;
                    const circleUID = `${annotationUID}-circle-${i}`;
                    drawCircleSvg(svgDrawingHelper, annotationUID, circleUID, center, diametersCanvas[i] / 2, {
                        color,
                        lineDash,
                        lineWidth,
                    }, dataId);
                }
                const degreesRad = (x) => (x * Math.PI) / 180;
                const angleRadians = this.configuration.degrees.map((degree) => degreesRad(degree));
                for (let i = 0; i < angleRadians.length; i++) {
                    const lineUID = `${annotationUID}-line-${i}`;
                    const start = [
                        (Math.cos(angleRadians[i]) * diametersCanvas[0]) / 2 + center[0],
                        (Math.sin(angleRadians[i]) * diametersCanvas[0]) / 2 + center[1],
                    ];
                    const end = [
                        (Math.cos(angleRadians[i]) * diametersCanvas[2]) / 2 + center[0],
                        (Math.sin(angleRadians[i]) * diametersCanvas[2]) / 2 + center[1],
                    ];
                    drawLine(svgDrawingHelper, annotationUID, lineUID, start, end, {
                        color,
                        lineDash,
                        lineWidth,
                    });
                }
                renderStatus = true;
            }
            return renderStatus;
        };
    }
    worldMeasureToCanvas(measurement, viewport) {
        const p1 = viewport.canvasToWorld([
            viewport.canvas.width / 2,
            viewport.canvas.height / 2,
        ]);
        const { viewUp } = viewport.getCamera();
        const p2 = vec3.scaleAndAdd(vec3.create(), p1, viewUp, measurement);
        const p1Canvas = viewport.worldToCanvas(p1);
        const p2Canvas = viewport.worldToCanvas(p2);
        const distance = Math.sqrt(Math.pow(p2Canvas[0] - p1Canvas[0], 2) +
            Math.pow(p2Canvas[1] - p1Canvas[1], 2));
        return distance;
    }
}
ETDRSGridTool.toolName = 'ETDRSGrid';
export default ETDRSGridTool;
