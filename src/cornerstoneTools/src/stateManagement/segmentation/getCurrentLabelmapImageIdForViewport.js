import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getCurrentLabelmapImageIdForViewport(viewportId, segmentationId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.getCurrentLabelmapImageIdForViewport(viewportId, segmentationId);
}
