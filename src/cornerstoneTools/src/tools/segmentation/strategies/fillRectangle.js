import { utilities as csUtils, StackViewport } from '@cornerstonejs/core';
import { getBoundingBoxAroundShapeIJK, getBoundingBoxAroundShapeWorld, } from '../../../utilities/boundingBox';
import { triggerSegmentationDataModified } from '../../../stateManagement/segmentation/triggerSegmentationEvents';
import { getStrategyData } from './utils/getStrategyData';
import { isAxisAlignedRectangle } from '../../../utilities/rectangleROITool/isAxisAlignedRectangle';
const { transformWorldToIndex } = csUtils;
function fillRectangle(enabledElement, operationData) {
    const { points, segmentsLocked, segmentIndex, segmentationId } = operationData;
    const { viewport } = enabledElement;
    const strategyData = getStrategyData({
        operationData,
        viewport: enabledElement.viewport,
    });
    if (!strategyData) {
        console.warn('No data found for fillRectangle');
        return;
    }
    const { segmentationImageData, segmentationVoxelManager } = strategyData;
    let rectangleCornersIJK = points.map((world) => {
        return transformWorldToIndex(segmentationImageData, world);
    });
    rectangleCornersIJK = rectangleCornersIJK.map((point) => {
        return point.map((coord) => {
            return Math.round(coord);
        });
    });
    const boundsIJK = getBoundingBoxAroundShapeIJK(rectangleCornersIJK, segmentationImageData.getDimensions());
    const isStackViewport = viewport instanceof StackViewport;
    const isAligned = isStackViewport || isAxisAlignedRectangle(rectangleCornersIJK);
    const direction = segmentationImageData.getDirection();
    const spacing = segmentationImageData.getSpacing();
    const { viewPlaneNormal } = viewport.getCamera();
    const EPS = csUtils.getSpacingInNormalDirection({
        direction,
        spacing,
    }, viewPlaneNormal);
    const pointsBoundsLPS = getBoundingBoxAroundShapeWorld(points);
    let [[xMin, xMax], [yMin, yMax], [zMin, zMax]] = pointsBoundsLPS;
    xMin -= EPS;
    xMax += EPS;
    yMin -= EPS;
    yMax += EPS;
    zMin -= EPS;
    zMax += EPS;
    const pointInShapeFn = isAligned
        ? () => true
        : (pointLPS) => {
            const [x, y, z] = pointLPS;
            const xInside = x >= xMin && x <= xMax;
            const yInside = y >= yMin && y <= yMax;
            const zInside = z >= zMin && z <= zMax;
            return xInside && yInside && zInside;
        };
    const callback = ({ value, index }) => {
        if (segmentsLocked.includes(value)) {
            return;
        }
        segmentationVoxelManager.setAtIndex(index, segmentIndex);
    };
    segmentationVoxelManager.forEach(callback, {
        isInObject: pointInShapeFn,
        boundsIJK,
        imageData: segmentationImageData,
    });
    triggerSegmentationDataModified(segmentationId);
}
export function fillInsideRectangle(enabledElement, operationData) {
    fillRectangle(enabledElement, operationData);
}
export function fillOutsideRectangle(enabledElement, operationData) {
    fillRectangle(enabledElement, operationData);
}
