import { cache, getEnabledElement, utilities as csUtils, BaseVolumeViewport, } from '@cornerstonejs/core';
import { BaseTool } from '../base';
import { SegmentationRepresentations } from '../../enums';
import { triggerSegmentationDataModified } from '../../stateManagement/segmentation/triggerSegmentationEvents';
import { segmentLocking, activeSegmentation, segmentIndex as segmentIndexController, } from '../../stateManagement/segmentation';
import floodFill from '../../utilities/segmentation/floodFill';
import { getCurrentLabelmapImageIdForViewport, getSegmentation, } from '../../stateManagement/segmentation/segmentationState';
const { transformWorldToIndex, isEqual } = csUtils;
class PaintFillTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
    }) {
        super(toolProps, defaultToolProps);
        this.preMouseDownCallback = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            const camera = viewport.getCamera();
            const { viewPlaneNormal } = camera;
            const activeSegmentationRepresentation = activeSegmentation.getActiveSegmentation(viewport.id);
            if (!activeSegmentationRepresentation) {
                throw new Error('No active segmentation detected, create one before using scissors tool');
            }
            const { segmentationId } = activeSegmentationRepresentation;
            const segmentIndex = segmentIndexController.getActiveSegmentIndex(segmentationId);
            const segmentsLocked = segmentLocking.getLockedSegmentIndices(segmentationId);
            const { representationData } = getSegmentation(segmentationId);
            let dimensions;
            let direction;
            let scalarData;
            let index;
            let voxelManager;
            if (viewport instanceof BaseVolumeViewport) {
                const { volumeId } = representationData[SegmentationRepresentations.Labelmap];
                const segmentation = cache.getVolume(volumeId);
                ({ dimensions, direction } = segmentation);
                voxelManager = segmentation.voxelManager;
                index = transformWorldToIndex(segmentation.imageData, worldPos);
            }
            else {
                const currentSegmentationImageId = getCurrentLabelmapImageIdForViewport(viewport.id, segmentationId);
                if (!currentSegmentationImageId) {
                    throw new Error('No active segmentation imageId detected, create one before using scissors tool');
                }
                const { imageData } = viewport.getImageData();
                dimensions = imageData.getDimensions();
                direction = imageData.getDirection();
                const image = cache.getImage(currentSegmentationImageId);
                voxelManager = image.voxelManager;
                index = transformWorldToIndex(imageData, worldPos);
            }
            const fixedDimension = this.getFixedDimension(viewPlaneNormal, direction);
            if (fixedDimension === undefined) {
                console.warn('Oblique paint fill not yet supported');
                return;
            }
            const { floodFillGetter, getLabelValue, getScalarDataPositionFromPlane, inPlaneSeedPoint, fixedDimensionValue, } = this.generateHelpers(voxelManager, dimensions, index, fixedDimension);
            if (index[0] < 0 ||
                index[0] >= dimensions[0] ||
                index[1] < 0 ||
                index[1] >= dimensions[1] ||
                index[2] < 0 ||
                index[2] >= dimensions[2]) {
                return;
            }
            const clickedLabelValue = getLabelValue(index[0], index[1], index[2]);
            if (segmentsLocked.includes(clickedLabelValue)) {
                return;
            }
            const floodFillResult = floodFill(floodFillGetter, inPlaneSeedPoint);
            const { flooded } = floodFillResult;
            flooded.forEach((index) => {
                const scalarDataIndex = getScalarDataPositionFromPlane(index[0], index[1]);
                voxelManager.setAtIndex(scalarDataIndex, segmentIndex);
            });
            const framesModified = this.getFramesModified(fixedDimension, fixedDimensionValue, floodFillResult);
            triggerSegmentationDataModified(segmentationId, framesModified);
            return true;
        };
        this.getFramesModified = (fixedDimension, fixedDimensionValue, floodFillResult) => {
            const { boundaries } = floodFillResult;
            if (fixedDimension === 2) {
                return [fixedDimensionValue];
            }
            let minJ = Infinity;
            let maxJ = -Infinity;
            for (let b = 0; b < boundaries.length; b++) {
                const j = boundaries[b][1];
                if (j < minJ) {
                    minJ = j;
                }
                if (j > maxJ) {
                    maxJ = j;
                }
            }
            const framesModified = [];
            for (let frame = minJ; frame <= maxJ; frame++) {
                framesModified.push(frame);
            }
            return framesModified;
        };
        this.generateHelpers = (voxelManager, dimensions, seedIndex3D, fixedDimension = 2) => {
            let fixedDimensionValue;
            let inPlaneSeedPoint;
            switch (fixedDimension) {
                case 0:
                    fixedDimensionValue = seedIndex3D[0];
                    inPlaneSeedPoint = [seedIndex3D[1], seedIndex3D[2]];
                    break;
                case 1:
                    fixedDimensionValue = seedIndex3D[1];
                    inPlaneSeedPoint = [seedIndex3D[0], seedIndex3D[2]];
                    break;
                case 2:
                    fixedDimensionValue = seedIndex3D[2];
                    inPlaneSeedPoint = [seedIndex3D[0], seedIndex3D[1]];
                    break;
                default:
                    throw new Error(`Invalid fixedDimension: ${fixedDimension}`);
            }
            const getScalarDataPosition = (x, y, z) => {
                return voxelManager.toIndex([x, y, z]);
            };
            const getLabelValue = (x, y, z) => {
                return voxelManager.getAtIJK(x, y, z);
            };
            const floodFillGetter = this.generateFloodFillGetter(dimensions, fixedDimension, fixedDimensionValue, getLabelValue);
            const getScalarDataPositionFromPlane = this.generateGetScalarDataPositionFromPlane(getScalarDataPosition, fixedDimension, fixedDimensionValue);
            return {
                getScalarDataPositionFromPlane,
                getLabelValue,
                floodFillGetter,
                inPlaneSeedPoint,
                fixedDimensionValue,
            };
        };
        this.generateFloodFillGetter = (dimensions, fixedDimension, fixedDimensionValue, getLabelValue) => {
            let floodFillGetter;
            switch (fixedDimension) {
                case 0:
                    floodFillGetter = (y, z) => {
                        if (y >= dimensions[1] || y < 0 || z >= dimensions[2] || z < 0) {
                            return;
                        }
                        return getLabelValue(fixedDimensionValue, y, z);
                    };
                    break;
                case 1:
                    floodFillGetter = (x, z) => {
                        if (x >= dimensions[0] || x < 0 || z >= dimensions[2] || z < 0) {
                            return;
                        }
                        return getLabelValue(x, fixedDimensionValue, z);
                    };
                    break;
                case 2:
                    floodFillGetter = (x, y) => {
                        if (x >= dimensions[0] || x < 0 || y >= dimensions[1] || y < 0) {
                            return;
                        }
                        return getLabelValue(x, y, fixedDimensionValue);
                    };
                    break;
                default:
                    throw new Error(`Invalid fixedDimension: ${fixedDimension}`);
            }
            return floodFillGetter;
        };
        this.generateGetScalarDataPositionFromPlane = (getScalarDataPosition, fixedDimension, fixedDimensionValue) => {
            let getScalarDataPositionFromPlane;
            switch (fixedDimension) {
                case 0:
                    getScalarDataPositionFromPlane = (y, z) => {
                        return getScalarDataPosition(fixedDimensionValue, y, z);
                    };
                    break;
                case 1:
                    getScalarDataPositionFromPlane = (x, z) => {
                        return getScalarDataPosition(x, fixedDimensionValue, z);
                    };
                    break;
                case 2:
                    getScalarDataPositionFromPlane = (x, y) => {
                        return getScalarDataPosition(x, y, fixedDimensionValue);
                    };
                    break;
                default:
                    throw new Error(`Invalid fixedDimension: ${fixedDimension}`);
            }
            return getScalarDataPositionFromPlane;
        };
    }
    getFixedDimension(viewPlaneNormal, direction) {
        const xDirection = direction.slice(0, 3);
        const yDirection = direction.slice(3, 6);
        const zDirection = direction.slice(6, 9);
        const absoluteOfViewPlaneNormal = [
            Math.abs(viewPlaneNormal[0]),
            Math.abs(viewPlaneNormal[1]),
            Math.abs(viewPlaneNormal[2]),
        ];
        const absoluteOfXDirection = [
            Math.abs(xDirection[0]),
            Math.abs(xDirection[1]),
            Math.abs(xDirection[2]),
        ];
        if (isEqual(absoluteOfViewPlaneNormal, absoluteOfXDirection)) {
            return 0;
        }
        const absoluteOfYDirection = [
            Math.abs(yDirection[0]),
            Math.abs(yDirection[1]),
            Math.abs(yDirection[2]),
        ];
        if (isEqual(absoluteOfViewPlaneNormal, absoluteOfYDirection)) {
            return 1;
        }
        const absoluteOfZDirection = [
            Math.abs(zDirection[0]),
            Math.abs(zDirection[1]),
            Math.abs(zDirection[2]),
        ];
        if (isEqual(absoluteOfViewPlaneNormal, absoluteOfZDirection)) {
            return 2;
        }
    }
}
PaintFillTool.toolName = 'PaintFill';
export default PaintFillTool;
