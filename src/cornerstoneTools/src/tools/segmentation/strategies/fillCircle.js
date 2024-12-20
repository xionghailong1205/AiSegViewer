import { vec3 } from 'gl-matrix';
import { utilities as csUtils } from '@cornerstonejs/core';
import { getCanvasEllipseCorners, precalculatePointInEllipse, } from '../../../utilities/math/ellipse';
import { getBoundingBoxAroundShapeIJK } from '../../../utilities/boundingBox';
import BrushStrategy from './BrushStrategy';
import { StrategyCallbacks } from '../../../enums';
import compositions from './compositions';
import { pointInSphere } from '../../../utilities/math/sphere';
const { transformWorldToIndex, isEqual } = csUtils;
const initializeCircle = {
    [StrategyCallbacks.Initialize]: (operationData) => {
        const { points, viewport, segmentationImageData, } = operationData;
        if (!points) {
            return;
        }
        const center = vec3.fromValues(0, 0, 0);
        points.forEach((point) => {
            vec3.add(center, center, point);
        });
        vec3.scale(center, center, 1 / points.length);
        operationData.centerWorld = center;
        operationData.centerIJK = transformWorldToIndex(segmentationImageData, center);
        const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
        const [topLeftCanvas, bottomRightCanvas] = getCanvasEllipseCorners(canvasCoordinates);
        const topLeftWorld = viewport.canvasToWorld(topLeftCanvas);
        const bottomRightWorld = viewport.canvasToWorld(bottomRightCanvas);
        const circleCornersIJK = points.map((world) => {
            return transformWorldToIndex(segmentationImageData, world);
        });
        const boundsIJK = getBoundingBoxAroundShapeIJK(circleCornersIJK, segmentationImageData.getDimensions());
        operationData.isInObject = createPointInEllipse({
            topLeftWorld,
            bottomRightWorld,
            center,
        });
        operationData.isInObjectBoundsIJK = boundsIJK;
    },
};
function createPointInEllipse(worldInfo) {
    const { topLeftWorld, bottomRightWorld, center } = worldInfo;
    const xRadius = Math.abs(topLeftWorld[0] - bottomRightWorld[0]) / 2;
    const yRadius = Math.abs(topLeftWorld[1] - bottomRightWorld[1]) / 2;
    const zRadius = Math.abs(topLeftWorld[2] - bottomRightWorld[2]) / 2;
    const radius = Math.max(xRadius, yRadius, zRadius);
    if (isEqual(xRadius, radius) &&
        isEqual(yRadius, radius) &&
        isEqual(zRadius, radius)) {
        const sphereObj = {
            center,
            radius,
            radius2: radius * radius,
        };
        return (pointLPS) => pointInSphere(sphereObj, pointLPS);
    }
    const ellipseObj = {
        center: center,
        xRadius,
        yRadius,
        zRadius,
    };
    const { precalculated } = precalculatePointInEllipse(ellipseObj, {});
    return precalculated;
}
const CIRCLE_STRATEGY = new BrushStrategy('Circle', compositions.regionFill, compositions.setValue, initializeCircle, compositions.determineSegmentIndex, compositions.preview);
const CIRCLE_THRESHOLD_STRATEGY = new BrushStrategy('CircleThreshold', compositions.regionFill, compositions.setValue, initializeCircle, compositions.determineSegmentIndex, compositions.dynamicThreshold, compositions.threshold, compositions.preview, compositions.islandRemoval);
const fillInsideCircle = CIRCLE_STRATEGY.strategyFunction;
const thresholdInsideCircle = CIRCLE_THRESHOLD_STRATEGY.strategyFunction;
export function fillOutsideCircle() {
    throw new Error('Not yet implemented');
}
export { CIRCLE_STRATEGY, CIRCLE_THRESHOLD_STRATEGY, fillInsideCircle, thresholdInsideCircle, createPointInEllipse as createEllipseInPoint, };
