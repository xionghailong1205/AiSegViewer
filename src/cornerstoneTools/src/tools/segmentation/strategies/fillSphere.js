import { utilities as csUtils } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
import BrushStrategy from './BrushStrategy';
import compositions from './compositions';
import StrategyCallbacks from '../../../enums/StrategyCallbacks';
import { createEllipseInPoint } from './fillCircle';
const { transformWorldToIndex } = csUtils;
import { getSphereBoundsInfo } from '../../../utilities/getSphereBoundsInfo';
const sphereComposition = {
    [StrategyCallbacks.Initialize]: (operationData) => {
        const { points, viewport, segmentationImageData } = operationData;
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
        const { boundsIJK: newBoundsIJK, topLeftWorld, bottomRightWorld, } = getSphereBoundsInfo(points.slice(0, 2), segmentationImageData, viewport);
        operationData.isInObjectBoundsIJK = newBoundsIJK;
        operationData.isInObject = createEllipseInPoint({
            topLeftWorld,
            bottomRightWorld,
            center,
        });
    },
};
const SPHERE_STRATEGY = new BrushStrategy('Sphere', compositions.regionFill, compositions.setValue, sphereComposition, compositions.determineSegmentIndex, compositions.preview);
const fillInsideSphere = SPHERE_STRATEGY.strategyFunction;
const SPHERE_THRESHOLD_STRATEGY = new BrushStrategy('SphereThreshold', ...SPHERE_STRATEGY.compositions, compositions.dynamicThreshold, compositions.threshold, compositions.islandRemoval);
const thresholdInsideSphere = SPHERE_THRESHOLD_STRATEGY.strategyFunction;
export function fillOutsideSphere() {
    throw new Error('fill outside sphere not implemented');
}
export { fillInsideSphere, thresholdInsideSphere, SPHERE_STRATEGY };
