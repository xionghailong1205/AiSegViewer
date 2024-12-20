import { vec2, vec3 } from 'gl-matrix';
import vtkMath from '@kitware/vtk.js/Common/Core/Math';
import vtkMatrixBuilder from '@kitware/vtk.js/Common/Core/MatrixBuilder';
import { AnnotationTool } from './base';
import { getEnabledElementByIds, getEnabledElement, utilities as csUtils, Enums, CONSTANTS, } from '@cornerstonejs/core';
import { getToolGroup, getToolGroupForViewport, } from '../store/ToolGroupManager';
import { addAnnotation, getAnnotations, removeAnnotation, } from '../stateManagement/annotation/annotationState';
import { drawCircle as drawCircleSvg, drawHandles as drawHandlesSvg, drawLine as drawLineSvg, } from '../drawingSvg';
import { state } from '../store/state';
import { Events } from '../enums';
import { getViewportIdsWithToolToRender } from '../utilities/viewportFilters';
import { resetElementCursor, hideElementCursor, } from '../cursors/elementCursor';
import liangBarksyClip from '../utilities/math/vec2/liangBarksyClip';
import * as lineSegment from '../utilities/math/line';
import { isAnnotationLocked } from '../stateManagement/annotation/annotationLocking';
import triggerAnnotationRenderForViewportIds from '../utilities/triggerAnnotationRenderForViewportIds';
const { RENDERING_DEFAULTS } = CONSTANTS;
function defaultReferenceLineColor() {
    return 'rgb(0, 200, 0)';
}
function defaultReferenceLineControllable() {
    return true;
}
function defaultReferenceLineDraggableRotatable() {
    return true;
}
function defaultReferenceLineSlabThicknessControlsOn() {
    return true;
}
const OPERATION = {
    DRAG: 1,
    ROTATE: 2,
    SLAB: 3,
};
const EPSILON = 1e-3;
class CrosshairsTool extends AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse'],
        configuration: {
            shadow: true,
            viewportIndicators: false,
            viewportIndicatorsConfig: {
                radius: 5,
                x: null,
                y: null,
            },
            autoPan: {
                enabled: false,
                panSize: 10,
            },
            referenceLinesCenterGapRadius: 20,
            filterActorUIDsToSetSlabThickness: [],
            slabThicknessBlendMode: Enums.BlendModes.MAXIMUM_INTENSITY_BLEND,
            mobile: {
                enabled: false,
                opacity: 0.8,
                handleRadius: 9,
            },
        },
    }) {
        super(toolProps, defaultToolProps);
        this.toolCenter = [0, 0, 0];
        this.initializeViewport = ({ renderingEngineId, viewportId, }) => {
            const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
            const { FrameOfReferenceUID, viewport } = enabledElement;
            const { element } = viewport;
            const { position, focalPoint, viewPlaneNormal } = viewport.getCamera();
            let annotations = this._getAnnotations(enabledElement);
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (annotations.length) {
                removeAnnotation(annotations[0].annotationUID);
            }
            const annotation = {
                highlighted: false,
                metadata: {
                    cameraPosition: [...position],
                    cameraFocalPoint: [...focalPoint],
                    FrameOfReferenceUID,
                    toolName: this.getToolName(),
                },
                data: {
                    handles: {
                        rotationPoints: [],
                        slabThicknessPoints: [],
                        toolCenter: this.toolCenter,
                    },
                    activeOperation: null,
                    activeViewportIds: [],
                    viewportId,
                },
            };
            addAnnotation(annotation, element);
            return {
                normal: viewPlaneNormal,
                point: viewport.canvasToWorld([
                    viewport.canvas.clientWidth / 2,
                    viewport.canvas.clientHeight / 2,
                ]),
            };
        };
        this._getViewportsInfo = () => {
            const viewports = getToolGroup(this.toolGroupId).viewportsInfo;
            return viewports;
        };
        this.resetCrosshairs = () => {
            const viewportsInfo = this._getViewportsInfo();
            for (const viewportInfo of viewportsInfo) {
                const { viewportId, renderingEngineId } = viewportInfo;
                const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
                const viewport = enabledElement.viewport;
                const resetPan = true;
                const resetZoom = true;
                const resetToCenter = true;
                const resetRotation = true;
                const suppressEvents = true;
                viewport.resetCamera({
                    resetPan,
                    resetZoom,
                    resetToCenter,
                    resetRotation,
                    suppressEvents,
                });
                viewport.resetSlabThickness();
                const { element } = viewport;
                let annotations = this._getAnnotations(enabledElement);
                annotations = this.filterInteractableAnnotationsForElement(element, annotations);
                if (annotations.length) {
                    removeAnnotation(annotations[0].annotationUID);
                }
                viewport.render();
            }
            this.computeToolCenter(viewportsInfo);
        };
        this.computeToolCenter = (viewportsInfo) => {
            if (!viewportsInfo.length || viewportsInfo.length === 1) {
                console.warn('For crosshairs to operate, at least two viewports must be given.');
                return;
            }
            const [firstViewport, secondViewport, thirdViewport] = viewportsInfo;
            const { normal: normal1, point: point1 } = this.initializeViewport(firstViewport);
            const { normal: normal2, point: point2 } = this.initializeViewport(secondViewport);
            let normal3 = [0, 0, 0];
            let point3 = vec3.create();
            if (thirdViewport) {
                ({ normal: normal3, point: point3 } =
                    this.initializeViewport(thirdViewport));
            }
            else {
                vec3.add(point3, point1, point2);
                vec3.scale(point3, point3, 0.5);
                vec3.cross(normal3, normal1, normal2);
            }
            const firstPlane = csUtils.planar.planeEquation(normal1, point1);
            const secondPlane = csUtils.planar.planeEquation(normal2, point2);
            const thirdPlane = csUtils.planar.planeEquation(normal3, point3);
            this.toolCenter = csUtils.planar.threePlaneIntersection(firstPlane, secondPlane, thirdPlane);
            triggerAnnotationRenderForViewportIds(viewportsInfo.map(({ viewportId }) => viewportId));
        };
        this.addNewAnnotation = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { currentPoints } = eventDetail;
            const jumpWorld = currentPoints.world;
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            this._jump(enabledElement, jumpWorld);
            const annotations = this._getAnnotations(enabledElement);
            const filteredAnnotations = this.filterInteractableAnnotationsForElement(viewport.element, annotations);
            const { data } = filteredAnnotations[0];
            const { rotationPoints } = data.handles;
            const viewportIdArray = [];
            for (let i = 0; i < rotationPoints.length - 1; ++i) {
                const otherViewport = rotationPoints[i][1];
                const viewportControllable = this._getReferenceLineControllable(otherViewport.id);
                const viewportDraggableRotatable = this._getReferenceLineDraggableRotatable(otherViewport.id);
                if (!viewportControllable || !viewportDraggableRotatable) {
                    continue;
                }
                viewportIdArray.push(otherViewport.id);
                i++;
            }
            data.activeViewportIds = [...viewportIdArray];
            data.handles.activeOperation = OPERATION.DRAG;
            evt.preventDefault();
            hideElementCursor(element);
            this._activateModify(element);
            return filteredAnnotations[0];
        };
        this.cancel = () => {
            console.log('Not implemented yet');
        };
        this.handleSelectedCallback = (evt, annotation) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            annotation.highlighted = true;
            this._activateModify(element);
            hideElementCursor(element);
            evt.preventDefault();
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            if (this._pointNearTool(element, annotation, canvasCoords, 6)) {
                return true;
            }
            return false;
        };
        this.toolSelectedCallback = (evt, annotation, interactionType) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            annotation.highlighted = true;
            this._activateModify(element);
            hideElementCursor(element);
            evt.preventDefault();
        };
        this.onCameraModified = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            const viewport = enabledElement.viewport;
            const annotations = this._getAnnotations(enabledElement);
            const filteredToolAnnotations = this.filterInteractableAnnotationsForElement(element, annotations);
            const viewportAnnotation = filteredToolAnnotations[0];
            if (!viewportAnnotation) {
                return;
            }
            const currentCamera = viewport.getCamera();
            const oldCameraPosition = viewportAnnotation.metadata.cameraPosition;
            const deltaCameraPosition = [0, 0, 0];
            vtkMath.subtract(currentCamera.position, oldCameraPosition, deltaCameraPosition);
            const oldCameraFocalPoint = viewportAnnotation.metadata.cameraFocalPoint;
            const deltaCameraFocalPoint = [0, 0, 0];
            vtkMath.subtract(currentCamera.focalPoint, oldCameraFocalPoint, deltaCameraFocalPoint);
            viewportAnnotation.metadata.cameraPosition = [...currentCamera.position];
            viewportAnnotation.metadata.cameraFocalPoint = [
                ...currentCamera.focalPoint,
            ];
            const viewportControllable = this._getReferenceLineControllable(viewport.id);
            const viewportDraggableRotatable = this._getReferenceLineDraggableRotatable(viewport.id);
            if (!csUtils.isEqual(currentCamera.position, oldCameraPosition, 1e-3) &&
                viewportControllable &&
                viewportDraggableRotatable) {
                let isRotation = false;
                const cameraModifiedSameForPosAndFocalPoint = csUtils.isEqual(deltaCameraPosition, deltaCameraFocalPoint, 1e-3);
                if (!cameraModifiedSameForPosAndFocalPoint) {
                    isRotation = true;
                }
                const cameraModifiedInPlane = Math.abs(vtkMath.dot(deltaCameraPosition, currentCamera.viewPlaneNormal)) < 1e-2;
                if (!isRotation && !cameraModifiedInPlane) {
                    this.toolCenter[0] += deltaCameraPosition[0];
                    this.toolCenter[1] += deltaCameraPosition[1];
                    this.toolCenter[2] += deltaCameraPosition[2];
                }
            }
            if (this.configuration.autoPan?.enabled) {
                const toolGroup = getToolGroupForViewport(viewport.id, renderingEngine.id);
                const otherViewportIds = toolGroup
                    .getViewportIds()
                    .filter((id) => id !== viewport.id);
                otherViewportIds.forEach((viewportId) => {
                    this._autoPanViewportIfNecessary(viewportId, renderingEngine);
                });
            }
            const requireSameOrientation = false;
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName(), requireSameOrientation);
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this.onResetCamera = (evt) => {
            this.resetCrosshairs();
        };
        this.mouseMoveCallback = (evt, filteredToolAnnotations) => {
            const { element, currentPoints } = evt.detail;
            const canvasCoords = currentPoints.canvas;
            let imageNeedsUpdate = false;
            for (let i = 0; i < filteredToolAnnotations.length; i++) {
                const annotation = filteredToolAnnotations[i];
                if (isAnnotationLocked(annotation.annotationUID)) {
                    continue;
                }
                const { data, highlighted } = annotation;
                if (!data.handles) {
                    continue;
                }
                const previousActiveOperation = data.handles.activeOperation;
                const previousActiveViewportIds = data.activeViewportIds && data.activeViewportIds.length > 0
                    ? [...data.activeViewportIds]
                    : [];
                data.activeViewportIds = [];
                data.handles.activeOperation = null;
                const handleNearImagePoint = this.getHandleNearImagePoint(element, annotation, canvasCoords, 6);
                let near = false;
                if (handleNearImagePoint) {
                    near = true;
                }
                else {
                    near = this._pointNearTool(element, annotation, canvasCoords, 6);
                }
                const nearToolAndNotMarkedActive = near && !highlighted;
                const notNearToolAndMarkedActive = !near && highlighted;
                if (nearToolAndNotMarkedActive || notNearToolAndMarkedActive) {
                    annotation.highlighted = !highlighted;
                    imageNeedsUpdate = true;
                }
                else if (data.handles.activeOperation !== previousActiveOperation ||
                    !this._areViewportIdArraysEqual(data.activeViewportIds, previousActiveViewportIds)) {
                    imageNeedsUpdate = true;
                }
            }
            return imageNeedsUpdate;
        };
        this.filterInteractableAnnotationsForElement = (element, annotations) => {
            if (!annotations || !annotations.length) {
                return [];
            }
            const enabledElement = getEnabledElement(element);
            const { viewportId } = enabledElement;
            const viewportUIDSpecificCrosshairs = annotations.filter((annotation) => annotation.data.viewportId === viewportId);
            return viewportUIDSpecificCrosshairs;
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport, renderingEngine } = enabledElement;
            const { element } = viewport;
            const annotations = this._getAnnotations(enabledElement);
            const camera = viewport.getCamera();
            const filteredToolAnnotations = this.filterInteractableAnnotationsForElement(element, annotations);
            const viewportAnnotation = filteredToolAnnotations[0];
            if (!annotations?.length || !viewportAnnotation?.data) {
                return renderStatus;
            }
            const annotationUID = viewportAnnotation.annotationUID;
            const { clientWidth, clientHeight } = viewport.canvas;
            const canvasDiagonalLength = Math.sqrt(clientWidth * clientWidth + clientHeight * clientHeight);
            const canvasMinDimensionLength = Math.min(clientWidth, clientHeight);
            const data = viewportAnnotation.data;
            const crosshairCenterCanvas = viewport.worldToCanvas(this.toolCenter);
            const otherViewportAnnotations = this._filterAnnotationsByUniqueViewportOrientations(enabledElement, annotations);
            const referenceLines = [];
            const canvasBox = [0, 0, clientWidth, clientHeight];
            otherViewportAnnotations.forEach((annotation) => {
                const { data } = annotation;
                data.handles.toolCenter = this.toolCenter;
                const otherViewport = renderingEngine.getViewport(data.viewportId);
                const otherCamera = otherViewport.getCamera();
                const otherViewportControllable = this._getReferenceLineControllable(otherViewport.id);
                const otherViewportDraggableRotatable = this._getReferenceLineDraggableRotatable(otherViewport.id);
                const otherViewportSlabThicknessControlsOn = this._getReferenceLineSlabThicknessControlsOn(otherViewport.id);
                const { clientWidth, clientHeight } = otherViewport.canvas;
                const otherCanvasDiagonalLength = Math.sqrt(clientWidth * clientWidth + clientHeight * clientHeight);
                const otherCanvasCenter = [
                    clientWidth * 0.5,
                    clientHeight * 0.5,
                ];
                const otherViewportCenterWorld = otherViewport.canvasToWorld(otherCanvasCenter);
                const direction = [0, 0, 0];
                vtkMath.cross(camera.viewPlaneNormal, otherCamera.viewPlaneNormal, direction);
                vtkMath.normalize(direction);
                vtkMath.multiplyScalar(direction, otherCanvasDiagonalLength);
                const pointWorld0 = [0, 0, 0];
                vtkMath.add(otherViewportCenterWorld, direction, pointWorld0);
                const pointWorld1 = [0, 0, 0];
                vtkMath.subtract(otherViewportCenterWorld, direction, pointWorld1);
                const pointCanvas0 = viewport.worldToCanvas(pointWorld0);
                const otherViewportCenterCanvas = viewport.worldToCanvas(otherViewportCenterWorld);
                const canvasUnitVectorFromCenter = vec2.create();
                vec2.subtract(canvasUnitVectorFromCenter, pointCanvas0, otherViewportCenterCanvas);
                vec2.normalize(canvasUnitVectorFromCenter, canvasUnitVectorFromCenter);
                const canvasVectorFromCenterLong = vec2.create();
                vec2.scale(canvasVectorFromCenterLong, canvasUnitVectorFromCenter, canvasDiagonalLength * 100);
                const canvasVectorFromCenterMid = vec2.create();
                vec2.scale(canvasVectorFromCenterMid, canvasUnitVectorFromCenter, canvasMinDimensionLength * 0.4);
                const canvasVectorFromCenterShort = vec2.create();
                vec2.scale(canvasVectorFromCenterShort, canvasUnitVectorFromCenter, canvasMinDimensionLength * 0.2);
                const canvasVectorFromCenterStart = vec2.create();
                const centerGap = this.configuration.referenceLinesCenterGapRadius;
                vec2.scale(canvasVectorFromCenterStart, canvasUnitVectorFromCenter, otherViewportAnnotations.length === 2 ? centerGap : 0);
                const refLinePointOne = vec2.create();
                const refLinePointTwo = vec2.create();
                const refLinePointThree = vec2.create();
                const refLinePointFour = vec2.create();
                let refLinesCenter = vec2.clone(crosshairCenterCanvas);
                if (!otherViewportDraggableRotatable || !otherViewportControllable) {
                    refLinesCenter = vec2.clone(otherViewportCenterCanvas);
                }
                vec2.add(refLinePointOne, refLinesCenter, canvasVectorFromCenterStart);
                vec2.add(refLinePointTwo, refLinesCenter, canvasVectorFromCenterLong);
                vec2.subtract(refLinePointThree, refLinesCenter, canvasVectorFromCenterStart);
                vec2.subtract(refLinePointFour, refLinesCenter, canvasVectorFromCenterLong);
                liangBarksyClip(refLinePointOne, refLinePointTwo, canvasBox);
                liangBarksyClip(refLinePointThree, refLinePointFour, canvasBox);
                const rotHandleOne = vec2.create();
                vec2.subtract(rotHandleOne, crosshairCenterCanvas, canvasVectorFromCenterMid);
                const rotHandleTwo = vec2.create();
                vec2.add(rotHandleTwo, crosshairCenterCanvas, canvasVectorFromCenterMid);
                let stHandlesCenterCanvas = vec2.clone(crosshairCenterCanvas);
                if (!otherViewportDraggableRotatable &&
                    otherViewportSlabThicknessControlsOn) {
                    stHandlesCenterCanvas = vec2.clone(otherViewportCenterCanvas);
                }
                let stHandlesCenterWorld = [...this.toolCenter];
                if (!otherViewportDraggableRotatable &&
                    otherViewportSlabThicknessControlsOn) {
                    stHandlesCenterWorld = [...otherViewportCenterWorld];
                }
                const worldUnitVectorFromCenter = [0, 0, 0];
                vtkMath.subtract(pointWorld0, pointWorld1, worldUnitVectorFromCenter);
                vtkMath.normalize(worldUnitVectorFromCenter);
                const { viewPlaneNormal } = camera;
                const { matrix } = vtkMatrixBuilder
                    .buildFromDegree()
                    .rotate(90, viewPlaneNormal);
                const worldUnitOrthoVectorFromCenter = [0, 0, 0];
                vec3.transformMat4(worldUnitOrthoVectorFromCenter, worldUnitVectorFromCenter, matrix);
                const slabThicknessValue = otherViewport.getSlabThickness();
                const worldOrthoVectorFromCenter = [
                    ...worldUnitOrthoVectorFromCenter,
                ];
                vtkMath.multiplyScalar(worldOrthoVectorFromCenter, slabThicknessValue);
                const worldVerticalRefPoint = [0, 0, 0];
                vtkMath.add(stHandlesCenterWorld, worldOrthoVectorFromCenter, worldVerticalRefPoint);
                const canvasVerticalRefPoint = viewport.worldToCanvas(worldVerticalRefPoint);
                const canvasOrthoVectorFromCenter = vec2.create();
                vec2.subtract(canvasOrthoVectorFromCenter, stHandlesCenterCanvas, canvasVerticalRefPoint);
                const stLinePointOne = vec2.create();
                vec2.subtract(stLinePointOne, stHandlesCenterCanvas, canvasVectorFromCenterLong);
                vec2.add(stLinePointOne, stLinePointOne, canvasOrthoVectorFromCenter);
                const stLinePointTwo = vec2.create();
                vec2.add(stLinePointTwo, stHandlesCenterCanvas, canvasVectorFromCenterLong);
                vec2.add(stLinePointTwo, stLinePointTwo, canvasOrthoVectorFromCenter);
                liangBarksyClip(stLinePointOne, stLinePointTwo, canvasBox);
                const stLinePointThree = vec2.create();
                vec2.add(stLinePointThree, stHandlesCenterCanvas, canvasVectorFromCenterLong);
                vec2.subtract(stLinePointThree, stLinePointThree, canvasOrthoVectorFromCenter);
                const stLinePointFour = vec2.create();
                vec2.subtract(stLinePointFour, stHandlesCenterCanvas, canvasVectorFromCenterLong);
                vec2.subtract(stLinePointFour, stLinePointFour, canvasOrthoVectorFromCenter);
                liangBarksyClip(stLinePointThree, stLinePointFour, canvasBox);
                const stHandleOne = vec2.create();
                const stHandleTwo = vec2.create();
                const stHandleThree = vec2.create();
                const stHandleFour = vec2.create();
                vec2.subtract(stHandleOne, stHandlesCenterCanvas, canvasVectorFromCenterShort);
                vec2.add(stHandleOne, stHandleOne, canvasOrthoVectorFromCenter);
                vec2.add(stHandleTwo, stHandlesCenterCanvas, canvasVectorFromCenterShort);
                vec2.add(stHandleTwo, stHandleTwo, canvasOrthoVectorFromCenter);
                vec2.subtract(stHandleThree, stHandlesCenterCanvas, canvasVectorFromCenterShort);
                vec2.subtract(stHandleThree, stHandleThree, canvasOrthoVectorFromCenter);
                vec2.add(stHandleFour, stHandlesCenterCanvas, canvasVectorFromCenterShort);
                vec2.subtract(stHandleFour, stHandleFour, canvasOrthoVectorFromCenter);
                referenceLines.push([
                    otherViewport,
                    refLinePointOne,
                    refLinePointTwo,
                    refLinePointThree,
                    refLinePointFour,
                    stLinePointOne,
                    stLinePointTwo,
                    stLinePointThree,
                    stLinePointFour,
                    rotHandleOne,
                    rotHandleTwo,
                    stHandleOne,
                    stHandleTwo,
                    stHandleThree,
                    stHandleFour,
                ]);
            });
            const newRtpoints = [];
            const newStpoints = [];
            const viewportColor = this._getReferenceLineColor(viewport.id);
            const color = viewportColor !== undefined ? viewportColor : 'rgb(200, 200, 200)';
            referenceLines.forEach((line, lineIndex) => {
                const otherViewport = line[0];
                const viewportColor = this._getReferenceLineColor(otherViewport.id);
                const viewportControllable = this._getReferenceLineControllable(otherViewport.id);
                const viewportDraggableRotatable = this._getReferenceLineDraggableRotatable(otherViewport.id) ||
                    this.configuration.mobile?.enabled;
                const viewportSlabThicknessControlsOn = this._getReferenceLineSlabThicknessControlsOn(otherViewport.id) ||
                    this.configuration.mobile?.enabled;
                const selectedViewportId = data.activeViewportIds.find((id) => id === otherViewport.id);
                let color = viewportColor !== undefined ? viewportColor : 'rgb(200, 200, 200)';
                let lineWidth = 1;
                const lineActive = data.handles.activeOperation !== null &&
                    data.handles.activeOperation === OPERATION.DRAG &&
                    selectedViewportId;
                if (lineActive) {
                    lineWidth = 2.5;
                }
                let lineUID = `${lineIndex}`;
                if (viewportControllable && viewportDraggableRotatable) {
                    lineUID = `${lineIndex}One`;
                    drawLineSvg(svgDrawingHelper, annotationUID, lineUID, line[1], line[2], {
                        color,
                        lineWidth,
                    });
                    lineUID = `${lineIndex}Two`;
                    drawLineSvg(svgDrawingHelper, annotationUID, lineUID, line[3], line[4], {
                        color,
                        lineWidth,
                    });
                }
                else {
                    drawLineSvg(svgDrawingHelper, annotationUID, lineUID, line[2], line[4], {
                        color,
                        lineWidth,
                    });
                }
                if (viewportControllable) {
                    color =
                        viewportColor !== undefined ? viewportColor : 'rgb(200, 200, 200)';
                    const rotHandlesActive = data.handles.activeOperation === OPERATION.ROTATE;
                    const rotationHandles = [line[9], line[10]];
                    const rotHandleWorldOne = [
                        viewport.canvasToWorld(line[9]),
                        otherViewport,
                        line[1],
                        line[2],
                    ];
                    const rotHandleWorldTwo = [
                        viewport.canvasToWorld(line[10]),
                        otherViewport,
                        line[3],
                        line[4],
                    ];
                    newRtpoints.push(rotHandleWorldOne, rotHandleWorldTwo);
                    const slabThicknessHandlesActive = data.handles.activeOperation === OPERATION.SLAB;
                    const slabThicknessHandles = [line[11], line[12], line[13], line[14]];
                    const slabThicknessHandleWorldOne = [
                        viewport.canvasToWorld(line[11]),
                        otherViewport,
                        line[5],
                        line[6],
                    ];
                    const slabThicknessHandleWorldTwo = [
                        viewport.canvasToWorld(line[12]),
                        otherViewport,
                        line[5],
                        line[6],
                    ];
                    const slabThicknessHandleWorldThree = [
                        viewport.canvasToWorld(line[13]),
                        otherViewport,
                        line[7],
                        line[8],
                    ];
                    const slabThicknessHandleWorldFour = [
                        viewport.canvasToWorld(line[14]),
                        otherViewport,
                        line[7],
                        line[8],
                    ];
                    newStpoints.push(slabThicknessHandleWorldOne, slabThicknessHandleWorldTwo, slabThicknessHandleWorldThree, slabThicknessHandleWorldFour);
                    if ((lineActive || this.configuration.mobile?.enabled) &&
                        !rotHandlesActive &&
                        !slabThicknessHandlesActive &&
                        viewportDraggableRotatable &&
                        viewportSlabThicknessControlsOn) {
                        let handleUID = `${lineIndex}One`;
                        drawHandlesSvg(svgDrawingHelper, annotationUID, handleUID, rotationHandles, {
                            color,
                            handleRadius: this.configuration.mobile?.enabled
                                ? this.configuration.mobile?.handleRadius
                                : 3,
                            opacity: this.configuration.mobile?.enabled
                                ? this.configuration.mobile?.opacity
                                : 1,
                            type: 'circle',
                        });
                        handleUID = `${lineIndex}Two`;
                        drawHandlesSvg(svgDrawingHelper, annotationUID, handleUID, slabThicknessHandles, {
                            color,
                            handleRadius: this.configuration.mobile?.enabled
                                ? this.configuration.mobile?.handleRadius
                                : 3,
                            opacity: this.configuration.mobile?.enabled
                                ? this.configuration.mobile?.opacity
                                : 1,
                            type: 'rect',
                        });
                    }
                    else if (lineActive &&
                        !rotHandlesActive &&
                        !slabThicknessHandlesActive &&
                        viewportDraggableRotatable) {
                        const handleUID = `${lineIndex}`;
                        drawHandlesSvg(svgDrawingHelper, annotationUID, handleUID, rotationHandles, {
                            color,
                            handleRadius: this.configuration.mobile?.enabled
                                ? this.configuration.mobile?.handleRadius
                                : 3,
                            opacity: this.configuration.mobile?.enabled
                                ? this.configuration.mobile?.opacity
                                : 1,
                            type: 'circle',
                        });
                    }
                    else if (selectedViewportId &&
                        !rotHandlesActive &&
                        !slabThicknessHandlesActive &&
                        viewportSlabThicknessControlsOn) {
                        const handleUID = `${lineIndex}`;
                        drawHandlesSvg(svgDrawingHelper, annotationUID, handleUID, slabThicknessHandles, {
                            color,
                            handleRadius: this.configuration.mobile?.enabled
                                ? this.configuration.mobile?.handleRadius
                                : 3,
                            opacity: this.configuration.mobile?.enabled
                                ? this.configuration.mobile?.opacity
                                : 1,
                            type: 'rect',
                        });
                    }
                    else if (rotHandlesActive && viewportDraggableRotatable) {
                        const handleUID = `${lineIndex}`;
                        drawHandlesSvg(svgDrawingHelper, annotationUID, handleUID, rotationHandles, {
                            color,
                            handleRadius: 2,
                            fill: color,
                            type: 'circle',
                        });
                    }
                    else if (slabThicknessHandlesActive &&
                        selectedViewportId &&
                        viewportSlabThicknessControlsOn) {
                        drawHandlesSvg(svgDrawingHelper, annotationUID, lineUID, slabThicknessHandles, {
                            color,
                            handleRadius: 2,
                            fill: color,
                            type: 'rect',
                        });
                    }
                    const slabThicknessValue = otherViewport.getSlabThickness();
                    if (slabThicknessValue > 0.5 && viewportSlabThicknessControlsOn) {
                        lineUID = `${lineIndex}STOne`;
                        drawLineSvg(svgDrawingHelper, annotationUID, lineUID, line[5], line[6], {
                            color,
                            width: 1,
                            lineDash: [2, 3],
                        });
                        lineUID = `${lineIndex}STTwo`;
                        drawLineSvg(svgDrawingHelper, annotationUID, lineUID, line[7], line[8], {
                            color,
                            width: line,
                            lineDash: [2, 3],
                        });
                    }
                }
            });
            renderStatus = true;
            data.handles.rotationPoints = newRtpoints;
            data.handles.slabThicknessPoints = newStpoints;
            if (this.configuration.viewportIndicators) {
                const { viewportIndicatorsConfig } = this.configuration;
                const xOffset = viewportIndicatorsConfig?.xOffset || 0.95;
                const yOffset = viewportIndicatorsConfig?.yOffset || 0.05;
                const referenceColorCoordinates = [
                    clientWidth * xOffset,
                    clientHeight * yOffset,
                ];
                const circleRadius = viewportIndicatorsConfig?.circleRadius || canvasDiagonalLength * 0.01;
                const circleUID = '0';
                drawCircleSvg(svgDrawingHelper, annotationUID, circleUID, referenceColorCoordinates, circleRadius, { color, fill: color });
            }
            return renderStatus;
        };
        this._getAnnotations = (enabledElement) => {
            const { viewport } = enabledElement;
            const annotations = getAnnotations(this.getToolName(), viewport.element) || [];
            const viewportIds = this._getViewportsInfo().map(({ viewportId }) => viewportId);
            const toolGroupAnnotations = annotations.filter((annotation) => {
                const { data } = annotation;
                return viewportIds.includes(data.viewportId);
            });
            return toolGroupAnnotations;
        };
        this._onNewVolume = () => {
            const viewportsInfo = this._getViewportsInfo();
            this.computeToolCenter(viewportsInfo);
        };
        this._areViewportIdArraysEqual = (viewportIdArrayOne, viewportIdArrayTwo) => {
            if (viewportIdArrayOne.length !== viewportIdArrayTwo.length) {
                return false;
            }
            viewportIdArrayOne.forEach((id) => {
                let itemFound = false;
                for (let i = 0; i < viewportIdArrayTwo.length; ++i) {
                    if (id === viewportIdArrayTwo[i]) {
                        itemFound = true;
                        break;
                    }
                }
                if (itemFound === false) {
                    return false;
                }
            });
            return true;
        };
        this._getAnnotationsForViewportsWithDifferentCameras = (enabledElement, annotations) => {
            const { viewportId, renderingEngine, viewport } = enabledElement;
            const otherViewportAnnotations = annotations.filter((annotation) => annotation.data.viewportId !== viewportId);
            if (!otherViewportAnnotations || !otherViewportAnnotations.length) {
                return [];
            }
            const camera = viewport.getCamera();
            const { viewPlaneNormal, position } = camera;
            const viewportsWithDifferentCameras = otherViewportAnnotations.filter((annotation) => {
                const { viewportId } = annotation.data;
                const targetViewport = renderingEngine.getViewport(viewportId);
                const cameraOfTarget = targetViewport.getCamera();
                return !(csUtils.isEqual(cameraOfTarget.viewPlaneNormal, viewPlaneNormal, 1e-2) && csUtils.isEqual(cameraOfTarget.position, position, 1));
            });
            return viewportsWithDifferentCameras;
        };
        this._filterViewportWithSameOrientation = (enabledElement, referenceAnnotation, annotations) => {
            const { renderingEngine } = enabledElement;
            const { data } = referenceAnnotation;
            const viewport = renderingEngine.getViewport(data.viewportId);
            const linkedViewportAnnotations = annotations.filter((annotation) => {
                const { data } = annotation;
                const otherViewport = renderingEngine.getViewport(data.viewportId);
                const otherViewportControllable = this._getReferenceLineControllable(otherViewport.id);
                return otherViewportControllable === true;
            });
            if (!linkedViewportAnnotations || !linkedViewportAnnotations.length) {
                return [];
            }
            const camera = viewport.getCamera();
            const viewPlaneNormal = camera.viewPlaneNormal;
            vtkMath.normalize(viewPlaneNormal);
            const otherViewportsAnnotationsWithSameCameraDirection = linkedViewportAnnotations.filter((annotation) => {
                const { viewportId } = annotation.data;
                const otherViewport = renderingEngine.getViewport(viewportId);
                const otherCamera = otherViewport.getCamera();
                const otherViewPlaneNormal = otherCamera.viewPlaneNormal;
                vtkMath.normalize(otherViewPlaneNormal);
                return (csUtils.isEqual(viewPlaneNormal, otherViewPlaneNormal, 1e-2) &&
                    csUtils.isEqual(camera.viewUp, otherCamera.viewUp, 1e-2));
            });
            return otherViewportsAnnotationsWithSameCameraDirection;
        };
        this._filterAnnotationsByUniqueViewportOrientations = (enabledElement, annotations) => {
            const { renderingEngine, viewport } = enabledElement;
            const camera = viewport.getCamera();
            const viewPlaneNormal = camera.viewPlaneNormal;
            vtkMath.normalize(viewPlaneNormal);
            const otherLinkedViewportAnnotationsFromSameScene = annotations.filter((annotation) => {
                const { data } = annotation;
                const otherViewport = renderingEngine.getViewport(data.viewportId);
                const otherViewportControllable = this._getReferenceLineControllable(otherViewport.id);
                return (viewport !== otherViewport &&
                    otherViewportControllable === true);
            });
            const otherViewportsAnnotationsWithUniqueCameras = [];
            for (let i = 0; i < otherLinkedViewportAnnotationsFromSameScene.length; ++i) {
                const annotation = otherLinkedViewportAnnotationsFromSameScene[i];
                const { viewportId } = annotation.data;
                const otherViewport = renderingEngine.getViewport(viewportId);
                const otherCamera = otherViewport.getCamera();
                const otherViewPlaneNormal = otherCamera.viewPlaneNormal;
                vtkMath.normalize(otherViewPlaneNormal);
                if (csUtils.isEqual(viewPlaneNormal, otherViewPlaneNormal, 1e-2) ||
                    csUtils.isOpposite(viewPlaneNormal, otherViewPlaneNormal, 1e-2)) {
                    continue;
                }
                let cameraFound = false;
                for (let jj = 0; jj < otherViewportsAnnotationsWithUniqueCameras.length; ++jj) {
                    const annotation = otherViewportsAnnotationsWithUniqueCameras[jj];
                    const { viewportId } = annotation.data;
                    const stockedViewport = renderingEngine.getViewport(viewportId);
                    const cameraOfStocked = stockedViewport.getCamera();
                    if (csUtils.isEqual(cameraOfStocked.viewPlaneNormal, otherCamera.viewPlaneNormal, 1e-2) &&
                        csUtils.isEqual(cameraOfStocked.position, otherCamera.position, 1)) {
                        cameraFound = true;
                    }
                }
                if (!cameraFound) {
                    otherViewportsAnnotationsWithUniqueCameras.push(annotation);
                }
            }
            const otherNonLinkedViewportAnnotationsFromSameScene = annotations.filter((annotation) => {
                const { data } = annotation;
                const otherViewport = renderingEngine.getViewport(data.viewportId);
                const otherViewportControllable = this._getReferenceLineControllable(otherViewport.id);
                return (viewport !== otherViewport &&
                    otherViewportControllable !== true);
            });
            for (let i = 0; i < otherNonLinkedViewportAnnotationsFromSameScene.length; ++i) {
                const annotation = otherNonLinkedViewportAnnotationsFromSameScene[i];
                const { viewportId } = annotation.data;
                const otherViewport = renderingEngine.getViewport(viewportId);
                const otherCamera = otherViewport.getCamera();
                const otherViewPlaneNormal = otherCamera.viewPlaneNormal;
                vtkMath.normalize(otherViewPlaneNormal);
                if (csUtils.isEqual(viewPlaneNormal, otherViewPlaneNormal, 1e-2) ||
                    csUtils.isOpposite(viewPlaneNormal, otherViewPlaneNormal, 1e-2)) {
                    continue;
                }
                let cameraFound = false;
                for (let jj = 0; jj < otherViewportsAnnotationsWithUniqueCameras.length; ++jj) {
                    const annotation = otherViewportsAnnotationsWithUniqueCameras[jj];
                    const { viewportId } = annotation.data;
                    const stockedViewport = renderingEngine.getViewport(viewportId);
                    const cameraOfStocked = stockedViewport.getCamera();
                    if (csUtils.isEqual(cameraOfStocked.viewPlaneNormal, otherCamera.viewPlaneNormal, 1e-2) &&
                        csUtils.isEqual(cameraOfStocked.position, otherCamera.position, 1)) {
                        cameraFound = true;
                    }
                }
                if (!cameraFound) {
                    otherViewportsAnnotationsWithUniqueCameras.push(annotation);
                }
            }
            const otherViewportAnnotations = this._getAnnotationsForViewportsWithDifferentCameras(enabledElement, annotations);
            for (let i = 0; i < otherViewportAnnotations.length; ++i) {
                const annotation = otherViewportAnnotations[i];
                if (otherViewportsAnnotationsWithUniqueCameras.some((element) => element === annotation)) {
                    continue;
                }
                const { viewportId } = annotation.data;
                const otherViewport = renderingEngine.getViewport(viewportId);
                const otherCamera = otherViewport.getCamera();
                const otherViewPlaneNormal = otherCamera.viewPlaneNormal;
                vtkMath.normalize(otherViewPlaneNormal);
                if (csUtils.isEqual(viewPlaneNormal, otherViewPlaneNormal, 1e-2) ||
                    csUtils.isOpposite(viewPlaneNormal, otherViewPlaneNormal, 1e-2)) {
                    continue;
                }
                let cameraFound = false;
                for (let jj = 0; jj < otherViewportsAnnotationsWithUniqueCameras.length; ++jj) {
                    const annotation = otherViewportsAnnotationsWithUniqueCameras[jj];
                    const { viewportId } = annotation.data;
                    const stockedViewport = renderingEngine.getViewport(viewportId);
                    const cameraOfStocked = stockedViewport.getCamera();
                    if (csUtils.isEqual(cameraOfStocked.viewPlaneNormal, otherCamera.viewPlaneNormal, 1e-2) &&
                        csUtils.isEqual(cameraOfStocked.position, otherCamera.position, 1)) {
                        cameraFound = true;
                    }
                }
                if (!cameraFound) {
                    otherViewportsAnnotationsWithUniqueCameras.push(annotation);
                }
            }
            return otherViewportsAnnotationsWithUniqueCameras;
        };
        this._checkIfViewportsRenderingSameScene = (viewport, otherViewport) => {
            const actors = viewport.getActors();
            const otherViewportActors = otherViewport.getActors();
            let sameScene = true;
            actors.forEach((actor) => {
                if (actors.length !== otherViewportActors.length ||
                    otherViewportActors.find(({ uid }) => uid === actor.uid) === undefined) {
                    sameScene = false;
                }
            });
            return sameScene;
        };
        this._jump = (enabledElement, jumpWorld) => {
            state.isInteractingWithTool = true;
            const { viewport, renderingEngine } = enabledElement;
            const annotations = this._getAnnotations(enabledElement);
            const delta = [0, 0, 0];
            vtkMath.subtract(jumpWorld, this.toolCenter, delta);
            const otherViewportAnnotations = this._getAnnotationsForViewportsWithDifferentCameras(enabledElement, annotations);
            const viewportsAnnotationsToUpdate = otherViewportAnnotations.filter((annotation) => {
                const { data } = annotation;
                const otherViewport = renderingEngine.getViewport(data.viewportId);
                const sameScene = this._checkIfViewportsRenderingSameScene(viewport, otherViewport);
                return (this._getReferenceLineControllable(otherViewport.id) &&
                    this._getReferenceLineDraggableRotatable(otherViewport.id) &&
                    sameScene);
            });
            if (viewportsAnnotationsToUpdate.length === 0) {
                state.isInteractingWithTool = false;
                return false;
            }
            this._applyDeltaShiftToSelectedViewportCameras(renderingEngine, viewportsAnnotationsToUpdate, delta);
            state.isInteractingWithTool = false;
            return true;
        };
        this._activateModify = (element) => {
            state.isInteractingWithTool = !this.configuration.mobile?.enabled;
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
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            this.editData.annotation.data.handles.activeOperation = null;
            this.editData.annotation.data.activeViewportIds = [];
            this._deactivateModify(element);
            resetElementCursor(element);
            this.editData = null;
            const requireSameOrientation = false;
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName(), requireSameOrientation);
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        };
        this._dragCallback = (evt) => {
            const eventDetail = evt.detail;
            const delta = eventDetail.deltaPoints.world;
            if (Math.abs(delta[0]) < 1e-3 &&
                Math.abs(delta[1]) < 1e-3 &&
                Math.abs(delta[2]) < 1e-3) {
                return;
            }
            const { element } = eventDetail;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine, viewport } = enabledElement;
            const annotations = this._getAnnotations(enabledElement);
            const filteredToolAnnotations = this.filterInteractableAnnotationsForElement(element, annotations);
            const viewportAnnotation = filteredToolAnnotations[0];
            if (!viewportAnnotation) {
                return;
            }
            const { handles } = viewportAnnotation.data;
            const { currentPoints } = evt.detail;
            const canvasCoords = currentPoints.canvas;
            if (handles.activeOperation === OPERATION.DRAG) {
                const otherViewportAnnotations = this._getAnnotationsForViewportsWithDifferentCameras(enabledElement, annotations);
                const viewportsAnnotationsToUpdate = otherViewportAnnotations.filter((annotation) => {
                    const { data } = annotation;
                    const otherViewport = renderingEngine.getViewport(data.viewportId);
                    const otherViewportControllable = this._getReferenceLineControllable(otherViewport.id);
                    const otherViewportDraggableRotatable = this._getReferenceLineDraggableRotatable(otherViewport.id);
                    return (otherViewportControllable === true &&
                        otherViewportDraggableRotatable === true &&
                        viewportAnnotation.data.activeViewportIds.find((id) => id === otherViewport.id));
                });
                this._applyDeltaShiftToSelectedViewportCameras(renderingEngine, viewportsAnnotationsToUpdate, delta);
            }
            else if (handles.activeOperation === OPERATION.ROTATE) {
                const otherViewportAnnotations = this._getAnnotationsForViewportsWithDifferentCameras(enabledElement, annotations);
                const viewportsAnnotationsToUpdate = otherViewportAnnotations.filter((annotation) => {
                    const { data } = annotation;
                    const otherViewport = renderingEngine.getViewport(data.viewportId);
                    const otherViewportControllable = this._getReferenceLineControllable(otherViewport.id);
                    const otherViewportDraggableRotatable = this._getReferenceLineDraggableRotatable(otherViewport.id);
                    return (otherViewportControllable === true &&
                        otherViewportDraggableRotatable === true);
                });
                const dir1 = vec2.create();
                const dir2 = vec2.create();
                const center = [
                    this.toolCenter[0],
                    this.toolCenter[1],
                    this.toolCenter[2],
                ];
                const centerCanvas = viewport.worldToCanvas(center);
                const finalPointCanvas = eventDetail.currentPoints.canvas;
                const originalPointCanvas = vec2.create();
                vec2.sub(originalPointCanvas, finalPointCanvas, eventDetail.deltaPoints.canvas);
                vec2.sub(dir1, originalPointCanvas, centerCanvas);
                vec2.sub(dir2, finalPointCanvas, centerCanvas);
                let angle = vec2.angle(dir1, dir2);
                if (this._isClockWise(centerCanvas, originalPointCanvas, finalPointCanvas)) {
                    angle *= -1;
                }
                angle = Math.round(angle * 100) / 100;
                const rotationAxis = viewport.getCamera().viewPlaneNormal;
                const { matrix } = vtkMatrixBuilder
                    .buildFromRadian()
                    .translate(center[0], center[1], center[2])
                    .rotate(angle, rotationAxis)
                    .translate(-center[0], -center[1], -center[2]);
                const otherViewportsIds = [];
                viewportsAnnotationsToUpdate.forEach((annotation) => {
                    const { data } = annotation;
                    data.handles.toolCenter = center;
                    const otherViewport = renderingEngine.getViewport(data.viewportId);
                    const camera = otherViewport.getCamera();
                    const { viewUp, position, focalPoint } = camera;
                    viewUp[0] += position[0];
                    viewUp[1] += position[1];
                    viewUp[2] += position[2];
                    vec3.transformMat4(focalPoint, focalPoint, matrix);
                    vec3.transformMat4(position, position, matrix);
                    vec3.transformMat4(viewUp, viewUp, matrix);
                    viewUp[0] -= position[0];
                    viewUp[1] -= position[1];
                    viewUp[2] -= position[2];
                    otherViewport.setCamera({
                        position,
                        viewUp,
                        focalPoint,
                    });
                    otherViewportsIds.push(otherViewport.id);
                });
                renderingEngine.renderViewports(otherViewportsIds);
            }
            else if (handles.activeOperation === OPERATION.SLAB) {
                const otherViewportAnnotations = this._getAnnotationsForViewportsWithDifferentCameras(enabledElement, annotations);
                const referenceAnnotations = otherViewportAnnotations.filter((annotation) => {
                    const { data } = annotation;
                    const otherViewport = renderingEngine.getViewport(data.viewportId);
                    const otherViewportControllable = this._getReferenceLineControllable(otherViewport.id);
                    const otherViewportSlabThicknessControlsOn = this._getReferenceLineSlabThicknessControlsOn(otherViewport.id);
                    return (otherViewportControllable === true &&
                        otherViewportSlabThicknessControlsOn === true &&
                        viewportAnnotation.data.activeViewportIds.find((id) => id === otherViewport.id));
                });
                if (referenceAnnotations.length === 0) {
                    return;
                }
                const viewportsAnnotationsToUpdate = this._filterViewportWithSameOrientation(enabledElement, referenceAnnotations[0], annotations);
                const viewportsIds = [];
                viewportsIds.push(viewport.id);
                viewportsAnnotationsToUpdate.forEach((annotation) => {
                    const { data } = annotation;
                    const otherViewport = renderingEngine.getViewport(data.viewportId);
                    const camera = otherViewport.getCamera();
                    const normal = camera.viewPlaneNormal;
                    const dotProd = vtkMath.dot(delta, normal);
                    const projectedDelta = [...normal];
                    vtkMath.multiplyScalar(projectedDelta, dotProd);
                    if (Math.abs(projectedDelta[0]) > 1e-3 ||
                        Math.abs(projectedDelta[1]) > 1e-3 ||
                        Math.abs(projectedDelta[2]) > 1e-3) {
                        const mod = Math.sqrt(projectedDelta[0] * projectedDelta[0] +
                            projectedDelta[1] * projectedDelta[1] +
                            projectedDelta[2] * projectedDelta[2]);
                        const currentPoint = eventDetail.lastPoints.world;
                        const direction = [0, 0, 0];
                        const currentCenter = [
                            this.toolCenter[0],
                            this.toolCenter[1],
                            this.toolCenter[2],
                        ];
                        const viewportDraggableRotatable = this._getReferenceLineDraggableRotatable(otherViewport.id);
                        if (!viewportDraggableRotatable) {
                            const { rotationPoints } = this.editData.annotation.data.handles;
                            const otherViewportRotationPoints = rotationPoints.filter((point) => point[1].uid === otherViewport.id);
                            if (otherViewportRotationPoints.length === 2) {
                                const point1 = viewport.canvasToWorld(otherViewportRotationPoints[0][3]);
                                const point2 = viewport.canvasToWorld(otherViewportRotationPoints[1][3]);
                                vtkMath.add(point1, point2, currentCenter);
                                vtkMath.multiplyScalar(currentCenter, 0.5);
                            }
                        }
                        vtkMath.subtract(currentPoint, currentCenter, direction);
                        const dotProdDirection = vtkMath.dot(direction, normal);
                        const projectedDirection = [...normal];
                        vtkMath.multiplyScalar(projectedDirection, dotProdDirection);
                        const normalizedProjectedDirection = [
                            projectedDirection[0],
                            projectedDirection[1],
                            projectedDirection[2],
                        ];
                        vec3.normalize(normalizedProjectedDirection, normalizedProjectedDirection);
                        const normalizedProjectedDelta = [
                            projectedDelta[0],
                            projectedDelta[1],
                            projectedDelta[2],
                        ];
                        vec3.normalize(normalizedProjectedDelta, normalizedProjectedDelta);
                        let slabThicknessValue = otherViewport.getSlabThickness();
                        if (csUtils.isOpposite(normalizedProjectedDirection, normalizedProjectedDelta, 1e-3)) {
                            slabThicknessValue -= mod;
                        }
                        else {
                            slabThicknessValue += mod;
                        }
                        slabThicknessValue = Math.abs(slabThicknessValue);
                        slabThicknessValue = Math.max(RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS, slabThicknessValue);
                        const near = this._pointNearReferenceLine(viewportAnnotation, canvasCoords, 6, otherViewport);
                        if (near) {
                            slabThicknessValue = RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS;
                        }
                        const toolGroup = getToolGroupForViewport(otherViewport.id, renderingEngine.id);
                        const crosshairsInstance = toolGroup.getToolInstance(this.getToolName());
                        crosshairsInstance.setSlabThickness(otherViewport, slabThicknessValue);
                        viewportsIds.push(otherViewport.id);
                    }
                });
                renderingEngine.renderViewports(viewportsIds);
            }
        };
        this._pointNearReferenceLine = (annotation, canvasCoords, proximity, lineViewport) => {
            const { data } = annotation;
            const { rotationPoints } = data.handles;
            for (let i = 0; i < rotationPoints.length - 1; ++i) {
                const otherViewport = rotationPoints[i][1];
                if (otherViewport.id !== lineViewport.id) {
                    continue;
                }
                const viewportControllable = this._getReferenceLineControllable(otherViewport.id);
                if (!viewportControllable) {
                    continue;
                }
                const lineSegment1 = {
                    start: {
                        x: rotationPoints[i][2][0],
                        y: rotationPoints[i][2][1],
                    },
                    end: {
                        x: rotationPoints[i][3][0],
                        y: rotationPoints[i][3][1],
                    },
                };
                const distanceToPoint1 = lineSegment.distanceToPoint([lineSegment1.start.x, lineSegment1.start.y], [lineSegment1.end.x, lineSegment1.end.y], [canvasCoords[0], canvasCoords[1]]);
                const lineSegment2 = {
                    start: {
                        x: rotationPoints[i + 1][2][0],
                        y: rotationPoints[i + 1][2][1],
                    },
                    end: {
                        x: rotationPoints[i + 1][3][0],
                        y: rotationPoints[i + 1][3][1],
                    },
                };
                const distanceToPoint2 = lineSegment.distanceToPoint([lineSegment2.start.x, lineSegment2.start.y], [lineSegment2.end.x, lineSegment2.end.y], [canvasCoords[0], canvasCoords[1]]);
                if (distanceToPoint1 <= proximity || distanceToPoint2 <= proximity) {
                    return true;
                }
                i++;
            }
            return false;
        };
        this._getReferenceLineColor =
            toolProps.configuration?.getReferenceLineColor ||
                defaultReferenceLineColor;
        this._getReferenceLineControllable =
            toolProps.configuration?.getReferenceLineControllable ||
                defaultReferenceLineControllable;
        this._getReferenceLineDraggableRotatable =
            toolProps.configuration?.getReferenceLineDraggableRotatable ||
                defaultReferenceLineDraggableRotatable;
        this._getReferenceLineSlabThicknessControlsOn =
            toolProps.configuration?.getReferenceLineSlabThicknessControlsOn ||
                defaultReferenceLineSlabThicknessControlsOn;
    }
    onSetToolActive() {
        const viewportsInfo = this._getViewportsInfo();
        this._unsubscribeToViewportNewVolumeSet(viewportsInfo);
        this._subscribeToViewportNewVolumeSet(viewportsInfo);
        this.computeToolCenter(viewportsInfo);
    }
    onSetToolPassive() {
        const viewportsInfo = this._getViewportsInfo();
        this.computeToolCenter(viewportsInfo);
    }
    onSetToolEnabled() {
        const viewportsInfo = this._getViewportsInfo();
        this.computeToolCenter(viewportsInfo);
    }
    onSetToolDisabled() {
        const viewportsInfo = this._getViewportsInfo();
        this._unsubscribeToViewportNewVolumeSet(viewportsInfo);
        viewportsInfo.forEach(({ renderingEngineId, viewportId }) => {
            const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
            if (!enabledElement) {
                return;
            }
            const annotations = this._getAnnotations(enabledElement);
            if (annotations?.length) {
                annotations.forEach((annotation) => {
                    removeAnnotation(annotation.annotationUID);
                });
            }
        });
    }
    getHandleNearImagePoint(element, annotation, canvasCoords, proximity) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        let point = this._getRotationHandleNearImagePoint(viewport, annotation, canvasCoords, proximity);
        if (point !== null) {
            return point;
        }
        point = this._getSlabThicknessHandleNearImagePoint(viewport, annotation, canvasCoords, proximity);
        if (point !== null) {
            return point;
        }
    }
    _unsubscribeToViewportNewVolumeSet(viewportsInfo) {
        viewportsInfo.forEach(({ viewportId, renderingEngineId }) => {
            const { viewport } = getEnabledElementByIds(viewportId, renderingEngineId);
            const { element } = viewport;
            element.removeEventListener(Enums.Events.VOLUME_VIEWPORT_NEW_VOLUME, this._onNewVolume);
        });
    }
    _subscribeToViewportNewVolumeSet(viewports) {
        viewports.forEach(({ viewportId, renderingEngineId }) => {
            const { viewport } = getEnabledElementByIds(viewportId, renderingEngineId);
            const { element } = viewport;
            element.addEventListener(Enums.Events.VOLUME_VIEWPORT_NEW_VOLUME, this._onNewVolume);
        });
    }
    _autoPanViewportIfNecessary(viewportId, renderingEngine) {
        const viewport = renderingEngine.getViewport(viewportId);
        const { clientWidth, clientHeight } = viewport.canvas;
        const toolCenterCanvas = viewport.worldToCanvas(this.toolCenter);
        const pan = this.configuration.autoPan.panSize;
        const visiblePointCanvas = [
            toolCenterCanvas[0],
            toolCenterCanvas[1],
        ];
        if (toolCenterCanvas[0] < 0) {
            visiblePointCanvas[0] = pan;
        }
        else if (toolCenterCanvas[0] > clientWidth) {
            visiblePointCanvas[0] = clientWidth - pan;
        }
        if (toolCenterCanvas[1] < 0) {
            visiblePointCanvas[1] = pan;
        }
        else if (toolCenterCanvas[1] > clientHeight) {
            visiblePointCanvas[1] = clientHeight - pan;
        }
        if (visiblePointCanvas[0] === toolCenterCanvas[0] &&
            visiblePointCanvas[1] === toolCenterCanvas[1]) {
            return;
        }
        const visiblePointWorld = viewport.canvasToWorld(visiblePointCanvas);
        const deltaPointsWorld = [
            visiblePointWorld[0] - this.toolCenter[0],
            visiblePointWorld[1] - this.toolCenter[1],
            visiblePointWorld[2] - this.toolCenter[2],
        ];
        const camera = viewport.getCamera();
        const { focalPoint, position } = camera;
        const updatedPosition = [
            position[0] - deltaPointsWorld[0],
            position[1] - deltaPointsWorld[1],
            position[2] - deltaPointsWorld[2],
        ];
        const updatedFocalPoint = [
            focalPoint[0] - deltaPointsWorld[0],
            focalPoint[1] - deltaPointsWorld[1],
            focalPoint[2] - deltaPointsWorld[2],
        ];
        viewport.setCamera({
            focalPoint: updatedFocalPoint,
            position: updatedPosition,
        });
        viewport.render();
    }
    setSlabThickness(viewport, slabThickness) {
        let actorUIDs;
        const { filterActorUIDsToSetSlabThickness } = this.configuration;
        if (filterActorUIDsToSetSlabThickness &&
            filterActorUIDsToSetSlabThickness.length > 0) {
            actorUIDs = filterActorUIDsToSetSlabThickness;
        }
        let blendModeToUse = this.configuration.slabThicknessBlendMode;
        if (slabThickness === RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS) {
            blendModeToUse = Enums.BlendModes.COMPOSITE;
        }
        const immediate = false;
        viewport.setBlendMode(blendModeToUse, actorUIDs, immediate);
        viewport.setSlabThickness(slabThickness, actorUIDs);
    }
    _isClockWise(a, b, c) {
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0;
    }
    _applyDeltaShiftToSelectedViewportCameras(renderingEngine, viewportsAnnotationsToUpdate, delta) {
        viewportsAnnotationsToUpdate.forEach((annotation) => {
            this._applyDeltaShiftToViewportCamera(renderingEngine, annotation, delta);
        });
    }
    _applyDeltaShiftToViewportCamera(renderingEngine, annotation, delta) {
        const { data } = annotation;
        const viewport = renderingEngine.getViewport(data.viewportId);
        const camera = viewport.getCamera();
        const normal = camera.viewPlaneNormal;
        const dotProd = vtkMath.dot(delta, normal);
        const projectedDelta = [...normal];
        vtkMath.multiplyScalar(projectedDelta, dotProd);
        if (Math.abs(projectedDelta[0]) > 1e-3 ||
            Math.abs(projectedDelta[1]) > 1e-3 ||
            Math.abs(projectedDelta[2]) > 1e-3) {
            const newFocalPoint = [0, 0, 0];
            const newPosition = [0, 0, 0];
            vtkMath.add(camera.focalPoint, projectedDelta, newFocalPoint);
            vtkMath.add(camera.position, projectedDelta, newPosition);
            viewport.setCamera({
                focalPoint: newFocalPoint,
                position: newPosition,
            });
            viewport.render();
        }
    }
    _getRotationHandleNearImagePoint(viewport, annotation, canvasCoords, proximity) {
        const { data } = annotation;
        const { rotationPoints } = data.handles;
        for (let i = 0; i < rotationPoints.length; i++) {
            const point = rotationPoints[i][0];
            const otherViewport = rotationPoints[i][1];
            const viewportControllable = this._getReferenceLineControllable(otherViewport.id);
            if (!viewportControllable) {
                continue;
            }
            const viewportDraggableRotatable = this._getReferenceLineDraggableRotatable(otherViewport.id);
            if (!viewportDraggableRotatable) {
                continue;
            }
            const annotationCanvasCoordinate = viewport.worldToCanvas(point);
            if (vec2.distance(canvasCoords, annotationCanvasCoordinate) < proximity) {
                data.handles.activeOperation = OPERATION.ROTATE;
                this.editData = {
                    annotation,
                };
                return point;
            }
        }
        return null;
    }
    _getSlabThicknessHandleNearImagePoint(viewport, annotation, canvasCoords, proximity) {
        const { data } = annotation;
        const { slabThicknessPoints } = data.handles;
        for (let i = 0; i < slabThicknessPoints.length; i++) {
            const point = slabThicknessPoints[i][0];
            const otherViewport = slabThicknessPoints[i][1];
            const viewportControllable = this._getReferenceLineControllable(otherViewport.id);
            if (!viewportControllable) {
                continue;
            }
            const viewportSlabThicknessControlsOn = this._getReferenceLineSlabThicknessControlsOn(otherViewport.id);
            if (!viewportSlabThicknessControlsOn) {
                continue;
            }
            const annotationCanvasCoordinate = viewport.worldToCanvas(point);
            if (vec2.distance(canvasCoords, annotationCanvasCoordinate) < proximity) {
                data.handles.activeOperation = OPERATION.SLAB;
                data.activeViewportIds = [otherViewport.id];
                this.editData = {
                    annotation,
                };
                return point;
            }
        }
        return null;
    }
    _pointNearTool(element, annotation, canvasCoords, proximity) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const { clientWidth, clientHeight } = viewport.canvas;
        const canvasDiagonalLength = Math.sqrt(clientWidth * clientWidth + clientHeight * clientHeight);
        const { data } = annotation;
        const { rotationPoints } = data.handles;
        const { slabThicknessPoints } = data.handles;
        const viewportIdArray = [];
        for (let i = 0; i < rotationPoints.length - 1; ++i) {
            const otherViewport = rotationPoints[i][1];
            const viewportControllable = this._getReferenceLineControllable(otherViewport.id);
            const viewportDraggableRotatable = this._getReferenceLineDraggableRotatable(otherViewport.id);
            if (!viewportControllable || !viewportDraggableRotatable) {
                continue;
            }
            const lineSegment1 = {
                start: {
                    x: rotationPoints[i][2][0],
                    y: rotationPoints[i][2][1],
                },
                end: {
                    x: rotationPoints[i][3][0],
                    y: rotationPoints[i][3][1],
                },
            };
            const distanceToPoint1 = lineSegment.distanceToPoint([lineSegment1.start.x, lineSegment1.start.y], [lineSegment1.end.x, lineSegment1.end.y], [canvasCoords[0], canvasCoords[1]]);
            const lineSegment2 = {
                start: {
                    x: rotationPoints[i + 1][2][0],
                    y: rotationPoints[i + 1][2][1],
                },
                end: {
                    x: rotationPoints[i + 1][3][0],
                    y: rotationPoints[i + 1][3][1],
                },
            };
            const distanceToPoint2 = lineSegment.distanceToPoint([lineSegment2.start.x, lineSegment2.start.y], [lineSegment2.end.x, lineSegment2.end.y], [canvasCoords[0], canvasCoords[1]]);
            if (distanceToPoint1 <= proximity || distanceToPoint2 <= proximity) {
                viewportIdArray.push(otherViewport.id);
                data.handles.activeOperation = OPERATION.DRAG;
            }
            i++;
        }
        for (let i = 0; i < slabThicknessPoints.length - 1; ++i) {
            const otherViewport = slabThicknessPoints[i][1];
            if (viewportIdArray.find((id) => id === otherViewport.id)) {
                continue;
            }
            const viewportControllable = this._getReferenceLineControllable(otherViewport.id);
            const viewportSlabThicknessControlsOn = this._getReferenceLineSlabThicknessControlsOn(otherViewport.id);
            if (!viewportControllable || !viewportSlabThicknessControlsOn) {
                continue;
            }
            const stPointLineCanvas1 = slabThicknessPoints[i][2];
            const stPointLineCanvas2 = slabThicknessPoints[i][3];
            const centerCanvas = vec2.create();
            vec2.add(centerCanvas, stPointLineCanvas1, stPointLineCanvas2);
            vec2.scale(centerCanvas, centerCanvas, 0.5);
            const canvasUnitVectorFromCenter = vec2.create();
            vec2.subtract(canvasUnitVectorFromCenter, stPointLineCanvas1, centerCanvas);
            vec2.normalize(canvasUnitVectorFromCenter, canvasUnitVectorFromCenter);
            const canvasVectorFromCenterStart = vec2.create();
            vec2.scale(canvasVectorFromCenterStart, canvasUnitVectorFromCenter, canvasDiagonalLength * 0.05);
            const stPointLineCanvas1Start = vec2.create();
            const stPointLineCanvas2Start = vec2.create();
            vec2.add(stPointLineCanvas1Start, centerCanvas, canvasVectorFromCenterStart);
            vec2.subtract(stPointLineCanvas2Start, centerCanvas, canvasVectorFromCenterStart);
            const lineSegment1 = {
                start: {
                    x: stPointLineCanvas1Start[0],
                    y: stPointLineCanvas1Start[1],
                },
                end: {
                    x: stPointLineCanvas1[0],
                    y: stPointLineCanvas1[1],
                },
            };
            const distanceToPoint1 = lineSegment.distanceToPoint([lineSegment1.start.x, lineSegment1.start.y], [lineSegment1.end.x, lineSegment1.end.y], [canvasCoords[0], canvasCoords[1]]);
            const lineSegment2 = {
                start: {
                    x: stPointLineCanvas2Start[0],
                    y: stPointLineCanvas2Start[1],
                },
                end: {
                    x: stPointLineCanvas2[0],
                    y: stPointLineCanvas2[1],
                },
            };
            const distanceToPoint2 = lineSegment.distanceToPoint([lineSegment2.start.x, lineSegment2.start.y], [lineSegment2.end.x, lineSegment2.end.y], [canvasCoords[0], canvasCoords[1]]);
            if (distanceToPoint1 <= proximity || distanceToPoint2 <= proximity) {
                viewportIdArray.push(otherViewport.id);
                data.handles.activeOperation = null;
            }
            i++;
        }
        data.activeViewportIds = [...viewportIdArray];
        this.editData = {
            annotation,
        };
        return data.handles.activeOperation === OPERATION.DRAG ? true : false;
    }
}
CrosshairsTool.toolName = 'Crosshairs';
export default CrosshairsTool;
