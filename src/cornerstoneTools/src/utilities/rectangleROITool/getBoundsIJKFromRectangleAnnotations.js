import { utilities as csUtils } from '@cornerstonejs/core';
import { getBoundingBoxAroundShapeIJK } from '../boundingBox/getBoundingBoxAroundShape';
import extend2DBoundingBoxInViewAxis from '../boundingBox/extend2DBoundingBoxInViewAxis';
function getBoundsIJKFromRectangleAnnotations(annotations, referenceVolume, options = {}) {
    const AllBoundsIJK = [];
    annotations.forEach((annotation) => {
        const { data } = annotation;
        const { points } = data.handles;
        const { imageData, dimensions } = referenceVolume;
        let pointsToUse = points;
        if (data.cachedStats?.projectionPoints) {
            const { projectionPoints } = data.cachedStats;
            pointsToUse = [].concat(...projectionPoints);
        }
        const rectangleCornersIJK = pointsToUse.map((world) => csUtils.transformWorldToIndex(imageData, world));
        let boundsIJK = getBoundingBoxAroundShapeIJK(rectangleCornersIJK, dimensions);
        if (options.numSlicesToProject && !data.cachedStats?.projectionPoints) {
            boundsIJK = extend2DBoundingBoxInViewAxis(boundsIJK, options.numSlicesToProject);
        }
        AllBoundsIJK.push(boundsIJK);
    });
    if (AllBoundsIJK.length === 1) {
        return AllBoundsIJK[0];
    }
    const boundsIJK = AllBoundsIJK.reduce((accumulator, currentValue) => {
        return {
            iMin: Math.min(accumulator.iMin, currentValue.iMin),
            jMin: Math.min(accumulator.jMin, currentValue.jMin),
            kMin: Math.min(accumulator.kMin, currentValue.kMin),
            iMax: Math.max(accumulator.iMax, currentValue.iMax),
            jMax: Math.max(accumulator.jMax, currentValue.jMax),
            kMax: Math.max(accumulator.kMax, currentValue.kMax),
        };
    }, {
        iMin: Infinity,
        jMin: Infinity,
        kMin: Infinity,
        iMax: -Infinity,
        jMax: -Infinity,
        kMax: -Infinity,
    });
    return boundsIJK;
}
export default getBoundsIJKFromRectangleAnnotations;
