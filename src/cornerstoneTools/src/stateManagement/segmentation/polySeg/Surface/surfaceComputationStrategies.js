import { getUniqueSegmentIndices } from '../../../../utilities/segmentation/getUniqueSegmentIndices';
import { getSegmentation } from '../../getSegmentation';
import { convertContourToSurface } from './convertContourToSurface';
import { createAndCacheSurfacesFromRaw } from './createAndCacheSurfacesFromRaw';
import { convertLabelmapToSurface } from './convertLabelmapToSurface';
export async function computeSurfaceData(segmentationId, options = {}) {
    const segmentIndices = options.segmentIndices?.length
        ? options.segmentIndices
        : getUniqueSegmentIndices(segmentationId);
    let rawSurfacesData;
    const segmentation = getSegmentation(segmentationId);
    const representationData = segmentation.representationData;
    try {
        if (representationData.Contour) {
            rawSurfacesData = await computeSurfaceFromContourSegmentation(segmentationId, {
                segmentIndices,
                ...options,
            });
        }
        else if (representationData.Labelmap) {
            rawSurfacesData = await computeSurfaceFromLabelmapSegmentation(segmentation.segmentationId, {
                segmentIndices,
                ...options,
            });
        }
    }
    catch (error) {
        console.error(error);
        throw error;
    }
    if (!rawSurfacesData) {
        throw new Error('Not enough data to convert to surface, currently only support converting volume labelmap to surface if available');
    }
    const surfacesData = await createAndCacheSurfacesFromRaw(segmentationId, rawSurfacesData, options);
    return surfacesData;
}
async function computeSurfaceFromLabelmapSegmentation(segmentationId, options = {}) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation?.representationData?.Labelmap) {
        console.warn('Only support surface update from labelmaps');
        return;
    }
    const labelmapRepresentationData = segmentation.representationData.Labelmap;
    const segmentIndices = options.segmentIndices || getUniqueSegmentIndices(segmentationId);
    const promises = segmentIndices.map((index) => {
        const surface = convertLabelmapToSurface(labelmapRepresentationData, index);
        return surface;
    });
    const surfaces = await Promise.allSettled(promises);
    const errors = surfaces.filter((p) => p.status === 'rejected');
    if (errors.length > 0) {
        console.error(errors);
        throw new Error('Failed to convert labelmap to surface');
    }
    const rawSurfacesData = surfaces
        .map((surface, index) => {
        if (surface.status === 'fulfilled') {
            return { segmentIndex: segmentIndices[index], data: surface.value };
        }
    })
        .filter(Boolean);
    return rawSurfacesData;
}
async function computeSurfaceFromContourSegmentation(segmentationId, options = {}) {
    const segmentation = getSegmentation(segmentationId);
    const contourRepresentationData = segmentation.representationData.Contour;
    const segmentIndices = options.segmentIndices || getUniqueSegmentIndices(segmentationId);
    const promises = segmentIndices.map(async (index) => {
        const surface = await convertContourToSurface(contourRepresentationData, index);
        return { segmentIndex: index, data: surface };
    });
    const surfaces = await Promise.all(promises);
    return surfaces;
}
export { computeSurfaceFromContourSegmentation, computeSurfaceFromLabelmapSegmentation, };
