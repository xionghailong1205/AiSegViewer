import { volumeLoader, utilities as csUtils } from '@cornerstonejs/core';
function createMergedLabelmapForIndex(labelmaps, segmentIndex = 1, volumeId = 'mergedLabelmap') {
    labelmaps.forEach(({ direction, dimensions, origin, spacing }) => {
        if (!csUtils.isEqual(dimensions, labelmaps[0].dimensions) ||
            !csUtils.isEqual(direction, labelmaps[0].direction) ||
            !csUtils.isEqual(spacing, labelmaps[0].spacing) ||
            !csUtils.isEqual(origin, labelmaps[0].origin)) {
            throw new Error('labelmaps must have the same size and shape');
        }
    });
    const labelmap = labelmaps[0];
    const arrayType = labelmap.voxelManager.getConstructor();
    const outputData = new arrayType(labelmap.voxelManager.getScalarDataLength());
    labelmaps.forEach((labelmap) => {
        const voxelManager = labelmap.voxelManager;
        const scalarDataLength = voxelManager.getScalarDataLength();
        for (let i = 0; i < scalarDataLength; i++) {
            if (voxelManager.getAtIndex(i) === segmentIndex) {
                outputData[i] = segmentIndex;
            }
        }
    });
    const options = {
        scalarData: outputData,
        metadata: labelmap.metadata,
        spacing: labelmap.spacing,
        origin: labelmap.origin,
        direction: labelmap.direction,
        dimensions: labelmap.dimensions,
    };
    const mergedVolume = volumeLoader.createLocalVolume(volumeId, options);
    return mergedVolume;
}
export default createMergedLabelmapForIndex;
