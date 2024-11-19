import { AnnotationTool } from './base';
import { getEnabledElement, utilities as csUtils, eventTarget, Enums, getRenderingEngine, CONSTANTS, getEnabledElementByViewportId, } from '@cornerstonejs/core';
import { addAnnotation, getAllAnnotations, getAnnotations, removeAnnotation, } from '../stateManagement/annotation/annotationState';
import { isAnnotationLocked } from '../stateManagement/annotation/annotationLocking';
import { isAnnotationVisible } from '../stateManagement/annotation/annotationVisibility';
import { triggerAnnotationCompleted } from '../stateManagement/annotation/helpers/state';
import { drawCircle as drawCircleSvg, drawHandles as drawHandlesSvg, } from '../drawingSvg';
import { state } from '../store/state';
import { Events, MouseBindings, KeyboardBindings, Events as cstEvents, SegmentationRepresentations, ToolModes, } from '../enums';
import { getViewportIdsWithToolToRender } from '../utilities/viewportFilters';
import { resetElementCursor, hideElementCursor, } from '../cursors/elementCursor';
import triggerAnnotationRenderForViewportIds from '../utilities/triggerAnnotationRenderForViewportIds';
import { getCanvasCircleRadius } from '../utilities/math/circle';
import { vec2, vec3 } from 'gl-matrix';
import { getToolGroupForViewport } from '../store/ToolGroupManager';
import debounce from '../utilities/debounce';
import { distanceToPoint } from '../utilities/math/point';
import { addSegmentationRepresentations } from '../stateManagement/segmentation';
const MAGNIFY_CLASSNAME = 'advancedMagnifyTool';
const MAGNIFY_VIEWPORT_INITIAL_RADIUS = 125;
const { Events: csEvents } = Enums;
const isSegmentation = (actor) => actor.uid !== actor.referencedId;
var AdvancedMagnifyToolActions;
(function (AdvancedMagnifyToolActions) {
    AdvancedMagnifyToolActions["ShowZoomFactorsList"] = "showZoomFactorsList";
})(AdvancedMagnifyToolActions || (AdvancedMagnifyToolActions = {}));
const ADVANCED_MAGNIFY_TOOL_NAME = 'AdvancedMagnify';
const PARALLEL_THRESHOLD = 1 - CONSTANTS.EPSILON;
class AdvancedMagnifyTool extends AnnotationTool {
    static { this.Actions = AdvancedMagnifyToolActions; }
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            shadow: true,
            magnifyingGlass: {
                radius: 125,
                zoomFactor: 3,
                zoomFactorList: [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
                autoPan: {
                    enabled: true,
                    padding: 10,
                },
            },
            actions: {
                showZoomFactorsList: {
                    method: 'showZoomFactorsList',
                    bindings: [
                        {
                            mouseButton: MouseBindings.Secondary,
                            modifierKey: KeyboardBindings.Shift,
                        },
                    ],
                },
            },
        },
    }) {
        super(toolProps, defaultToolProps);
        this.addNewAnnotation = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const enabledElement = getEnabledElement(element);
            const { viewport, renderingEngine } = enabledElement;
            const worldPos = currentPoints.world;
            const canvasPos = currentPoints.canvas;
            const { magnifyingGlass: config } = this.configuration;
            const { radius, zoomFactor, autoPan } = config;
            const canvasHandlePoints = this._getCanvasHandlePoints(canvasPos, radius);
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const referencedImageId = this.getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp);
            const annotationUID = csUtils.uuidv4();
            const magnifyViewportId = csUtils.uuidv4();
            const FrameOfReferenceUID = viewport.getFrameOfReferenceUID();
            const annotation = {
                annotationUID,
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
                    sourceViewportId: viewport.id,
                    magnifyViewportId,
                    zoomFactor,
                    isCanvasAnnotation: true,
                    handles: {
                        points: canvasHandlePoints,
                        activeHandleIndex: null,
                    },
                },
            };
            this.magnifyViewportManager.createViewport(annotation, {
                magnifyViewportId,
                sourceEnabledElement: enabledElement,
                position: canvasPos,
                radius,
                zoomFactor,
                autoPan: {
                    enabled: autoPan.enabled,
                    padding: autoPan.padding,
                    callback: (data) => {
                        const annotationPoints = annotation.data.handles.points;
                        const { canvas: canvasDelta } = data.delta;
                        for (let i = 0, len = annotationPoints.length; i < len; i++) {
                            const point = annotationPoints[i];
                            point[0] += canvasDelta[0];
                            point[1] += canvasDelta[1];
                            annotation.invalidated = true;
                        }
                    },
                },
            });
            addAnnotation(annotation, element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            return annotation;
        };
        this.onSetToolDisabled = () => {
            this.magnifyViewportManager.dispose();
            const annotations = getAllAnnotations();
            annotations.forEach((annotation) => {
                if (annotation.metadata.toolName === this.getToolName()) {
                    removeAnnotation(annotation.annotationUID);
                }
            });
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const { data } = annotation;
            const { points } = data.handles;
            const canvasCoordinates = points;
            const canvasTop = canvasCoordinates[0];
            const canvasBottom = canvasCoordinates[2];
            const canvasLeft = canvasCoordinates[3];
            const radius = Math.abs(canvasBottom[1] - canvasTop[1]) * 0.5;
            const center = [
                canvasLeft[0] + radius,
                canvasTop[1] + radius,
            ];
            const radiusPoint = getCanvasCircleRadius([center, canvasCoords]);
            if (Math.abs(radiusPoint - radius) < proximity * 2) {
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
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            evt.preventDefault();
        };
        this.handleSelectedCallback = (evt, annotation, handle) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { data } = annotation;
            annotation.highlighted = true;
            const { points } = data.handles;
            const handleIndex = points.findIndex((p) => p === handle);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                handleIndex,
            };
            this._activateModify(element);
            hideElementCursor(element);
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            evt.preventDefault();
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation } = this.editData;
            const { data } = annotation;
            data.handles.activeHandleIndex = null;
            this._deactivateModify(element);
            resetElementCursor(element);
            this.editData = null;
            this.isDrawing = false;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            if (newAnnotation) {
                triggerAnnotationCompleted(annotation);
            }
        };
        this._dragDrawCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { deltaPoints } = eventDetail;
            const canvasDelta = deltaPoints?.canvas ?? [0, 0, 0];
            const { annotation, viewportIdsToRender } = this.editData;
            const { points } = annotation.data.handles;
            points.forEach((point) => {
                point[0] += canvasDelta[0];
                point[1] += canvasDelta[1];
            });
            annotation.invalidated = true;
            this.editData.hasMoved = true;
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this._dragModifyCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, handleIndex } = this.editData;
            const { data } = annotation;
            if (handleIndex === undefined) {
                const { deltaPoints } = eventDetail;
                const canvasDelta = deltaPoints.canvas;
                const points = data.handles.points;
                points.forEach((point) => {
                    point[0] += canvasDelta[0];
                    point[1] += canvasDelta[1];
                });
                annotation.invalidated = true;
            }
            else {
                this._dragHandle(evt);
                annotation.invalidated = true;
            }
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this._dragHandle = (evt) => {
            const eventDetail = evt.detail;
            const { annotation } = this.editData;
            const { data } = annotation;
            const { points } = data.handles;
            const canvasCoordinates = points;
            const canvasTop = canvasCoordinates[0];
            const canvasBottom = canvasCoordinates[2];
            const canvasLeft = canvasCoordinates[3];
            const radius = Math.abs(canvasBottom[1] - canvasTop[1]) * 0.5;
            const canvasCenter = [
                canvasLeft[0] + radius,
                canvasTop[1] + radius,
            ];
            const { currentPoints } = eventDetail;
            const currentCanvasPoints = currentPoints.canvas;
            const newRadius = getCanvasCircleRadius([
                canvasCenter,
                currentCanvasPoints,
            ]);
            const newCanvasHandlePoints = this._getCanvasHandlePoints(canvasCenter, newRadius);
            points[0] = newCanvasHandlePoints[0];
            points[1] = newCanvasHandlePoints[1];
            points[2] = newCanvasHandlePoints[2];
            points[3] = newCanvasHandlePoints[3];
        };
        this.cancel = (element) => {
            if (!this.isDrawing) {
                return;
            }
            this.isDrawing = false;
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
            return annotation.annotationUID;
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
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport } = enabledElement;
            const { element } = viewport;
            let annotations = getAnnotations(this.getToolName(), element);
            if (!annotations?.length) {
                return renderStatus;
            }
            annotations = annotations?.filter((annotation) => annotation.data.sourceViewportId ===
                viewport.id);
            const filteredAnnotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!filteredAnnotations?.length) {
                return renderStatus;
            }
            const styleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
            };
            for (let i = 0; i < filteredAnnotations.length; i++) {
                const annotation = filteredAnnotations[i];
                const { annotationUID, data } = annotation;
                const { magnifyViewportId, zoomFactor, handles } = data;
                const { points, activeHandleIndex } = handles;
                styleSpecifier.annotationUID = annotationUID;
                const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
                const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
                const color = this.getStyle('color', styleSpecifier, annotation);
                const canvasCoordinates = points;
                const canvasTop = canvasCoordinates[0];
                const canvasBottom = canvasCoordinates[2];
                const canvasLeft = canvasCoordinates[3];
                const radius = Math.abs(canvasBottom[1] - canvasTop[1]) * 0.5;
                const center = [
                    canvasLeft[0] + radius,
                    canvasTop[1] + radius,
                ];
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return renderStatus;
                }
                let activeHandleCanvasCoords;
                if (!isAnnotationVisible(annotationUID)) {
                    continue;
                }
                if (!isAnnotationLocked(annotationUID) &&
                    !this.editData &&
                    activeHandleIndex !== null) {
                    activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
                }
                if (activeHandleCanvasCoords) {
                    const handleGroupUID = '0';
                    drawHandlesSvg(svgDrawingHelper, annotationUID, handleGroupUID, activeHandleCanvasCoords, {
                        color,
                    });
                }
                const dataId = `${annotationUID}-advancedMagnify`;
                const circleUID = '0';
                drawCircleSvg(svgDrawingHelper, annotationUID, circleUID, center, radius, {
                    color,
                    lineWidth: 5,
                }, dataId);
                const magnifyViewport = this.magnifyViewportManager.getViewport(magnifyViewportId);
                magnifyViewport.position = center;
                magnifyViewport.radius = radius;
                magnifyViewport.zoomFactor = zoomFactor;
                magnifyViewport.update();
                renderStatus = true;
            }
            return renderStatus;
        };
        this._getCanvasHandlePoints = (canvasCenterPos, canvasRadius) => {
            return [
                [canvasCenterPos[0], canvasCenterPos[1] - canvasRadius, 0],
                [canvasCenterPos[0] + canvasRadius, canvasCenterPos[1], 0],
                [canvasCenterPos[0], canvasCenterPos[1] + canvasRadius, 0],
                [canvasCenterPos[0] - canvasRadius, canvasCenterPos[1], 0],
            ];
        };
        this.magnifyViewportManager = AdvancedMagnifyViewportManager.getInstance();
    }
    showZoomFactorsList(evt, annotation) {
        const { element, currentPoints } = evt.detail;
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const { canvas: canvasPoint } = currentPoints;
        const viewportElement = element.querySelector(':scope .viewport-element');
        const currentZoomFactor = annotation.data.zoomFactor;
        const remove = () => dropdown.parentElement.removeChild(dropdown);
        const dropdown = this._getZoomFactorsListDropdown(currentZoomFactor, (newZoomFactor) => {
            if (newZoomFactor !== undefined) {
                annotation.data.zoomFactor = Number.parseFloat(newZoomFactor);
                annotation.invalidated = true;
            }
            remove();
            viewport.render();
        });
        Object.assign(dropdown.style, {
            left: `${canvasPoint[0]}px`,
            top: `${canvasPoint[1]}px`,
        });
        viewportElement.appendChild(dropdown);
        dropdown.focus();
    }
    _getZoomFactorsListDropdown(currentZoomFactor, onChangeCallback) {
        const { zoomFactorList } = this.configuration.magnifyingGlass;
        const dropdown = document.createElement('select');
        dropdown.size = 5;
        Object.assign(dropdown.style, {
            width: '50px',
            position: 'absolute',
        });
        ['mousedown', 'mouseup', 'mousemove', 'click'].forEach((eventName) => {
            dropdown.addEventListener(eventName, (evt) => evt.stopPropagation());
        });
        dropdown.addEventListener('change', (evt) => {
            evt.stopPropagation();
            onChangeCallback(dropdown.value);
        });
        dropdown.addEventListener('keydown', (evt) => {
            const shouldCancel = (evt.keyCode ?? evt.which === 27) ||
                evt.key?.toLowerCase() === 'escape';
            if (shouldCancel) {
                evt.stopPropagation();
                onChangeCallback();
            }
        });
        zoomFactorList.forEach((zoomFactor) => {
            const option = document.createElement('option');
            option.label = zoomFactor;
            option.title = `Zoom factor ${zoomFactor.toFixed(1)}`;
            option.value = zoomFactor;
            option.defaultSelected = zoomFactor === currentZoomFactor;
            dropdown.add(option);
        });
        return dropdown;
    }
}
class AdvancedMagnifyViewportManager {
    constructor() {
        this.createViewport = (annotation, viewportInfo) => {
            const { magnifyViewportId, sourceEnabledElement, position, radius, zoomFactor, autoPan, } = viewportInfo;
            const { viewport: sourceViewport } = sourceEnabledElement;
            const { element: sourceElement } = sourceViewport;
            const magnifyViewport = new AdvancedMagnifyViewport({
                magnifyViewportId,
                sourceEnabledElement,
                radius,
                position,
                zoomFactor,
                autoPan,
            });
            this._addSourceElementEventListener(sourceElement);
            this._magnifyViewportsMap.set(magnifyViewport.viewportId, {
                annotation,
                magnifyViewport,
                magnifyViewportInfo: viewportInfo,
            });
            return magnifyViewport;
        };
        this._annotationRemovedCallback = (evt) => {
            const { annotation } = evt.detail;
            if (annotation.metadata.toolName !== ADVANCED_MAGNIFY_TOOL_NAME) {
                return;
            }
            this.destroyViewport(annotation.data.magnifyViewportId);
        };
        this._newStackImageCallback = (evt) => {
            const { viewportId: sourceViewportId, imageId } = evt.detail;
            const magnifyViewportsMapEntries = this._getMagnifyViewportsMapEntriesBySourceViewportId(sourceViewportId);
            const { viewport } = getEnabledElementByViewportId(sourceViewportId);
            if (viewport.stackActorReInitialized) {
                this._reset(sourceViewportId);
            }
            magnifyViewportsMapEntries.forEach(({ annotation }) => {
                annotation.metadata.referencedImageId = imageId;
                annotation.invalidated = true;
            });
        };
        this._newVolumeImageCallback = (evt) => {
            const { renderingEngineId, viewportId: sourceViewportId } = evt.detail;
            const renderingEngine = getRenderingEngine(renderingEngineId);
            const sourceViewport = renderingEngine.getViewport(sourceViewportId);
            const { viewPlaneNormal: currentViewPlaneNormal } = sourceViewport.getCamera();
            const magnifyViewportsMapEntries = this._getMagnifyViewportsMapEntriesBySourceViewportId(sourceViewportId);
            magnifyViewportsMapEntries.forEach(({ annotation }) => {
                const { viewPlaneNormal } = annotation.metadata;
                const isParallel = Math.abs(vec3.dot(viewPlaneNormal, currentViewPlaneNormal)) >
                    PARALLEL_THRESHOLD;
                if (!isParallel) {
                    return;
                }
                const { handles } = annotation.data;
                const worldImagePlanePoint = sourceViewport.canvasToWorld([0, 0]);
                const vecHandleToImagePlane = vec3.sub(vec3.create(), worldImagePlanePoint, handles.points[0]);
                const worldDist = vec3.dot(vecHandleToImagePlane, currentViewPlaneNormal);
                const worldDelta = vec3.scale(vec3.create(), currentViewPlaneNormal, worldDist);
                for (let i = 0, len = handles.points.length; i < len; i++) {
                    const point = handles.points[i];
                    point[0] += worldDelta[0];
                    point[1] += worldDelta[1];
                    point[2] += worldDelta[2];
                }
                annotation.invalidated = true;
            });
        };
        this._magnifyViewportsMap = new Map();
        this._initialize();
    }
    static getInstance() {
        AdvancedMagnifyViewportManager._singleton =
            AdvancedMagnifyViewportManager._singleton ??
                new AdvancedMagnifyViewportManager();
        return AdvancedMagnifyViewportManager._singleton;
    }
    getViewport(magnifyViewportId) {
        return this._magnifyViewportsMap.get(magnifyViewportId)?.magnifyViewport;
    }
    dispose() {
        this._removeEventListeners();
        this._destroyViewports();
    }
    destroyViewport(magnifyViewportId) {
        const magnifyViewportMapEntry = this._magnifyViewportsMap.get(magnifyViewportId);
        if (magnifyViewportMapEntry) {
            const { magnifyViewport } = magnifyViewportMapEntry;
            const { viewport: sourceViewport } = magnifyViewport.sourceEnabledElement;
            const { element: sourceElement } = sourceViewport;
            this._removeSourceElementEventListener(sourceElement);
            magnifyViewport.dispose();
            this._magnifyViewportsMap.delete(magnifyViewportId);
        }
    }
    _destroyViewports() {
        const magnifyViewportIds = Array.from(this._magnifyViewportsMap.keys());
        magnifyViewportIds.forEach((magnifyViewportId) => this.destroyViewport(magnifyViewportId));
    }
    _getMagnifyViewportsMapEntriesBySourceViewportId(sourceViewportId) {
        const magnifyViewportsMapEntries = Array.from(this._magnifyViewportsMap.values());
        return magnifyViewportsMapEntries.filter(({ magnifyViewport }) => {
            const { viewport } = magnifyViewport.sourceEnabledElement;
            return viewport.id === sourceViewportId;
        });
    }
    _reset(sourceViewportId) {
        const magnifyViewports = this._getMagnifyViewportsMapEntriesBySourceViewportId(sourceViewportId);
        magnifyViewports.forEach(({ magnifyViewport, annotation, magnifyViewportInfo }) => {
            this.destroyViewport(magnifyViewport.viewportId);
            const newEnabledElement = getEnabledElementByViewportId(sourceViewportId);
            this.createViewport(annotation, {
                ...magnifyViewportInfo,
                sourceEnabledElement: {
                    ...newEnabledElement,
                },
            });
        });
    }
    _addEventListeners() {
        eventTarget.addEventListener(cstEvents.ANNOTATION_REMOVED, this._annotationRemovedCallback);
    }
    _removeEventListeners() {
        eventTarget.removeEventListener(cstEvents.ANNOTATION_REMOVED, this._annotationRemovedCallback);
    }
    _addSourceElementEventListener(element) {
        element.addEventListener(csEvents.STACK_NEW_IMAGE, this._newStackImageCallback);
        const newStackHandler = (evt) => {
            const { viewportId: sourceViewportId } = evt.detail;
            this._reset(sourceViewportId);
        };
        element.addEventListener(csEvents.VIEWPORT_NEW_IMAGE_SET, newStackHandler);
        const newVolumeHandler = (evt) => {
            const { viewportId: sourceViewportId } = evt.detail;
            this._reset(sourceViewportId);
        };
        element.addEventListener(csEvents.VOLUME_VIEWPORT_NEW_VOLUME, newVolumeHandler);
        element.addEventListener(csEvents.VOLUME_NEW_IMAGE, this._newVolumeImageCallback);
        element.newStackHandler = newStackHandler;
        element.newVolumeHandler = newVolumeHandler;
    }
    _removeSourceElementEventListener(element) {
        element.removeEventListener(csEvents.STACK_NEW_IMAGE, this._newStackImageCallback);
        element.removeEventListener(csEvents.VOLUME_NEW_IMAGE, this._newVolumeImageCallback);
        element.removeEventListener(csEvents.VIEWPORT_NEW_IMAGE_SET, element.newStackHandler);
        element.removeEventListener(csEvents.VOLUME_VIEWPORT_NEW_VOLUME, element.newVolumeHandler);
        delete element.newStackHandler;
        delete element.newVolumeHandler;
    }
    _initialize() {
        this._addEventListeners();
    }
}
class AdvancedMagnifyViewport {
    constructor({ magnifyViewportId, sourceEnabledElement, radius = MAGNIFY_VIEWPORT_INITIAL_RADIUS, position = [0, 0], zoomFactor, autoPan, }) {
        this._enabledElement = null;
        this._sourceToolGroup = null;
        this._magnifyToolGroup = null;
        this._isViewportReady = false;
        this._radius = 0;
        this._resized = false;
        this._canAutoPan = false;
        this._viewportId = magnifyViewportId ?? csUtils.uuidv4();
        this._sourceEnabledElement = sourceEnabledElement;
        this._autoPan = autoPan;
        this.radius = radius;
        this.position = position;
        this.zoomFactor = zoomFactor;
        this.visible = true;
        this._browserMouseDownCallback = this._browserMouseDownCallback.bind(this);
        this._browserMouseUpCallback = this._browserMouseUpCallback.bind(this);
        this._handleToolModeChanged = this._handleToolModeChanged.bind(this);
        this._mouseDragCallback = this._mouseDragCallback.bind(this);
        this._resizeViewportAsync = (debounce(this._resizeViewport.bind(this), 1));
        this._initialize();
    }
    get sourceEnabledElement() {
        return this._sourceEnabledElement;
    }
    get viewportId() {
        return this._viewportId;
    }
    get radius() {
        return this._radius;
    }
    set radius(radius) {
        if (Math.abs(this._radius - radius) > 0.00001) {
            this._radius = radius;
            this._resized = true;
        }
    }
    update() {
        const { radius, position, visible } = this;
        const { viewport } = this._enabledElement;
        const { element } = viewport;
        const size = 2 * radius;
        const [x, y] = position;
        if (this._resized) {
            this._resizeViewportAsync();
            this._resized = false;
        }
        Object.assign(element.style, {
            display: visible ? 'block' : 'hidden',
            width: `${size}px`,
            height: `${size}px`,
            left: `${-radius}px`,
            top: `${-radius}px`,
            transform: `translate(${x}px, ${y}px)`,
        });
        if (this._isViewportReady) {
            this._syncViewports();
            viewport.render();
        }
    }
    dispose() {
        const { viewport } = this._enabledElement;
        const { element } = viewport;
        const renderingEngine = viewport.getRenderingEngine();
        this._removeEventListeners(element);
        renderingEngine.disableElement(viewport.id);
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }
    _handleToolModeChanged(evt) {
        const { _magnifyToolGroup: magnifyToolGroup } = this;
        const { toolGroupId, toolName, mode, toolBindingsOptions } = evt.detail;
        if (this._sourceToolGroup?.id !== toolGroupId) {
            return;
        }
        switch (mode) {
            case ToolModes.Active:
                magnifyToolGroup.setToolActive(toolName, toolBindingsOptions);
                break;
            case ToolModes.Passive:
                magnifyToolGroup.setToolPassive(toolName);
                break;
            case ToolModes.Enabled:
                magnifyToolGroup.setToolEnabled(toolName);
                break;
            case ToolModes.Disabled:
                magnifyToolGroup.setToolDisabled(toolName);
                break;
            default:
                throw new Error(`Unknow tool mode (${mode})`);
        }
    }
    _inheritBorderRadius(magnifyElement) {
        const viewport = magnifyElement.querySelector('.viewport-element');
        const canvas = magnifyElement.querySelector('.cornerstone-canvas');
        viewport.style.borderRadius = 'inherit';
        canvas.style.borderRadius = 'inherit';
    }
    _createViewportNode() {
        const magnifyElement = document.createElement('div');
        const { radius } = this;
        const size = radius * 2;
        magnifyElement.classList.add(MAGNIFY_CLASSNAME);
        Object.assign(magnifyElement.style, {
            display: 'block',
            width: `${size}px`,
            height: `${size}px`,
            position: 'absolute',
            overflow: 'hidden',
            borderRadius: '50%',
            boxSizing: 'border-box',
            left: `${-radius}px`,
            top: `${-radius}px`,
            transform: `translate(-1000px, -1000px)`,
        });
        return magnifyElement;
    }
    _convertZoomFactorToParallelScale(viewport, magnifyViewport, zoomFactor) {
        const { parallelScale } = viewport.getCamera();
        const canvasRatio = magnifyViewport.canvas.offsetWidth / viewport.canvas.offsetWidth;
        return parallelScale * (1 / zoomFactor) * canvasRatio;
    }
    _isStackViewport(viewport) {
        return 'setStack' in viewport;
    }
    _isVolumeViewport(viewport) {
        return 'addVolumes' in viewport;
    }
    _cloneToolGroups(sourceViewport, magnifyViewport) {
        const sourceActors = sourceViewport.getActors();
        const magnifyToolGroupId = `${magnifyViewport.id}-toolGroup`;
        const sourceToolGroup = getToolGroupForViewport(sourceViewport.id, sourceViewport.renderingEngineId);
        const magnifyToolGroup = sourceToolGroup.clone(magnifyToolGroupId, (toolName) => {
            const toolInstance = sourceToolGroup.getToolInstance(toolName);
            const isAnnotationTool = toolInstance instanceof AnnotationTool &&
                !(toolInstance instanceof AdvancedMagnifyTool);
            return isAnnotationTool;
        });
        magnifyToolGroup.addViewport(magnifyViewport.id, magnifyViewport.renderingEngineId);
        sourceActors.filter(isSegmentation).forEach((actor) => {
            addSegmentationRepresentations(this.viewportId, [
                {
                    segmentationId: actor.referencedId,
                    type: SegmentationRepresentations.Labelmap,
                },
            ]);
        });
        return { sourceToolGroup, magnifyToolGroup };
    }
    _cloneStack(sourceViewport, magnifyViewport) {
        const imageIds = sourceViewport.getImageIds();
        magnifyViewport.setStack(imageIds).then(() => {
            this._isViewportReady = true;
            this.update();
        });
    }
    _cloneVolumes(sourceViewport, magnifyViewport) {
        const actors = sourceViewport.getActors();
        const volumeInputArray = actors
            .filter((actor) => !isSegmentation(actor))
            .map((actor) => ({ volumeId: actor.uid }));
        magnifyViewport.setVolumes(volumeInputArray).then(() => {
            this._isViewportReady = true;
            this.update();
        });
        return magnifyViewport;
    }
    _cloneViewport(sourceViewport, magnifyElement) {
        const { viewportId: magnifyViewportId } = this;
        const renderingEngine = sourceViewport.getRenderingEngine();
        const { options: sourceViewportOptions } = sourceViewport;
        const viewportInput = {
            element: magnifyElement,
            viewportId: magnifyViewportId,
            type: sourceViewport.type,
            defaultOptions: { ...sourceViewportOptions },
        };
        renderingEngine.enableElement(viewportInput);
        const magnifyViewport = (renderingEngine.getViewport(magnifyViewportId));
        if (this._isStackViewport(sourceViewport)) {
            this._cloneStack(sourceViewport, magnifyViewport);
        }
        else if (this._isVolumeViewport(sourceViewport)) {
            this._cloneVolumes(sourceViewport, magnifyViewport);
        }
        this._inheritBorderRadius(magnifyElement);
        const toolGroups = this._cloneToolGroups(sourceViewport, magnifyViewport);
        this._sourceToolGroup = toolGroups.sourceToolGroup;
        this._magnifyToolGroup = toolGroups.magnifyToolGroup;
    }
    _cancelMouseEventCallback(evt) {
        evt.stopPropagation();
        evt.preventDefault();
    }
    _browserMouseUpCallback(evt) {
        const { element } = this._enabledElement.viewport;
        document.removeEventListener('mouseup', this._browserMouseUpCallback);
        element.addEventListener('mouseup', this._cancelMouseEventCallback);
        element.addEventListener('mousemove', this._cancelMouseEventCallback);
    }
    _browserMouseDownCallback(evt) {
        const { element } = this._enabledElement.viewport;
        this._canAutoPan = !!evt.target?.closest('.advancedMagnifyTool');
        document.addEventListener('mouseup', this._browserMouseUpCallback);
        element.removeEventListener('mouseup', this._cancelMouseEventCallback);
        element.removeEventListener('mousemove', this._cancelMouseEventCallback);
    }
    _mouseDragCallback(evt) {
        if (!state.isInteractingWithTool) {
            return;
        }
        const { _autoPan: autoPan } = this;
        if (!autoPan.enabled || !this._canAutoPan) {
            return;
        }
        const { currentPoints } = evt.detail;
        const { viewport } = this._enabledElement;
        const { canvasToWorld } = viewport;
        const { canvas: canvasCurrent } = currentPoints;
        const { radius: magnifyRadius } = this;
        const canvasCenter = [magnifyRadius, magnifyRadius];
        const dist = distanceToPoint(canvasCenter, canvasCurrent);
        const maxDist = magnifyRadius - autoPan.padding;
        if (dist <= maxDist) {
            return;
        }
        const panDist = dist - maxDist;
        const canvasDeltaPos = vec2.sub(vec2.create(), canvasCurrent, canvasCenter);
        vec2.normalize(canvasDeltaPos, canvasDeltaPos);
        vec2.scale(canvasDeltaPos, canvasDeltaPos, panDist);
        const newCanvasPosition = vec2.add(vec2.create(), this.position, canvasDeltaPos);
        const currentWorldPos = canvasToWorld(this.position);
        const newWorldPos = canvasToWorld(newCanvasPosition);
        const worldDeltaPos = vec3.sub(vec3.create(), newWorldPos, currentWorldPos);
        const autoPanCallbackData = {
            points: {
                currentPosition: {
                    canvas: this.position,
                    world: currentWorldPos,
                },
                newPosition: {
                    canvas: newCanvasPosition,
                    world: newWorldPos,
                },
            },
            delta: {
                canvas: canvasDeltaPos,
                world: worldDeltaPos,
            },
        };
        autoPan.callback(autoPanCallbackData);
    }
    _addBrowserEventListeners(element) {
        document.addEventListener('mousedown', this._browserMouseDownCallback, true);
        element.addEventListener('mousedown', this._cancelMouseEventCallback);
        element.addEventListener('mouseup', this._cancelMouseEventCallback);
        element.addEventListener('mousemove', this._cancelMouseEventCallback);
        element.addEventListener('dblclick', this._cancelMouseEventCallback);
    }
    _removeBrowserEventListeners(element) {
        document.removeEventListener('mousedown', this._browserMouseDownCallback, true);
        document.removeEventListener('mouseup', this._browserMouseUpCallback);
        element.removeEventListener('mousedown', this._cancelMouseEventCallback);
        element.removeEventListener('mouseup', this._cancelMouseEventCallback);
        element.removeEventListener('mousemove', this._cancelMouseEventCallback);
        element.removeEventListener('dblclick', this._cancelMouseEventCallback);
    }
    _addEventListeners(element) {
        eventTarget.addEventListener(cstEvents.TOOL_MODE_CHANGED, this._handleToolModeChanged);
        element.addEventListener(cstEvents.MOUSE_MOVE, this._mouseDragCallback);
        element.addEventListener(cstEvents.MOUSE_DRAG, this._mouseDragCallback);
        this._addBrowserEventListeners(element);
    }
    _removeEventListeners(element) {
        eventTarget.removeEventListener(cstEvents.TOOL_MODE_CHANGED, this._handleToolModeChanged);
        element.addEventListener(cstEvents.MOUSE_MOVE, this._mouseDragCallback);
        element.addEventListener(cstEvents.MOUSE_DRAG, this._mouseDragCallback);
        this._removeBrowserEventListeners(element);
    }
    _initialize() {
        const { _sourceEnabledElement: sourceEnabledElement } = this;
        const { viewport: sourceViewport } = sourceEnabledElement;
        const { canvas: sourceCanvas } = sourceViewport;
        const magnifyElement = this._createViewportNode();
        sourceCanvas.parentNode.appendChild(magnifyElement);
        this._addEventListeners(magnifyElement);
        this._cloneViewport(sourceViewport, magnifyElement);
        this._enabledElement = getEnabledElement(magnifyElement);
    }
    _syncViewportsCameras(sourceViewport, magnifyViewport) {
        const worldPos = sourceViewport.canvasToWorld(this.position);
        const parallelScale = this._convertZoomFactorToParallelScale(sourceViewport, magnifyViewport, this.zoomFactor);
        const { focalPoint, position, viewPlaneNormal } = magnifyViewport.getCamera();
        const distance = Math.sqrt(Math.pow(focalPoint[0] - position[0], 2) +
            Math.pow(focalPoint[1] - position[1], 2) +
            Math.pow(focalPoint[2] - position[2], 2));
        const updatedFocalPoint = [
            worldPos[0],
            worldPos[1],
            worldPos[2],
        ];
        const updatedPosition = [
            updatedFocalPoint[0] + distance * viewPlaneNormal[0],
            updatedFocalPoint[1] + distance * viewPlaneNormal[1],
            updatedFocalPoint[2] + distance * viewPlaneNormal[2],
        ];
        magnifyViewport.setCamera({
            parallelScale,
            focalPoint: updatedFocalPoint,
            position: updatedPosition,
        });
    }
    _syncStackViewports(sourceViewport, magnifyViewport) {
        magnifyViewport.setImageIdIndex(sourceViewport.getCurrentImageIdIndex());
    }
    _syncViewports() {
        const { viewport: sourceViewport } = this._sourceEnabledElement;
        const { viewport: magnifyViewport } = this._enabledElement;
        const sourceProperties = sourceViewport.getProperties();
        const imageData = magnifyViewport.getImageData();
        if (!imageData) {
            return;
        }
        magnifyViewport.setProperties(sourceProperties);
        this._syncViewportsCameras(sourceViewport, magnifyViewport);
        if (this._isStackViewport(sourceViewport)) {
            this._syncStackViewports(sourceViewport, magnifyViewport);
        }
        this._syncViewportsCameras(sourceViewport, magnifyViewport);
        magnifyViewport.render();
    }
    _resizeViewport() {
        const { viewport } = this._enabledElement;
        const renderingEngine = viewport.getRenderingEngine();
        renderingEngine.resize();
    }
}
AdvancedMagnifyTool.toolName = 'AdvancedMagnify';
export { AdvancedMagnifyTool as default };
