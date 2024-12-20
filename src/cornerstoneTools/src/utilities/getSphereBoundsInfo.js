import { utilities as csUtils } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
import { getBoundingBoxAroundShapeIJK } from './boundingBox';
const { transformWorldToIndex } = csUtils;
function getSphereBoundsInfo(circlePoints, imageData, viewport) {
    const [bottom, top] = circlePoints;
    const centerWorld = vec3.fromValues((bottom[0] + top[0]) / 2, (bottom[1] + top[1]) / 2, (bottom[2] + top[2]) / 2);
    const radiusWorld = vec3.distance(bottom, top) / 2;
    if (!viewport) {
        throw new Error('viewport is required in order to calculate the sphere bounds');
    }
    const { boundsIJK, topLeftWorld, bottomRightWorld } = _computeBoundsIJKWithCamera(imageData, viewport, circlePoints, centerWorld, radiusWorld);
    return {
        boundsIJK,
        centerWorld: centerWorld,
        radiusWorld,
        topLeftWorld: topLeftWorld,
        bottomRightWorld: bottomRightWorld,
    };
}
function _computeBoundsIJKWithCamera(imageData, viewport, circlePoints, centerWorld, radiusWorld) {
    const [bottom, top] = circlePoints;
    const dimensions = imageData.getDimensions();
    const camera = viewport.getCamera();
    const viewUp = vec3.fromValues(camera.viewUp[0], camera.viewUp[1], camera.viewUp[2]);
    const viewPlaneNormal = vec3.fromValues(camera.viewPlaneNormal[0], camera.viewPlaneNormal[1], camera.viewPlaneNormal[2]);
    const viewRight = vec3.create();
    vec3.cross(viewRight, viewUp, viewPlaneNormal);
    const topLeftWorld = vec3.create();
    const bottomRightWorld = vec3.create();
    vec3.scaleAndAdd(topLeftWorld, top, viewPlaneNormal, radiusWorld);
    vec3.scaleAndAdd(bottomRightWorld, bottom, viewPlaneNormal, -radiusWorld);
    vec3.scaleAndAdd(topLeftWorld, topLeftWorld, viewRight, -radiusWorld);
    vec3.scaleAndAdd(bottomRightWorld, bottomRightWorld, viewRight, radiusWorld);
    const topLeftIJK = transformWorldToIndex(imageData, topLeftWorld);
    const bottomRightIJK = transformWorldToIndex(imageData, bottomRightWorld);
    const pointsIJK = circlePoints.map((p) => transformWorldToIndex(imageData, p));
    const boundsIJK = getBoundingBoxAroundShapeIJK([topLeftIJK, bottomRightIJK, ...pointsIJK], dimensions);
    return { boundsIJK, topLeftWorld, bottomRightWorld };
}
export { getSphereBoundsInfo };
