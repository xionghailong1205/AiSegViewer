import { getEnabledElement, addVolumesToViewports, addImageSlicesToViewports, Enums, cache, BaseVolumeViewport, volumeLoader, utilities, } from '@cornerstonejs/core';
import { getCurrentLabelmapImageIdForViewport } from '../../../stateManagement/segmentation/getCurrentLabelmapImageIdForViewport';
import { getSegmentation } from '../../../stateManagement/segmentation/getSegmentation';
import { triggerSegmentationModified } from '../../../stateManagement/segmentation/triggerSegmentationEvents';
import { SegmentationRepresentations } from '../../../enums';
const { uuidv4 } = utilities;
async function addLabelmapToElement(element, labelMapData, segmentationId) {
    const enabledElement = getEnabledElement(element);
    const { renderingEngine, viewport } = enabledElement;
    const { id: viewportId } = viewport;
    const visibility = true;
    const immediateRender = false;
    const suppressEvents = true;
    if (viewport instanceof BaseVolumeViewport) {
        const volumeLabelMapData = labelMapData;
        const volumeId = _ensureVolumeHasVolumeId(volumeLabelMapData, segmentationId);
        if (!cache.getVolume(volumeId)) {
            await _handleMissingVolume(labelMapData);
        }
        const volumeInputs = [
            {
                volumeId,
                visibility,
                blendMode: Enums.BlendModes.MAXIMUM_INTENSITY_BLEND,
                representationUID: `${segmentationId}-${SegmentationRepresentations.Labelmap}`,
            },
        ];
        await addVolumesToViewports(renderingEngine, volumeInputs, [viewportId], immediateRender, suppressEvents);
    }
    else {
        const segmentationImageId = getCurrentLabelmapImageIdForViewport(viewport.id, segmentationId);
        const stackInputs = [
            {
                imageId: segmentationImageId,
                representationUID: `${segmentationId}-${SegmentationRepresentations.Labelmap}`,
            },
        ];
        await addImageSlicesToViewports(renderingEngine, stackInputs, [viewportId]);
    }
}
function _ensureVolumeHasVolumeId(labelMapData, segmentationId) {
    let { volumeId } = labelMapData;
    if (!volumeId) {
        volumeId = uuidv4();
        const segmentation = getSegmentation(segmentationId);
        segmentation.representationData.Labelmap = {
            ...segmentation.representationData.Labelmap,
            volumeId,
        };
        labelMapData.volumeId = volumeId;
        triggerSegmentationModified(segmentationId);
    }
    return volumeId;
}
async function _handleMissingVolume(labelMapData) {
    const stackData = labelMapData;
    const hasImageIds = stackData.imageIds.length > 0;
    if (!hasImageIds) {
        throw new Error('cannot create labelmap, no imageIds found for the volume labelmap');
    }
    const volume = await volumeLoader.createAndCacheVolumeFromImages(labelMapData.volumeId || uuidv4(), stackData.imageIds);
    return volume;
}
export default addLabelmapToElement;
