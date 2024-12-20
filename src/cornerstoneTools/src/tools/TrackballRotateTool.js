import vtkMath from '@kitware/vtk.js/Common/Core/Math';
import { Events } from '../enums';
import { eventTarget, getEnabledElement, getEnabledElementByIds, } from '@cornerstonejs/core';
import { mat4, vec3 } from 'gl-matrix';
import { BaseTool } from './base';
import { getToolGroup } from '../store/ToolGroupManager';
class TrackballRotateTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            rotateIncrementDegrees: 2,
        },
    }) {
        super(toolProps, defaultToolProps);
        this._resizeObservers = new Map();
        this._hasResolutionChanged = false;
        this.preMouseDownCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            const actorEntry = viewport.getDefaultActor();
            const actor = actorEntry.actor;
            const mapper = actor.getMapper();
            const hasSampleDistance = 'getSampleDistance' in mapper || 'getCurrentSampleDistance' in mapper;
            if (!hasSampleDistance) {
                return true;
            }
            const originalSampleDistance = mapper.getSampleDistance();
            if (!this._hasResolutionChanged) {
                mapper.setSampleDistance(originalSampleDistance * 2);
                this._hasResolutionChanged = true;
                if (this.cleanUp !== null) {
                    document.removeEventListener('mouseup', this.cleanUp);
                }
                this.cleanUp = () => {
                    mapper.setSampleDistance(originalSampleDistance);
                    viewport.render();
                    this._hasResolutionChanged = false;
                };
                document.addEventListener('mouseup', this.cleanUp, { once: true });
            }
            return true;
        };
        this._getViewportsInfo = () => {
            const viewports = getToolGroup(this.toolGroupId).viewportsInfo;
            return viewports;
        };
        this.onSetToolActive = () => {
            const subscribeToElementResize = () => {
                const viewportsInfo = this._getViewportsInfo();
                viewportsInfo.forEach(({ viewportId, renderingEngineId }) => {
                    if (!this._resizeObservers.has(viewportId)) {
                        const { viewport } = getEnabledElementByIds(viewportId, renderingEngineId) || { viewport: null };
                        if (!viewport) {
                            return;
                        }
                        const { element } = viewport;
                        const resizeObserver = new ResizeObserver(() => {
                            const element = getEnabledElementByIds(viewportId, renderingEngineId);
                            if (!element) {
                                return;
                            }
                            const { viewport } = element;
                            viewport.resetCamera();
                            viewport.render();
                        });
                        resizeObserver.observe(element);
                        this._resizeObservers.set(viewportId, resizeObserver);
                    }
                });
            };
            subscribeToElementResize();
            this._viewportAddedListener = (evt) => {
                if (evt.detail.toolGroupId === this.toolGroupId) {
                    subscribeToElementResize();
                }
            };
            eventTarget.addEventListener(Events.TOOLGROUP_VIEWPORT_ADDED, this._viewportAddedListener);
        };
        this.onSetToolDisabled = () => {
            this._resizeObservers.forEach((resizeObserver, viewportId) => {
                resizeObserver.disconnect();
                this._resizeObservers.delete(viewportId);
            });
            if (this._viewportAddedListener) {
                eventTarget.removeEventListener(Events.TOOLGROUP_VIEWPORT_ADDED, this._viewportAddedListener);
                this._viewportAddedListener = null;
            }
        };
        this.rotateCamera = (viewport, centerWorld, axis, angle) => {
            const vtkCamera = viewport.getVtkActiveCamera();
            const viewUp = vtkCamera.getViewUp();
            const focalPoint = vtkCamera.getFocalPoint();
            const position = vtkCamera.getPosition();
            const newPosition = [0, 0, 0];
            const newFocalPoint = [0, 0, 0];
            const newViewUp = [0, 0, 0];
            const transform = mat4.identity(new Float32Array(16));
            mat4.translate(transform, transform, centerWorld);
            mat4.rotate(transform, transform, angle, axis);
            mat4.translate(transform, transform, [
                -centerWorld[0],
                -centerWorld[1],
                -centerWorld[2],
            ]);
            vec3.transformMat4(newPosition, position, transform);
            vec3.transformMat4(newFocalPoint, focalPoint, transform);
            mat4.identity(transform);
            mat4.rotate(transform, transform, angle, axis);
            vec3.transformMat4(newViewUp, viewUp, transform);
            viewport.setCamera({
                position: newPosition,
                viewUp: newViewUp,
                focalPoint: newFocalPoint,
            });
        };
        this.touchDragCallback = this._dragCallback.bind(this);
        this.mouseDragCallback = this._dragCallback.bind(this);
    }
    _dragCallback(evt) {
        const { element, currentPoints, lastPoints } = evt.detail;
        const currentPointsCanvas = currentPoints.canvas;
        const lastPointsCanvas = lastPoints.canvas;
        const { rotateIncrementDegrees } = this.configuration;
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const camera = viewport.getCamera();
        const width = element.clientWidth;
        const height = element.clientHeight;
        const normalizedPosition = [
            currentPointsCanvas[0] / width,
            currentPointsCanvas[1] / height,
        ];
        const normalizedPreviousPosition = [
            lastPointsCanvas[0] / width,
            lastPointsCanvas[1] / height,
        ];
        const center = [width * 0.5, height * 0.5];
        const centerWorld = viewport.canvasToWorld(center);
        const normalizedCenter = [0.5, 0.5];
        const radsq = (1.0 + Math.abs(normalizedCenter[0])) ** 2.0;
        const op = [normalizedPreviousPosition[0], 0, 0];
        const oe = [normalizedPosition[0], 0, 0];
        const opsq = op[0] ** 2;
        const oesq = oe[0] ** 2;
        const lop = opsq > radsq ? 0 : Math.sqrt(radsq - opsq);
        const loe = oesq > radsq ? 0 : Math.sqrt(radsq - oesq);
        const nop = [op[0], 0, lop];
        vtkMath.normalize(nop);
        const noe = [oe[0], 0, loe];
        vtkMath.normalize(noe);
        const dot = vtkMath.dot(nop, noe);
        if (Math.abs(dot) > 0.0001) {
            const angleX = -2 *
                Math.acos(vtkMath.clampValue(dot, -1.0, 1.0)) *
                Math.sign(normalizedPosition[0] - normalizedPreviousPosition[0]) *
                rotateIncrementDegrees;
            const upVec = camera.viewUp;
            const atV = camera.viewPlaneNormal;
            const rightV = [0, 0, 0];
            const forwardV = [0, 0, 0];
            vtkMath.cross(upVec, atV, rightV);
            vtkMath.normalize(rightV);
            vtkMath.cross(atV, rightV, forwardV);
            vtkMath.normalize(forwardV);
            vtkMath.normalize(upVec);
            this.rotateCamera(viewport, centerWorld, forwardV, angleX);
            const angleY = (normalizedPreviousPosition[1] - normalizedPosition[1]) *
                rotateIncrementDegrees;
            this.rotateCamera(viewport, centerWorld, rightV, angleY);
            viewport.render();
        }
    }
}
TrackballRotateTool.toolName = 'TrackballRotate';
export default TrackballRotateTool;
