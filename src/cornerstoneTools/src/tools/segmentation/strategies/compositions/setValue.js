import StrategyCallbacks from '../../../../enums/StrategyCallbacks';
import { triggerEvent, eventTarget } from '@cornerstonejs/core';
export default {
    [StrategyCallbacks.INTERNAL_setValue]: (operationData, { value, index }) => {
        const { segmentsLocked, segmentIndex, previewVoxelManager, previewSegmentIndex, segmentationVoxelManager, } = operationData;
        const existingValue = segmentationVoxelManager.getAtIndex(index);
        let changed = false;
        if (segmentIndex === null) {
            const oldValue = previewVoxelManager.getAtIndex(index);
            if (oldValue !== undefined) {
                changed = previewVoxelManager.setAtIndex(index, oldValue);
            }
            return;
        }
        if (existingValue === segmentIndex || segmentsLocked.includes(value)) {
            return;
        }
        if (existingValue === previewSegmentIndex) {
            if (previewVoxelManager.getAtIndex(index) === undefined) {
                changed = segmentationVoxelManager.setAtIndex(index, segmentIndex);
            }
            else {
                return;
            }
        }
        const useSegmentIndex = previewSegmentIndex ?? segmentIndex;
        changed = previewVoxelManager.setAtIndex(index, useSegmentIndex);
    },
};
