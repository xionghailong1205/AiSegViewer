import { utilities as csUtils, cache, getEnabledElement, StackViewport, eventTarget, Enums, BaseVolumeViewport, volumeLoader, } from '@cornerstonejs/core';
import { vec3, vec2 } from 'gl-matrix';
import { BaseTool } from '../base';
import { fillInsideSphere, thresholdInsideSphere, } from './strategies/fillSphere';
import { eraseInsideSphere } from './strategies/eraseSphere';
import { thresholdInsideCircle, fillInsideCircle, } from './strategies/fillCircle';
import { eraseInsideCircle } from './strategies/eraseCircle';
import { Events, ToolModes, SegmentationRepresentations, StrategyCallbacks, } from '../../enums';
import { drawCircle as drawCircleSvg } from '../../drawingSvg';
import { resetElementCursor, hideElementCursor, } from '../../cursors/elementCursor';
import triggerAnnotationRenderForViewportUIDs from '../../utilities/triggerAnnotationRenderForViewportIds';
import { getCurrentLabelmapImageIdForViewport, getSegmentation, getStackSegmentationImageIdsForViewport, } from '../../stateManagement/segmentation/segmentationState';
import { getLockedSegmentIndices } from '../../stateManagement/segmentation/segmentLocking';
import { getActiveSegmentIndex } from '../../stateManagement/segmentation/getActiveSegmentIndex';
import { getSegmentIndexColor } from '../../stateManagement/segmentation/config/segmentationColor';
import { getActiveSegmentation } from '../../stateManagement/segmentation/getActiveSegmentation';
class BrushTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            strategies: {
                FILL_INSIDE_CIRCLE: fillInsideCircle,
                ERASE_INSIDE_CIRCLE: eraseInsideCircle,
                FILL_INSIDE_SPHERE: fillInsideSphere,
                ERASE_INSIDE_SPHERE: eraseInsideSphere,
                THRESHOLD_INSIDE_CIRCLE: thresholdInsideCircle,
                THRESHOLD_INSIDE_SPHERE: thresholdInsideSphere,
            },
            strategySpecificConfiguration: {
                THRESHOLD: {
                    threshold: [-150, -70],
                },
            },
            defaultStrategy: 'FILL_INSIDE_CIRCLE',
            activeStrategy: 'FILL_INSIDE_CIRCLE',
            thresholdVolumeId: null,
            brushSize: 25,
            preview: {
                enabled: false,
                previewColors: {},
                previewTimeMs: 250,
                previewMoveDistance: 8,
                dragMoveDistance: 4,
                dragTimeMs: 500,
            },
            actions: {
                [StrategyCallbacks.AcceptPreview]: {
                    method: StrategyCallbacks.AcceptPreview,
                    bindings: [
                        {
                            key: 'Enter',
                        },
                    ],
                },
                [StrategyCallbacks.RejectPreview]: {
                    method: StrategyCallbacks.RejectPreview,
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
        this._previewData = {
            preview: null,
            element: null,
            timerStart: 0,
            timer: null,
            startPoint: [NaN, NaN],
            isDrag: false,
        };
        this.onSetToolPassive = (evt) => {
            this.disableCursor();
        };
        this.onSetToolEnabled = () => {
            this.disableCursor();
        };
        this.onSetToolDisabled = (evt) => {
            this.disableCursor();
        };
        this.preMouseDownCallback = (evt) => {
            const eventData = evt.detail;
            const { element } = eventData;
            const enabledElement = getEnabledElement(element);
            this._editData = this.createEditData(element);
            this._activateDraw(element);
            hideElementCursor(element);
            evt.preventDefault();
            this._previewData.isDrag = false;
            this._previewData.timerStart = Date.now();
            const hoverData = this._hoverData || this.createHoverData(element);
            triggerAnnotationRenderForViewportUIDs(hoverData.viewportIdsToRender);
            const operationData = this.getOperationData(element);
            this.applyActiveStrategyCallback(enabledElement, operationData, StrategyCallbacks.OnInteractionStart);
            return true;
        };
        this.mouseMoveCallback = (evt) => {
            if (this.mode === ToolModes.Active) {
                this.updateCursor(evt);
                if (!this.configuration.preview.enabled) {
                    return;
                }
                const { previewTimeMs, previewMoveDistance, dragMoveDistance } = this.configuration.preview;
                const { currentPoints, element } = evt.detail;
                const { canvas } = currentPoints;
                const { preview, startPoint, timer, timerStart, isDrag } = this._previewData;
                const delta = vec2.distance(canvas, startPoint);
                const time = Date.now() - timerStart;
                if (delta > previewMoveDistance ||
                    (time > previewTimeMs && delta > dragMoveDistance)) {
                    if (timer) {
                        window.clearTimeout(timer);
                        this._previewData.timer = null;
                    }
                    if (preview && !isDrag) {
                        this.rejectPreview(element);
                    }
                }
                if (!this._previewData.timer) {
                    const timer = window.setTimeout(this.previewCallback, 250);
                    Object.assign(this._previewData, {
                        timerStart: Date.now(),
                        timer,
                        startPoint: canvas,
                        element,
                    });
                }
            }
        };
        this.previewCallback = () => {
            this._previewData.timer = null;
            if (this._previewData.preview) {
                return;
            }
            this._previewData.preview = this.applyActiveStrategyCallback(getEnabledElement(this._previewData.element), this.getOperationData(this._previewData.element), StrategyCallbacks.Preview);
        };
        this._dragCallback = (evt) => {
            const eventData = evt.detail;
            const { element, currentPoints } = eventData;
            const enabledElement = getEnabledElement(element);
            this.updateCursor(evt);
            const { viewportIdsToRender } = this._hoverData;
            triggerAnnotationRenderForViewportUIDs(viewportIdsToRender);
            const delta = vec2.distance(currentPoints.canvas, this._previewData.startPoint);
            const { dragTimeMs, dragMoveDistance } = this.configuration.preview;
            if (!this._previewData.isDrag &&
                this._previewData.preview &&
                Date.now() - this._previewData.timerStart < dragTimeMs &&
                delta < dragMoveDistance) {
                return;
            }
            this._previewData.preview = this.applyActiveStrategy(enabledElement, this.getOperationData(element));
            this._previewData.element = element;
            this._previewData.timerStart = Date.now() + dragTimeMs;
            this._previewData.isDrag = true;
            this._previewData.startPoint = currentPoints.canvas;
        };
        this._endCallback = (evt) => {
            const eventData = evt.detail;
            const { element } = eventData;
            const enabledElement = getEnabledElement(element);
            const operationData = this.getOperationData(element);
            if (!this._previewData.preview && !this._previewData.isDrag) {
                this.applyActiveStrategy(enabledElement, operationData);
            }
            this._deactivateDraw(element);
            resetElementCursor(element);
            this.updateCursor(evt);
            this._editData = null;
            this.applyActiveStrategyCallback(enabledElement, operationData, StrategyCallbacks.OnInteractionEnd);
            if (!this._previewData.isDrag) {
                this.acceptPreview(element);
            }
        };
        this._activateDraw = (element) => {
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
        };
        this._deactivateDraw = (element) => {
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
        };
    }
    disableCursor() {
        this._hoverData = undefined;
        this.rejectPreview();
    }
    createEditData(element) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const activeSegmentation = getActiveSegmentation(viewport.id);
        if (!activeSegmentation) {
            const event = new CustomEvent(Enums.Events.ERROR_EVENT, {
                detail: {
                    type: 'Segmentation',
                    message: 'No active segmentation detected, create a segmentation representation before using the brush tool',
                },
                cancelable: true,
            });
            eventTarget.dispatchEvent(event);
            return null;
        }
        const { segmentationId } = activeSegmentation;
        const segmentsLocked = getLockedSegmentIndices(segmentationId);
        const { representationData } = getSegmentation(segmentationId);
        if (viewport instanceof BaseVolumeViewport) {
            const { volumeId } = representationData[SegmentationRepresentations.Labelmap];
            const actors = viewport.getActors();
            const isStackViewport = viewport instanceof StackViewport;
            if (isStackViewport) {
                const event = new CustomEvent(Enums.Events.ERROR_EVENT, {
                    detail: {
                        type: 'Segmentation',
                        message: 'Cannot perform brush operation on the selected viewport',
                    },
                    cancelable: true,
                });
                eventTarget.dispatchEvent(event);
                return null;
            }
            const volumes = actors.map((actorEntry) => cache.getVolume(actorEntry.referencedId));
            const segmentationVolume = cache.getVolume(volumeId);
            const referencedVolumeIdToThreshold = volumes.find((volume) => csUtils.isEqual(volume.dimensions, segmentationVolume.dimensions))?.volumeId || volumes[0]?.volumeId;
            return {
                volumeId,
                referencedVolumeId: this.configuration.thresholdVolumeId ?? referencedVolumeIdToThreshold,
                segmentsLocked,
            };
        }
        else {
            const segmentationImageId = getCurrentLabelmapImageIdForViewport(viewport.id, segmentationId);
            if (!segmentationImageId) {
                return;
            }
            if (this.configuration.activeStrategy.includes('SPHERE')) {
                const referencedImageIds = viewport.getImageIds();
                const isValidVolumeForSphere = csUtils.isValidVolume(referencedImageIds);
                if (!isValidVolumeForSphere) {
                    throw new Error('Volume is not reconstructable for sphere manipulation');
                }
                const volumeId = `${segmentationId}_${viewport.id}`;
                const volume = cache.getVolume(volumeId);
                if (volume) {
                    return {
                        imageId: segmentationImageId,
                        segmentsLocked,
                        override: {
                            voxelManager: volume.voxelManager,
                            imageData: volume.imageData,
                        },
                    };
                }
                else {
                    const labelmapImageIds = getStackSegmentationImageIdsForViewport(viewport.id, segmentationId);
                    if (!labelmapImageIds || labelmapImageIds.length === 1) {
                        return {
                            imageId: segmentationImageId,
                            segmentsLocked,
                        };
                    }
                    const volume = volumeLoader.createAndCacheVolumeFromImagesSync(volumeId, labelmapImageIds);
                    return {
                        imageId: segmentationImageId,
                        segmentsLocked,
                        override: {
                            voxelManager: volume.voxelManager,
                            imageData: volume.imageData,
                        },
                    };
                }
            }
            else {
                return {
                    imageId: segmentationImageId,
                    segmentsLocked,
                };
            }
        }
    }
    createHoverData(element, centerCanvas) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const camera = viewport.getCamera();
        const { viewPlaneNormal, viewUp } = camera;
        const viewportIdsToRender = [viewport.id];
        const { segmentIndex, segmentationId, segmentColor } = this.getActiveSegmentationData(viewport) || {};
        const brushCursor = {
            metadata: {
                viewPlaneNormal: [...viewPlaneNormal],
                viewUp: [...viewUp],
                FrameOfReferenceUID: viewport.getFrameOfReferenceUID(),
                referencedImageId: '',
                toolName: this.getToolName(),
                segmentColor,
            },
            data: {},
        };
        return {
            brushCursor,
            centerCanvas,
            segmentIndex,
            viewport,
            segmentationId,
            segmentColor,
            viewportIdsToRender,
        };
    }
    getActiveSegmentationData(viewport) {
        const viewportId = viewport.id;
        const activeRepresentation = getActiveSegmentation(viewportId);
        if (!activeRepresentation) {
            return;
        }
        const { segmentationId } = activeRepresentation;
        const segmentIndex = getActiveSegmentIndex(segmentationId);
        if (!segmentIndex) {
            return;
        }
        const segmentColor = getSegmentIndexColor(viewportId, segmentationId, segmentIndex);
        return {
            segmentIndex,
            segmentationId,
            segmentColor,
        };
    }
    updateCursor(evt) {
        const eventData = evt.detail;
        const { element } = eventData;
        const { currentPoints } = eventData;
        const centerCanvas = currentPoints.canvas;
        this._hoverData = this.createHoverData(element, centerCanvas);
        this._calculateCursor(element, centerCanvas);
        if (!this._hoverData) {
            return;
        }
        triggerAnnotationRenderForViewportUIDs(this._hoverData.viewportIdsToRender);
    }
    getOperationData(element) {
        const editData = this._editData || this.createEditData(element);
        const { segmentIndex, segmentationId, brushCursor } = this._hoverData || this.createHoverData(element);
        const { data, metadata = {} } = brushCursor || {};
        const { viewPlaneNormal, viewUp } = metadata;
        const operationData = {
            ...editData,
            points: data?.handles?.points,
            segmentIndex,
            previewColors: this.configuration.preview.enabled
                ? this.configuration.preview.previewColors
                : null,
            viewPlaneNormal,
            toolGroupId: this.toolGroupId,
            segmentationId,
            viewUp,
            strategySpecificConfiguration: this.configuration.strategySpecificConfiguration,
            preview: this._previewData?.preview,
        };
        return operationData;
    }
    _calculateCursor(element, centerCanvas) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const { canvasToWorld } = viewport;
        const camera = viewport.getCamera();
        const { brushSize } = this.configuration;
        const viewUp = vec3.fromValues(camera.viewUp[0], camera.viewUp[1], camera.viewUp[2]);
        const viewPlaneNormal = vec3.fromValues(camera.viewPlaneNormal[0], camera.viewPlaneNormal[1], camera.viewPlaneNormal[2]);
        const viewRight = vec3.create();
        vec3.cross(viewRight, viewUp, viewPlaneNormal);
        const centerCursorInWorld = canvasToWorld([
            centerCanvas[0],
            centerCanvas[1],
        ]);
        const bottomCursorInWorld = vec3.create();
        const topCursorInWorld = vec3.create();
        const leftCursorInWorld = vec3.create();
        const rightCursorInWorld = vec3.create();
        for (let i = 0; i <= 2; i++) {
            bottomCursorInWorld[i] = centerCursorInWorld[i] - viewUp[i] * brushSize;
            topCursorInWorld[i] = centerCursorInWorld[i] + viewUp[i] * brushSize;
            leftCursorInWorld[i] = centerCursorInWorld[i] - viewRight[i] * brushSize;
            rightCursorInWorld[i] = centerCursorInWorld[i] + viewRight[i] * brushSize;
        }
        if (!this._hoverData) {
            return;
        }
        const { brushCursor } = this._hoverData;
        const { data } = brushCursor;
        if (data.handles === undefined) {
            data.handles = {};
        }
        data.handles.points = [
            bottomCursorInWorld,
            topCursorInWorld,
            leftCursorInWorld,
            rightCursorInWorld,
        ];
        const activeStrategy = this.configuration.activeStrategy;
        const strategy = this.configuration.strategies[activeStrategy];
        if (typeof strategy.computeInnerCircleRadius === 'function') {
            strategy.computeInnerCircleRadius({
                configuration: this.configuration,
                viewport,
            });
        }
        data.invalidated = false;
    }
    rejectPreview(element = this._previewData.element) {
        if (!element || !this._previewData.preview) {
            return;
        }
        const enabledElement = getEnabledElement(element);
        this.applyActiveStrategyCallback(enabledElement, this.getOperationData(element), StrategyCallbacks.RejectPreview);
        this._previewData.preview = null;
        this._previewData.isDrag = false;
    }
    acceptPreview(element = this._previewData.element) {
        if (!element) {
            return;
        }
        const enabledElement = getEnabledElement(element);
        this.applyActiveStrategyCallback(enabledElement, this.getOperationData(element), StrategyCallbacks.AcceptPreview);
        this._previewData.isDrag = false;
        this._previewData.preview = null;
    }
    invalidateBrushCursor() {
        if (this._hoverData === undefined) {
            return;
        }
        const { data } = this._hoverData.brushCursor;
        const { viewport } = this._hoverData;
        data.invalidated = true;
        const { segmentColor } = this.getActiveSegmentationData(viewport) || {};
        this._hoverData.brushCursor.metadata.segmentColor = segmentColor;
    }
    renderAnnotation(enabledElement, svgDrawingHelper) {
        if (!this._hoverData) {
            return;
        }
        const { viewport } = enabledElement;
        const viewportIdsToRender = this._hoverData.viewportIdsToRender;
        if (!viewportIdsToRender.includes(viewport.id)) {
            return;
        }
        const brushCursor = this._hoverData.brushCursor;
        if (brushCursor.data.invalidated === true) {
            const { centerCanvas } = this._hoverData;
            const { element } = viewport;
            this._calculateCursor(element, centerCanvas);
        }
        const toolMetadata = brushCursor.metadata;
        if (!toolMetadata) {
            return;
        }
        const annotationUID = toolMetadata.brushCursorUID;
        const data = brushCursor.data;
        const { points } = data.handles;
        const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
        const bottom = canvasCoordinates[0];
        const top = canvasCoordinates[1];
        const center = [
            Math.floor((bottom[0] + top[0]) / 2),
            Math.floor((bottom[1] + top[1]) / 2),
        ];
        const radius = Math.abs(bottom[1] - Math.floor((bottom[1] + top[1]) / 2));
        const color = `rgb(${toolMetadata.segmentColor?.slice(0, 3) || [0, 0, 0]})`;
        if (!viewport.getRenderingEngine()) {
            console.warn('Rendering Engine has been destroyed');
            return;
        }
        const circleUID = '0';
        drawCircleSvg(svgDrawingHelper, annotationUID, circleUID, center, radius, {
            color,
        });
        const activeStrategy = this.configuration.activeStrategy;
        const { dynamicRadiusInCanvas } = this.configuration
            .strategySpecificConfiguration[activeStrategy] || {
            dynamicRadiusInCanvas: 0,
        };
        if (dynamicRadiusInCanvas) {
            const circleUID1 = '1';
            drawCircleSvg(svgDrawingHelper, annotationUID, circleUID1, center, dynamicRadiusInCanvas, {
                color,
            });
        }
    }
}
BrushTool.toolName = 'Brush';
export default BrushTool;
