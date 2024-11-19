import { cache, utilities as csUtils, VolumeViewport, getEnabledElementByViewportId, StackViewport, } from '@cornerstonejs/core';
import * as SegmentationState from '../../../stateManagement/segmentation/segmentationState';
import { SegmentationRepresentations } from '../../../enums';
import { getLabelmapActorEntry } from '../../../stateManagement/segmentation/helpers/getSegmentationActor';
const onLabelmapSegmentationDataModified = function (evt) {
    const { segmentationId, modifiedSlicesToUse } = evt.detail;
    const { representationData } = SegmentationState.getSegmentation(segmentationId);
    const viewportIds = SegmentationState.getViewportIdsWithSegmentation(segmentationId);
    const hasVolumeViewport = viewportIds.some((viewportId) => {
        const { viewport } = getEnabledElementByViewportId(viewportId);
        return viewport instanceof VolumeViewport;
    });
    const hasStackViewport = viewportIds.some((viewportId) => {
        const { viewport } = getEnabledElementByViewportId(viewportId);
        return viewport instanceof StackViewport;
    });
    const hasBothStackAndVolume = hasVolumeViewport && hasStackViewport;
    viewportIds.forEach((viewportId) => {
        const { viewport } = getEnabledElementByViewportId(viewportId);
        if (viewport instanceof VolumeViewport) {
            performVolumeLabelmapUpdate({
                modifiedSlicesToUse: hasBothStackAndVolume ? [] : modifiedSlicesToUse,
                representationData,
                type: SegmentationRepresentations.Labelmap,
            });
        }
        if (viewport instanceof StackViewport) {
            performStackLabelmapUpdate({
                viewportIds,
                segmentationId,
            });
        }
    });
};
function performVolumeLabelmapUpdate({ modifiedSlicesToUse, representationData, type, }) {
    const segmentationVolume = cache.getVolume(representationData[type].volumeId);
    if (!segmentationVolume) {
        console.warn('segmentation not found in cache');
        return;
    }
    const { imageData, vtkOpenGLTexture } = segmentationVolume;
    let slicesToUpdate;
    if (modifiedSlicesToUse?.length > 0) {
        slicesToUpdate = modifiedSlicesToUse;
    }
    else {
        const numSlices = imageData.getDimensions()[2];
        slicesToUpdate = [...Array(numSlices).keys()];
    }
    slicesToUpdate.forEach((i) => {
        vtkOpenGLTexture.setUpdatedFrame(i);
    });
    imageData.modified();
}
function performStackLabelmapUpdate({ viewportIds, segmentationId }) {
    viewportIds.forEach((viewportId) => {
        let representations = SegmentationState.getSegmentationRepresentations(viewportId, { segmentationId });
        representations = representations.filter((representation) => representation.type === SegmentationRepresentations.Labelmap);
        representations.forEach((representation) => {
            if (representation.segmentationId !== segmentationId) {
                return;
            }
            const enabledElement = getEnabledElementByViewportId(viewportId);
            if (!enabledElement) {
                return;
            }
            const { viewport } = enabledElement;
            if (viewport instanceof VolumeViewport) {
                return;
            }
            const actorEntry = getLabelmapActorEntry(viewportId, segmentationId);
            if (!actorEntry) {
                return;
            }
            const segImageData = actorEntry.actor.getMapper().getInputData();
            const currentSegmentationImageId = SegmentationState.getCurrentLabelmapImageIdForViewport(viewportId, segmentationId);
            const segmentationImage = cache.getImage(currentSegmentationImageId);
            segImageData.modified();
            csUtils.updateVTKImageDataWithCornerstoneImage(segImageData, segmentationImage);
        });
    });
}
export default onLabelmapSegmentationDataModified;
