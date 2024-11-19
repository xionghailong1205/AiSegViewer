import { Enums } from '@cornerstonejs/core';
function sumOverFrames(voxelManager, frames) {
    const arrayLength = voxelManager.getScalarDataLength();
    const resultArray = new Float32Array(arrayLength);
    for (const timepoint of frames) {
        const scalarData = voxelManager.getTimePointScalarData(timepoint);
        for (let i = 0; i < arrayLength; i++) {
            resultArray[i] += scalarData[i];
        }
    }
    return resultArray;
}
function averageOverFrames(voxelManager, frames) {
    const sumArray = sumOverFrames(voxelManager, frames);
    const numFrames = frames.length;
    for (let i = 0; i < sumArray.length; i++) {
        sumArray[i] /= numFrames;
    }
    return sumArray;
}
const operationFunctions = {
    [Enums.GenerateImageType.SUM]: (voxelManager, frames, callback) => {
        const resultArray = sumOverFrames(voxelManager, frames);
        for (let i = 0; i < resultArray.length; i++) {
            callback(i, resultArray[i]);
        }
    },
    [Enums.GenerateImageType.AVERAGE]: (voxelManager, frames, callback) => {
        const resultArray = averageOverFrames(voxelManager, frames);
        for (let i = 0; i < resultArray.length; i++) {
            callback(i, resultArray[i]);
        }
    },
    [Enums.GenerateImageType.SUBTRACT]: (voxelManager, frames, callback) => {
        if (frames.length !== 2) {
            throw new Error('Please provide only 2 time points for subtraction.');
        }
        const arrayLength = voxelManager.getScalarDataLength();
        const scalarData1 = voxelManager.getTimePointScalarData(frames[0]);
        const scalarData2 = voxelManager.getTimePointScalarData(frames[1]);
        for (let i = 0; i < arrayLength; i++) {
            const difference = scalarData1[i] - scalarData2[i];
            callback(i, difference);
        }
    },
};
function generateImageFromTimeData(dynamicVolume, operation, options) {
    const { frameNumbers } = options;
    const frames = frameNumbers || [...Array(dynamicVolume.numTimePoints).keys()];
    if (frames.length <= 1) {
        throw new Error('Please provide two or more time points');
    }
    const voxelManager = dynamicVolume.voxelManager;
    const arrayLength = voxelManager.getScalarDataLength();
    const operationFunction = operationFunctions[operation];
    if (!operationFunction) {
        throw new Error(`Unsupported operation: ${operation}`);
    }
    const resultArray = new Float32Array(arrayLength);
    operationFunction(voxelManager, frames, (index, value) => {
        resultArray[index] = value;
    });
    return resultArray;
}
function updateVolumeFromTimeData(dynamicVolume, operation, options) {
    const { frameNumbers, targetVolume } = options;
    if (!targetVolume) {
        throw new Error('A target volume must be provided');
    }
    const frames = frameNumbers || [...Array(dynamicVolume.numTimePoints).keys()];
    if (frames.length <= 1) {
        throw new Error('Please provide two or more time points');
    }
    const voxelManager = dynamicVolume.voxelManager;
    const targetVoxelManager = targetVolume.voxelManager;
    const operationFunction = operationFunctions[operation];
    if (!operationFunction) {
        throw new Error(`Unsupported operation: ${operation}`);
    }
    operationFunction(voxelManager, frames, (index, value) => {
        targetVoxelManager.setAtIndex(index, value);
    });
    targetVoxelManager.resetModifiedSlices();
    for (let k = 0; k < targetVolume.dimensions[2]; k++) {
        targetVoxelManager.modifiedSlices.add(k);
    }
}
export { generateImageFromTimeData, updateVolumeFromTimeData };
