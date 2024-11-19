import StrategyCallbacks from '../../../../enums/StrategyCallbacks';
export default {
    [StrategyCallbacks.Initialize]: (operationData) => {
        const { strategySpecificConfiguration } = operationData;
        if (!strategySpecificConfiguration) {
            return;
        }
        const { centerSegmentIndex } = strategySpecificConfiguration;
        if (centerSegmentIndex) {
            operationData.segmentIndex = centerSegmentIndex.segmentIndex;
        }
    },
    [StrategyCallbacks.OnInteractionStart]: (operationData) => {
        const { segmentIndex, previewSegmentIndex, segmentationVoxelManager, centerIJK, strategySpecificConfiguration, imageVoxelManager, segmentationImageData, preview, } = operationData;
        if (!strategySpecificConfiguration?.useCenterSegmentIndex) {
            return;
        }
        delete strategySpecificConfiguration.centerSegmentIndex;
        let hasSegmentIndex = false;
        let hasPreviewIndex = false;
        const callback = ({ value }) => {
            hasSegmentIndex ||= value === segmentIndex;
            hasPreviewIndex ||= value === previewSegmentIndex;
        };
        imageVoxelManager.forEach(callback, {
            imageData: segmentationImageData,
            isInObject: operationData.isInObject,
        });
        if (!hasSegmentIndex && !hasPreviewIndex) {
            return;
        }
        let existingValue = segmentationVoxelManager.getAtIJKPoint(centerIJK);
        if (existingValue === previewSegmentIndex) {
            if (preview) {
                existingValue = preview.segmentIndex;
            }
            else {
                return;
            }
        }
        else if (hasPreviewIndex) {
            existingValue = null;
        }
        operationData.segmentIndex = existingValue;
        strategySpecificConfiguration.centerSegmentIndex = {
            segmentIndex: existingValue,
        };
    },
};
