import { BaseTool } from './base';
import { getEnabledElement } from '@cornerstonejs/core';
import { mat4, vec3 } from 'gl-matrix';
const DIRECTIONS = {
    X: [1, 0, 0],
    Y: [0, 1, 0],
    Z: [0, 0, 1],
    CUSTOM: [],
};
class VolumeRotateTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            direction: DIRECTIONS.Z,
            rotateIncrementDegrees: 30,
        },
    }) {
        super(toolProps, defaultToolProps);
    }
    mouseWheelCallback(evt) {
        const { element, wheel } = evt.detail;
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const { direction, rotateIncrementDegrees } = this.configuration;
        const camera = viewport.getCamera();
        const { viewUp, position, focalPoint } = camera;
        const { direction: deltaY } = wheel;
        const [cx, cy, cz] = focalPoint;
        const [ax, ay, az] = direction;
        const angle = (deltaY * (rotateIncrementDegrees * Math.PI)) / 180;
        const newPosition = [0, 0, 0];
        const newFocalPoint = [0, 0, 0];
        const newViewUp = [0, 0, 0];
        const transform = mat4.identity(new Float32Array(16));
        mat4.translate(transform, transform, [cx, cy, cz]);
        mat4.rotate(transform, transform, angle, [ax, ay, az]);
        mat4.translate(transform, transform, [-cx, -cy, -cz]);
        vec3.transformMat4(newPosition, position, transform);
        vec3.transformMat4(newFocalPoint, focalPoint, transform);
        mat4.identity(transform);
        mat4.rotate(transform, transform, angle, [ax, ay, az]);
        vec3.transformMat4(newViewUp, viewUp, transform);
        viewport.setCamera({
            position: newPosition,
            viewUp: newViewUp,
            focalPoint: newFocalPoint,
        });
        viewport.render();
    }
}
VolumeRotateTool.toolName = 'VolumeRotateMouseWheel';
export default VolumeRotateTool;
