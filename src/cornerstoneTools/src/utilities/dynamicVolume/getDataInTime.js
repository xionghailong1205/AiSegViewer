import { utilities, cache } from '@cornerstonejs/core';
import { getVoxelOverlap } from '../segmentation/utilities';
function getDataInTime(dynamicVolume, options) {
    let dataInTime;
    const frames = options.frameNumbers || [
        ...Array(dynamicVolume.numTimePoints).keys(),
    ];
    if (!options.maskVolumeId && !options.worldCoordinate) {
        throw new Error('You should provide either maskVolumeId or imageCoordinate');
    }
    if (options.maskVolumeId && options.worldCoordinate) {
        throw new Error('You can only use one of maskVolumeId or imageCoordinate');
    }
    if (options.maskVolumeId) {
        const segmentationVolume = cache.getVolume(options.maskVolumeId);
        if (!segmentationVolume) {
            throw new Error('Segmentation volume not found');
        }
        const [dataInTime, ijkCoords] = _getTimePointDataMask(frames, dynamicVolume, segmentationVolume);
        return [dataInTime, ijkCoords];
    }
    if (options.worldCoordinate) {
        const dataInTime = _getTimePointDataCoordinate(frames, options.worldCoordinate, dynamicVolume);
        return dataInTime;
    }
    return dataInTime;
}
function _getTimePointDataCoordinate(frames, coordinate, volume) {
    const { dimensions, imageData } = volume;
    const index = imageData.worldToIndex(coordinate);
    index[0] = Math.floor(index[0]);
    index[1] = Math.floor(index[1]);
    index[2] = Math.floor(index[2]);
    if (!utilities.indexWithinDimensions(index, dimensions)) {
        throw new Error('outside bounds');
    }
    const yMultiple = dimensions[0];
    const zMultiple = dimensions[0] * dimensions[1];
    const value = [];
    frames.forEach((frame) => {
        const scalarIndex = index[2] * zMultiple + index[1] * yMultiple + index[0];
        value.push(volume.voxelManager.getAtIndexAndTimePoint(scalarIndex, frame));
    });
    return value;
}
function _getTimePointDataMask(frames, dynamicVolume, segmentationVolume) {
    const { imageData: maskImageData } = segmentationVolume;
    const segVoxelManager = segmentationVolume.voxelManager;
    const scalarDataLength = segVoxelManager.getScalarDataLength();
    const nonZeroVoxelIndices = [];
    nonZeroVoxelIndices.length = scalarDataLength;
    let actualLen = 0;
    for (let i = 0, len = scalarDataLength; i < len; i++) {
        if (segVoxelManager.getAtIndex(i) !== 0) {
            nonZeroVoxelIndices[actualLen++] = i;
        }
    }
    nonZeroVoxelIndices.length = actualLen;
    const nonZeroVoxelValuesInTime = [];
    const isSameVolume = dynamicVolume.voxelManager.getScalarDataLength() === scalarDataLength &&
        JSON.stringify(dynamicVolume.spacing) ===
            JSON.stringify(segmentationVolume.spacing);
    const ijkCoords = [];
    if (isSameVolume) {
        for (let i = 0; i < nonZeroVoxelIndices.length; i++) {
            const valuesInTime = [];
            const index = nonZeroVoxelIndices[i];
            for (let j = 0; j < frames.length; j++) {
                valuesInTime.push(dynamicVolume.voxelManager.getAtIndexAndTimePoint(index, frames[j]));
            }
            nonZeroVoxelValuesInTime.push(valuesInTime);
            ijkCoords.push(segVoxelManager.toIJK(index));
        }
        return [nonZeroVoxelValuesInTime, ijkCoords];
    }
    const callback = ({ pointLPS: segPointLPS, value: segValue, pointIJK: segPointIJK, }) => {
        if (segValue === 0) {
            return;
        }
        const overlapIJKMinMax = getVoxelOverlap(dynamicVolume.imageData, dynamicVolume.dimensions, dynamicVolume.spacing, segPointLPS);
        let count = 0;
        const perFrameSum = new Map();
        frames.forEach((frame) => perFrameSum.set(frame, 0));
        const averageCallback = ({ index }) => {
            for (let i = 0; i < frames.length; i++) {
                const value = dynamicVolume.voxelManager.getAtIndexAndTimePoint(index, frames[i]);
                const frame = frames[i];
                perFrameSum.set(frame, perFrameSum.get(frame) + value);
            }
            count++;
        };
        dynamicVolume.voxelManager.forEach(averageCallback, {
            imageData: dynamicVolume.imageData,
            boundsIJK: overlapIJKMinMax,
        });
        const averageValues = [];
        perFrameSum.forEach((sum) => {
            averageValues.push(sum / count);
        });
        ijkCoords.push(segPointIJK);
        nonZeroVoxelValuesInTime.push(averageValues);
    };
    segmentationVolume.voxelManager.forEach(callback, {
        imageData: maskImageData,
    });
    return [nonZeroVoxelValuesInTime, ijkCoords];
}
export default getDataInTime;
