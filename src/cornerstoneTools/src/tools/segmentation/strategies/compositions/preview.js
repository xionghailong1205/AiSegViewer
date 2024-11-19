import { triggerSegmentationDataModified } from '../../../../stateManagement/segmentation/events/triggerSegmentationDataModified';
import StrategyCallbacks from '../../../../enums/StrategyCallbacks';
import { getSegmentIndexColor, setSegmentIndexColor, } from '../../../../stateManagement/segmentation/config/segmentationColor';
function lightenColor(r, g, b, a, factor = 0.4) {
    return [
        Math.round(r + (255 - r) * factor),
        Math.round(g + (255 - g) * factor),
        Math.round(b + (255 - b) * factor),
        a,
    ];
}
export default {
    [StrategyCallbacks.Preview]: function (operationData) {
        const { previewColors, strategySpecificConfiguration, enabledElement } = operationData;
        if (!previewColors || !strategySpecificConfiguration) {
            return;
        }
        if (operationData.preview) {
            delete operationData.preview;
        }
        delete strategySpecificConfiguration.centerSegmentIndex;
        this.onInteractionStart?.(enabledElement, operationData);
        const preview = this.fill(enabledElement, operationData);
        if (preview) {
            preview.isPreviewFromHover = true;
            operationData.preview = preview;
            this.onInteractionEnd?.(enabledElement, operationData);
        }
        return preview;
    },
    [StrategyCallbacks.Initialize]: (operationData) => {
        const { segmentIndex, previewSegmentIndex, previewColors, preview } = operationData;
        if (previewColors === undefined) {
            return;
        }
        if (preview) {
            preview.previewVoxelManager.sourceVoxelManager =
                operationData.segmentationVoxelManager;
            operationData.previewVoxelManager = preview.previewVoxelManager;
        }
        if (segmentIndex === null || !previewSegmentIndex) {
            return;
        }
        const configColor = previewColors?.[segmentIndex];
        const segmentColor = getSegmentIndexColor(operationData.viewport.id, operationData.segmentationId, segmentIndex);
        if (!configColor && !segmentColor) {
            return;
        }
        const previewColor = configColor || lightenColor(...segmentColor);
        setSegmentIndexColor(operationData.viewport.id, operationData.segmentationId, previewSegmentIndex, previewColor);
    },
    [StrategyCallbacks.AcceptPreview]: (operationData) => {
        const { segmentationVoxelManager, previewVoxelManager: previewVoxelManager, previewSegmentIndex, preview, } = operationData || {};
        if (previewSegmentIndex === undefined) {
            return;
        }
        const segmentIndex = preview?.segmentIndex ?? operationData.segmentIndex;
        const tracking = previewVoxelManager;
        if (!tracking || tracking.modifiedSlices.size === 0) {
            return;
        }
        const callback = ({ index }) => {
            const oldValue = segmentationVoxelManager.getAtIndex(index);
            if (oldValue === previewSegmentIndex) {
                segmentationVoxelManager.setAtIndex(index, segmentIndex);
            }
        };
        tracking.forEach(callback, {});
        triggerSegmentationDataModified(operationData.segmentationId, tracking.getArrayOfModifiedSlices());
        tracking.clear();
    },
    [StrategyCallbacks.RejectPreview]: (operationData) => {
        const { previewVoxelManager: previewVoxelManager, segmentationVoxelManager, } = operationData;
        if (previewVoxelManager.modifiedSlices.size === 0) {
            return;
        }
        const callback = ({ index, value }) => {
            segmentationVoxelManager.setAtIndex(index, value);
        };
        previewVoxelManager.forEach(callback);
        triggerSegmentationDataModified(operationData.segmentationId, previewVoxelManager.getArrayOfModifiedSlices());
        previewVoxelManager.clear();
    },
};
