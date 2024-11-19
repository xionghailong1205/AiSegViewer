import { defaultSegmentationStateManager } from './SegmentationStateManager';
import { triggerSegmentationRemoved } from './triggerSegmentationEvents';
import { removeSegmentationRepresentations } from './removeSegmentationRepresentations';
export function removeSegmentation(segmentationId) {
    const segmentationStateManager = defaultSegmentationStateManager;
    const viewportsWithSegmentation = segmentationStateManager
        .getAllViewportSegmentationRepresentations()
        .filter(({ representations }) => representations.some((rep) => rep.segmentationId === segmentationId))
        .map(({ viewportId }) => viewportId);
    viewportsWithSegmentation.forEach((viewportId) => {
        removeSegmentationRepresentations(viewportId, { segmentationId });
    });
    segmentationStateManager.removeSegmentation(segmentationId);
    triggerSegmentationRemoved(segmentationId);
}
export function removeAllSegmentations() {
    const segmentationStateManager = defaultSegmentationStateManager;
    const segmentations = segmentationStateManager.getState().segmentations;
    segmentations.forEach((segmentation) => {
        removeSegmentation(segmentation.segmentationId);
    });
    segmentationStateManager.resetState();
}
