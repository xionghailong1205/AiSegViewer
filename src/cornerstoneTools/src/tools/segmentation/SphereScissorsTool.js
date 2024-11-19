import { BaseVolumeViewport, cache, getEnabledElement, } from '@cornerstonejs/core';
import { BaseTool } from '../base';
import { fillInsideSphere } from './strategies/fillSphere';
import { eraseInsideSphere } from './strategies/eraseSphere';
import { Events, SegmentationRepresentations } from '../../enums';
import { drawCircle as drawCircleSvg } from '../../drawingSvg';
import { resetElementCursor, hideElementCursor, } from '../../cursors/elementCursor';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { config as segmentationConfig, segmentLocking, segmentIndex as segmentIndexController, activeSegmentation, } from '../../stateManagement/segmentation';
import { getSegmentation } from '../../stateManagement/segmentation/segmentationState';
class SphereScissorsTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            strategies: {
                FILL_INSIDE: fillInsideSphere,
                ERASE_INSIDE: eraseInsideSphere,
            },
            defaultStrategy: 'FILL_INSIDE',
            activeStrategy: 'FILL_INSIDE',
        },
    }) {
        super(toolProps, defaultToolProps);
        this.preMouseDownCallback = (evt) => {
            if (this.isDrawing === true) {
                return;
            }
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const canvasPos = currentPoints.canvas;
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            this.isDrawing = true;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const activeSegmentationRepresentation = activeSegmentation.getActiveSegmentation(viewport.id);
            if (!activeSegmentationRepresentation) {
                throw new Error('No active segmentation detected, create one before using scissors tool');
            }
            const { segmentationId } = activeSegmentationRepresentation;
            const segmentIndex = segmentIndexController.getActiveSegmentIndex(segmentationId);
            const segmentsLocked = segmentLocking.getLockedSegmentIndices(segmentationId);
            const segmentColor = segmentationConfig.color.getSegmentIndexColor(viewport.id, segmentationId, segmentIndex);
            this.isDrawing = true;
            const annotation = {
                metadata: {
                    viewPlaneNormal: [...viewPlaneNormal],
                    viewUp: [...viewUp],
                    FrameOfReferenceUID: viewport.getFrameOfReferenceUID(),
                    referencedImageId: '',
                    toolName: this.getToolName(),
                    segmentColor,
                },
                data: {
                    invalidated: true,
                    handles: {
                        points: [
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                        ],
                        activeHandleIndex: null,
                    },
                    cachedStats: {},
                    highlighted: true,
                },
            };
            const viewportIdsToRender = [viewport.id];
            this.editData = {
                annotation,
                centerCanvas: canvasPos,
                segmentIndex,
                segmentationId,
                segmentsLocked,
                segmentColor,
                toolGroupId: this.toolGroupId,
                viewportIdsToRender,
                handleIndex: 3,
                movingTextBox: false,
                newAnnotation: true,
                hasMoved: false,
                volumeId: null,
                referencedVolumeId: null,
                imageId: null,
            };
            const { representationData } = getSegmentation(segmentationId);
            const labelmapData = representationData[SegmentationRepresentations.Labelmap];
            if (viewport instanceof BaseVolumeViewport) {
                const { volumeId } = labelmapData;
                const segmentation = cache.getVolume(volumeId);
                this.editData = {
                    ...this.editData,
                    volumeId,
                    referencedVolumeId: segmentation.referencedVolumeId,
                };
            }
            else {
                this.editData = {
                    ...this.editData,
                };
            }
            this._activateDraw(element);
            hideElementCursor(element);
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            return true;
        };
        this._dragCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { currentPoints } = eventDetail;
            const currentCanvasPoints = currentPoints.canvas;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine, viewport } = enabledElement;
            const { canvasToWorld } = viewport;
            const { annotation, viewportIdsToRender, centerCanvas } = this.editData;
            const { data } = annotation;
            const dX = Math.abs(currentCanvasPoints[0] - centerCanvas[0]);
            const dY = Math.abs(currentCanvasPoints[1] - centerCanvas[1]);
            const radius = Math.sqrt(dX * dX + dY * dY);
            const bottomCanvas = [
                centerCanvas[0],
                centerCanvas[1] + radius,
            ];
            const topCanvas = [centerCanvas[0], centerCanvas[1] - radius];
            const leftCanvas = [
                centerCanvas[0] - radius,
                centerCanvas[1],
            ];
            const rightCanvas = [
                centerCanvas[0] + radius,
                centerCanvas[1],
            ];
            data.handles.points = [
                canvasToWorld(bottomCanvas),
                canvasToWorld(topCanvas),
                canvasToWorld(leftCanvas),
                canvasToWorld(rightCanvas),
            ];
            annotation.invalidated = true;
            this.editData.hasMoved = true;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, newAnnotation, hasMoved, segmentIndex, segmentsLocked, } = this.editData;
            const { data } = annotation;
            const { viewPlaneNormal, viewUp } = annotation.metadata;
            if (newAnnotation && !hasMoved) {
                return;
            }
            annotation.highlighted = false;
            data.handles.activeHandleIndex = null;
            this._deactivateDraw(element);
            resetElementCursor(element);
            const enabledElement = getEnabledElement(element);
            const operationData = {
                ...this.editData,
                points: data.handles.points,
                segmentIndex,
                segmentsLocked,
                viewPlaneNormal,
                viewUp,
            };
            this.editData = null;
            this.isDrawing = false;
            this.applyActiveStrategy(enabledElement, operationData);
        };
        this._activateDraw = (element) => {
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.MOUSE_MOVE, this._dragCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragCallback);
        };
        this._deactivateDraw = (element) => {
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.MOUSE_MOVE, this._dragCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            if (!this.editData) {
                return renderStatus;
            }
            const { viewport } = enabledElement;
            const { viewportIdsToRender } = this.editData;
            if (!viewportIdsToRender.includes(viewport.id)) {
                return renderStatus;
            }
            const { annotation } = this.editData;
            const toolMetadata = annotation.metadata;
            const annotationUID = annotation.annotationUID;
            const data = annotation.data;
            const { points } = data.handles;
            const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
            const bottom = canvasCoordinates[0];
            const top = canvasCoordinates[1];
            const center = [
                Math.floor((bottom[0] + top[0]) / 2),
                Math.floor((bottom[1] + top[1]) / 2),
            ];
            const radius = Math.abs(bottom[1] - Math.floor((bottom[1] + top[1]) / 2));
            const color = `rgb(${toolMetadata.segmentColor.slice(0, 3)})`;
            if (!viewport.getRenderingEngine()) {
                console.warn('Rendering Engine has been destroyed');
                return renderStatus;
            }
            const circleUID = '0';
            drawCircleSvg(svgDrawingHelper, annotationUID, circleUID, center, radius, {
                color,
            });
            renderStatus = true;
            return renderStatus;
        };
    }
}
SphereScissorsTool.toolName = 'SphereScissor';
export default SphereScissorsTool;
