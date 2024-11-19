import { AnnotationTool } from './base';
import { getEnabledElement, utilities } from '@cornerstonejs/core';
import { addAnnotation, getAnnotations, removeAnnotation, } from '../stateManagement';
import { triggerAnnotationCompleted } from '../stateManagement/annotation/helpers/state';
import { drawRect as drawRectSvg } from '../drawingSvg';
import { state } from '../store/state';
import { Events } from '../enums';
import { getViewportIdsWithToolToRender } from '../utilities/viewportFilters';
import { resetElementCursor, hideElementCursor, } from '../cursors/elementCursor';
import triggerAnnotationRenderForViewportIds from '../utilities/triggerAnnotationRenderForViewportIds';
import { windowLevel } from '../utilities/voi';
class WindowLevelRegionTool extends AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            minWindowWidth: 10,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.addNewAnnotation = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            this.isDrawing = true;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const referencedImageId = this.getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp);
            const FrameOfReferenceUID = viewport.getFrameOfReferenceUID();
            const annotation = {
                invalidated: true,
                highlighted: true,
                metadata: {
                    toolName: this.getToolName(),
                    viewPlaneNormal: [...viewPlaneNormal],
                    viewUp: [...viewUp],
                    FrameOfReferenceUID,
                    referencedImageId,
                },
                data: {
                    handles: {
                        points: [
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                        ],
                    },
                    cachedStats: {},
                },
            };
            addAnnotation(annotation, element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
            };
            this._activateDraw(element);
            hideElementCursor(element);
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            return annotation;
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender } = this.editData;
            this._deactivateDraw(element);
            resetElementCursor(element);
            this.editData = null;
            this.isDrawing = false;
            removeAnnotation(annotation.annotationUID);
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            triggerAnnotationCompleted(annotation);
            this.applyWindowLevelRegion(annotation, element);
        };
        this._dragCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender } = this.editData;
            const { data } = annotation;
            const { currentPoints } = eventDetail;
            const enabledElement = getEnabledElement(element);
            const { worldToCanvas, canvasToWorld } = enabledElement.viewport;
            const worldPos = currentPoints.world;
            const { points } = data.handles;
            const DEFAULT_HANDLE_INDEX = 3;
            points[DEFAULT_HANDLE_INDEX] = [...worldPos];
            const bottomLeftCanvas = worldToCanvas(points[0]);
            const topRightCanvas = worldToCanvas(points[3]);
            const bottomRightCanvas = [
                topRightCanvas[0],
                bottomLeftCanvas[1],
            ];
            const topLeftCanvas = [
                bottomLeftCanvas[0],
                topRightCanvas[1],
            ];
            const bottomRightWorld = canvasToWorld(bottomRightCanvas);
            const topLeftWorld = canvasToWorld(topLeftCanvas);
            points[1] = bottomRightWorld;
            points[2] = topLeftWorld;
            annotation.invalidated = true;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this._activateDraw = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(Events.MOUSE_MOVE, this._dragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateDraw = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(Events.MOUSE_MOVE, this._dragCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback);
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
                const { points } = data.handles;
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                styleSpecifier.annotationUID = annotationUID;
                const { color, lineWidth, lineDash } = this.getAnnotationStyle({
                    annotation,
                    styleSpecifier,
                });
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return renderStatus;
                }
                const dataId = `${annotationUID}-rect`;
                const rectangleUID = '0';
                drawRectSvg(svgDrawingHelper, annotationUID, rectangleUID, canvasCoordinates[0], canvasCoordinates[3], {
                    color,
                    lineDash,
                    lineWidth,
                }, dataId);
                renderStatus = true;
            }
            return renderStatus;
        };
        this.applyWindowLevelRegion = (annotation, element) => {
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            const imageData = windowLevel.extractWindowLevelRegionToolData(viewport);
            const { data } = annotation;
            const { points } = data.handles;
            const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
            const startCanvas = canvasCoordinates[0];
            const endCanvas = canvasCoordinates[3];
            let left = Math.min(startCanvas[0], endCanvas[0]);
            let top = Math.min(startCanvas[1], endCanvas[1]);
            let width = Math.abs(startCanvas[0] - endCanvas[0]);
            let height = Math.abs(startCanvas[1] - endCanvas[1]);
            left = utilities.clip(left, 0, imageData.width);
            top = utilities.clip(top, 0, imageData.height);
            width = Math.floor(Math.min(width, Math.abs(imageData.width - left)));
            height = Math.floor(Math.min(height, Math.abs(imageData.height - top)));
            const pixelLuminanceData = windowLevel.getLuminanceFromRegion(imageData, Math.round(left), Math.round(top), width, height);
            const minMaxMean = windowLevel.calculateMinMaxMean(pixelLuminanceData, imageData.minPixelValue, imageData.maxPixelValue);
            if (this.configuration.minWindowWidth === undefined) {
                this.configuration.minWindowWidth = 10;
            }
            const windowWidth = Math.max(Math.abs(minMaxMean.max - minMaxMean.min), this.configuration.minWindowWidth);
            const windowCenter = minMaxMean.mean;
            const voiRange = utilities.windowLevel.toLowHighRange(windowWidth, windowCenter);
            viewport.setProperties({ voiRange });
            viewport.render();
        };
        this.cancel = () => {
            return null;
        };
        this.isPointNearTool = () => {
            return null;
        };
        this.toolSelectedCallback = () => {
            return null;
        };
        this.handleSelectedCallback = () => {
            return null;
        };
        this._activateModify = () => {
            return null;
        };
        this._deactivateModify = () => {
            return null;
        };
    }
}
WindowLevelRegionTool.toolName = 'WindowLevelRegion';
export default WindowLevelRegionTool;
