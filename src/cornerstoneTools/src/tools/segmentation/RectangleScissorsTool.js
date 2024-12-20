import { BaseVolumeViewport, cache, getEnabledElement, } from '@cornerstonejs/core';
import { BaseTool } from '../base';
import { fillInsideRectangle } from './strategies/fillRectangle';
import { eraseInsideRectangle } from './strategies/eraseRectangle';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import { Events, SegmentationRepresentations } from '../../enums';
import { drawRect as drawRectSvg } from '../../drawingSvg';
import { resetElementCursor, hideElementCursor, } from '../../cursors/elementCursor';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { config as segmentationConfig, segmentLocking, segmentIndex as segmentIndexController, activeSegmentation, } from '../../stateManagement/segmentation';
import { getCurrentLabelmapImageIdForViewport, getSegmentation, getStackSegmentationImageIdsForViewport, } from '../../stateManagement/segmentation/segmentationState';
class RectangleScissorsTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            strategies: {
                FILL_INSIDE: fillInsideRectangle,
                ERASE_INSIDE: eraseInsideRectangle,
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
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            this.isDrawing = true;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const activeLabelmapSegmentation = activeSegmentation.getActiveSegmentation(viewport.id);
            if (!activeLabelmapSegmentation) {
                throw new Error('No active segmentation detected, create one before using scissors tool');
            }
            const { segmentationId } = activeLabelmapSegmentation;
            const segmentIndex = segmentIndexController.getActiveSegmentIndex(segmentationId);
            const segmentsLocked = segmentLocking.getLockedSegmentIndices(segmentationId);
            const segmentColor = segmentationConfig.color.getSegmentIndexColor(viewport.id, segmentationId, segmentIndex);
            const { representationData } = getSegmentation(segmentationId);
            const labelmapData = representationData[SegmentationRepresentations.Labelmap];
            const annotation = {
                highlighted: true,
                invalidated: true,
                metadata: {
                    viewPlaneNormal: [...viewPlaneNormal],
                    viewUp: [...viewUp],
                    FrameOfReferenceUID: viewport.getFrameOfReferenceUID(),
                    referencedImageId: '',
                    toolName: this.getToolName(),
                    segmentColor,
                },
                data: {
                    handles: {
                        points: [
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                        ],
                        activeHandleIndex: null,
                    },
                },
            };
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                segmentIndex,
                segmentationId,
                segmentsLocked,
                segmentColor,
                viewportIdsToRender,
                handleIndex: 3,
                movingTextBox: false,
                newAnnotation: true,
                hasMoved: false,
                volumeId: null,
                referencedVolumeId: null,
                imageId: null,
            };
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
                const segmentationImageId = getCurrentLabelmapImageIdForViewport(viewport.id, segmentationId);
                this.editData = {
                    ...this.editData,
                    imageId: segmentationImageId,
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
            const { annotation, viewportIdsToRender, handleIndex } = this.editData;
            const { data } = annotation;
            const { currentPoints } = eventDetail;
            const enabledElement = getEnabledElement(element);
            const { worldToCanvas, canvasToWorld } = enabledElement.viewport;
            const worldPos = currentPoints.world;
            const { points } = data.handles;
            points[handleIndex] = [...worldPos];
            let bottomLeftCanvas;
            let bottomRightCanvas;
            let topLeftCanvas;
            let topRightCanvas;
            let bottomLeftWorld;
            let bottomRightWorld;
            let topLeftWorld;
            let topRightWorld;
            switch (handleIndex) {
                case 0:
                case 3:
                    bottomLeftCanvas = worldToCanvas(points[0]);
                    topRightCanvas = worldToCanvas(points[3]);
                    bottomRightCanvas = [topRightCanvas[0], bottomLeftCanvas[1]];
                    topLeftCanvas = [bottomLeftCanvas[0], topRightCanvas[1]];
                    bottomRightWorld = canvasToWorld(bottomRightCanvas);
                    topLeftWorld = canvasToWorld(topLeftCanvas);
                    points[1] = bottomRightWorld;
                    points[2] = topLeftWorld;
                    break;
                case 1:
                case 2:
                    bottomRightCanvas = worldToCanvas(points[1]);
                    topLeftCanvas = worldToCanvas(points[2]);
                    bottomLeftCanvas = [
                        topLeftCanvas[0],
                        bottomRightCanvas[1],
                    ];
                    topRightCanvas = [bottomRightCanvas[0], topLeftCanvas[1]];
                    bottomLeftWorld = canvasToWorld(bottomLeftCanvas);
                    topRightWorld = canvasToWorld(topRightCanvas);
                    points[0] = bottomLeftWorld;
                    points[3] = topRightWorld;
                    break;
            }
            annotation.invalidated = true;
            this.editData.hasMoved = true;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, newAnnotation, hasMoved } = this.editData;
            const { data } = annotation;
            if (newAnnotation && !hasMoved) {
                return;
            }
            data.handles.activeHandleIndex = null;
            this._deactivateDraw(element);
            resetElementCursor(element);
            const enabledElement = getEnabledElement(element);
            const operationData = {
                ...this.editData,
                points: data.handles.points,
            };
            this.editData = null;
            this.isDrawing = false;
            this.applyActiveStrategy(enabledElement, operationData);
        };
        this._activateDraw = (element) => {
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(Events.MOUSE_MOVE, this._dragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateDraw = (element) => {
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
            if (!this.editData) {
                return renderStatus;
            }
            const { viewport } = enabledElement;
            const { annotation } = this.editData;
            const toolMetadata = annotation.metadata;
            const annotationUID = annotation.annotationUID;
            const data = annotation.data;
            const { points } = data.handles;
            const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
            const color = `rgb(${toolMetadata.segmentColor.slice(0, 3)})`;
            if (!viewport.getRenderingEngine()) {
                console.warn('Rendering Engine has been destroyed');
                return renderStatus;
            }
            const rectangleUID = '0';
            drawRectSvg(svgDrawingHelper, annotationUID, rectangleUID, canvasCoordinates[0], canvasCoordinates[3], {
                color,
            });
            renderStatus = true;
            return renderStatus;
        };
    }
}
RectangleScissorsTool.toolName = 'RectangleScissor';
export default RectangleScissorsTool;
