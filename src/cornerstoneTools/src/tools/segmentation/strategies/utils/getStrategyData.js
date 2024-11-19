import { BaseVolumeViewport, cache, Enums, eventTarget, } from '@cornerstonejs/core';
import { getCurrentLabelmapImageIdForViewport } from '../../../../stateManagement/segmentation/segmentationState';
import { getLabelmapActorEntry } from '../../../../stateManagement/segmentation/helpers';
function getStrategyData({ operationData, viewport }) {
    let segmentationImageData, segmentationScalarData, imageScalarData;
    let imageVoxelManager;
    let segmentationVoxelManager;
    if (viewport instanceof BaseVolumeViewport) {
        const { volumeId, referencedVolumeId } = operationData;
        if (!volumeId) {
            const event = new CustomEvent(Enums.Events.ERROR_EVENT, {
                detail: {
                    type: 'Segmentation',
                    message: 'No volume id found for the segmentation',
                },
                cancelable: true,
            });
            eventTarget.dispatchEvent(event);
            return null;
        }
        const segmentationVolume = cache.getVolume(volumeId);
        if (!segmentationVolume) {
            return;
        }
        segmentationVoxelManager = segmentationVolume.voxelManager;
        if (referencedVolumeId) {
            const imageVolume = cache.getVolume(referencedVolumeId);
            imageVoxelManager = imageVolume.voxelManager;
        }
        ({ imageData: segmentationImageData } = segmentationVolume);
    }
    else {
        const { segmentationId } = operationData;
        const labelmapImageId = getCurrentLabelmapImageIdForViewport(viewport.id, segmentationId);
        if (!labelmapImageId) {
            return;
        }
        const currentImageId = viewport.getCurrentImageId();
        if (!currentImageId) {
            return;
        }
        const actorEntry = getLabelmapActorEntry(viewport.id, segmentationId);
        if (!actorEntry) {
            return;
        }
        const currentSegImage = cache.getImage(labelmapImageId);
        segmentationImageData = actorEntry.actor.getMapper().getInputData();
        segmentationVoxelManager = currentSegImage.voxelManager;
        const currentSegmentationImageId = operationData.imageId;
        const segmentationImage = cache.getImage(currentSegmentationImageId);
        if (!segmentationImage) {
            return;
        }
        segmentationScalarData = segmentationImage.getPixelData?.();
        const image = cache.getImage(currentImageId);
        const imageData = image ? null : viewport.getImageData();
        imageScalarData = image?.getPixelData() || imageData.getScalarData();
        imageVoxelManager = image?.voxelManager;
    }
    return {
        segmentationImageData,
        segmentationScalarData,
        imageScalarData,
        segmentationVoxelManager,
        imageVoxelManager,
    };
}
export { getStrategyData };
