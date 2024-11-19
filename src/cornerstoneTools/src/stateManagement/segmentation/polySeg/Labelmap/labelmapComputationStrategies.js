import { VolumeViewport, volumeLoader, imageLoader } from '@cornerstonejs/core';
import { getUniqueSegmentIndices } from '../../../../utilities/segmentation/getUniqueSegmentIndices';
import { getSegmentation } from '../../getSegmentation';
import { convertContourToStackLabelmap, convertContourToVolumeLabelmap, } from './convertContourToLabelmap';
import { convertSurfaceToVolumeLabelmap } from './convertSurfaceToLabelmap';
import { computeStackLabelmapFromVolume } from '../../helpers/computeStackLabelmapFromVolume';
export async function computeLabelmapData(segmentationId, options = {}) {
    const segmentIndices = options.segmentIndices?.length
        ? options.segmentIndices
        : getUniqueSegmentIndices(segmentationId);
    let rawLabelmapData;
    const segmentation = getSegmentation(segmentationId);
    const representationData = segmentation.representationData;
    try {
        if (representationData.Contour) {
            rawLabelmapData = await computeLabelmapFromContourSegmentation(segmentationId, {
                segmentIndices,
                ...options,
            });
        }
        else if (representationData.Surface) {
            rawLabelmapData = await computeLabelmapFromSurfaceSegmentation(segmentation.segmentationId, {
                segmentIndices,
                ...options,
            });
        }
    }
    catch (error) {
        console.error(error);
        throw error;
    }
    if (!rawLabelmapData) {
        throw new Error('Not enough data to convert to surface, currently only support converting volume labelmap to surface if available');
    }
    return rawLabelmapData;
}
async function computeLabelmapFromContourSegmentation(segmentationId, options = {}) {
    const isVolume = options.viewport instanceof VolumeViewport ?? true;
    if (isVolume && !options.viewport) {
        throw new Error('Cannot compute labelmap from contour segmentation without providing the viewport');
    }
    const segmentIndices = options.segmentIndices?.length
        ? options.segmentIndices
        : getUniqueSegmentIndices(segmentationId);
    const segmentation = getSegmentation(segmentationId);
    const representationData = segmentation.representationData.Contour;
    const convertFunction = isVolume
        ? convertContourToVolumeLabelmap
        : convertContourToStackLabelmap;
    const result = await convertFunction(representationData, {
        segmentIndices,
        viewport: options.viewport,
    });
    return result;
}
async function computeLabelmapFromSurfaceSegmentation(segmentationId, options = {}) {
    const { viewport } = options;
    const isVolume = viewport instanceof VolumeViewport ?? true;
    const segmentIndices = options.segmentIndices?.length
        ? options.segmentIndices
        : getUniqueSegmentIndices(segmentationId);
    const segmentation = getSegmentation(segmentationId);
    const segmentsGeometryIds = new Map();
    const representationData = segmentation.representationData.Surface;
    representationData.geometryIds.forEach((geometryId, segmentIndex) => {
        if (segmentIndices.includes(segmentIndex)) {
            segmentsGeometryIds.set(segmentIndex, geometryId);
        }
    });
    if (isVolume && !viewport) {
        throw new Error('Cannot compute labelmap from surface segmentation without providing the viewport');
    }
    let segmentationVolume;
    if (isVolume) {
        const volumeId = viewport.getVolumeId();
        segmentationVolume = await volumeLoader.createAndCacheDerivedLabelmapVolume(volumeId);
    }
    else {
        const imageIds = options.viewport.getImageIds();
        const segImages = imageLoader.createAndCacheDerivedLabelmapImages(imageIds);
        const segImageIds = segImages.map((image) => image.imageId);
        segmentationVolume = await volumeLoader.createAndCacheVolumeFromImages('generatedSegmentationVolumeId', segImageIds);
    }
    const result = await convertSurfaceToVolumeLabelmap({ geometryIds: segmentsGeometryIds }, segmentationVolume);
    if (isVolume) {
        return result;
    }
    const stackData = (await computeStackLabelmapFromVolume({
        volumeId: segmentationVolume.volumeId,
    }));
    return stackData;
}
export { computeLabelmapFromContourSegmentation };
