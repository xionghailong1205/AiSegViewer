import { getEnabledElementByIds, volumeLoader, VolumeViewport, utilities as csUtils, } from '@cornerstonejs/core';
export default async function createLabelmapVolumeForViewport(input) {
    const { viewportId, renderingEngineId, options } = input;
    let { segmentationId } = input;
    const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
    if (!enabledElement) {
        throw new Error('element disabled');
    }
    const { viewport } = enabledElement;
    if (!(viewport instanceof VolumeViewport)) {
        throw new Error('Segmentation only supports VolumeViewport');
    }
    const { uid } = viewport.getDefaultActor();
    if (segmentationId === undefined) {
        segmentationId = `${uid}-based-segmentation-${options?.volumeId ?? csUtils.uuidv4().slice(0, 8)}`;
    }
    if (options) {
        const properties = structuredClone(options);
        await volumeLoader.createLocalVolume(segmentationId, properties);
    }
    else {
        const volumeId = viewport.getVolumeId();
        await volumeLoader.createAndCacheDerivedLabelmapVolume(volumeId, {
            volumeId: segmentationId,
        });
    }
    return segmentationId;
}
