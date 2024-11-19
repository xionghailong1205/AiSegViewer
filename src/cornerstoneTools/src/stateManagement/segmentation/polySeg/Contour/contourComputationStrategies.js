import { cache } from '@cornerstonejs/core';
import { getUniqueSegmentIndices } from '../../../../utilities/segmentation/getUniqueSegmentIndices';
import { computeSurfaceFromLabelmapSegmentation } from '../Surface/surfaceComputationStrategies';
import { clipAndCacheSurfacesForViewport } from '../../helpers/clipAndCacheSurfacesForViewport';
import { extractContourData } from './utils/extractContourData';
import { createAndAddContourSegmentationsFromClippedSurfaces } from './utils/createAndAddContourSegmentationsFromClippedSurfaces';
import { getSegmentation } from '../../getSegmentation';
import { segmentationStyle } from '../../SegmentationStyle';
import { SegmentationRepresentations } from '../../../../enums';
export async function computeContourData(segmentationId, options = {}) {
    const segmentIndices = options.segmentIndices?.length
        ? options.segmentIndices
        : getUniqueSegmentIndices(segmentationId);
    let rawContourData;
    const segmentation = getSegmentation(segmentationId);
    const representationData = segmentation.representationData;
    try {
        if (representationData.Surface) {
            rawContourData = await computeContourFromSurfaceSegmentation(segmentationId, {
                segmentIndices,
                ...options,
            });
        }
        else if (representationData.Labelmap) {
            rawContourData = await computeContourFromLabelmapSegmentation(segmentationId, {
                segmentIndices,
                ...options,
            });
        }
    }
    catch (error) {
        console.error(error);
        throw error;
    }
    if (!rawContourData) {
        throw new Error('Not enough data to convert to contour, currently only support converting volume labelmap to contour if available');
    }
    const { viewport } = options;
    const annotationUIDsMap = createAndAddContourSegmentationsFromClippedSurfaces(rawContourData, viewport, segmentationId);
    segmentationStyle.setStyle({ segmentationId, type: SegmentationRepresentations.Contour }, {
        fillAlpha: 0,
    });
    return {
        annotationUIDsMap,
    };
}
async function computeContourFromLabelmapSegmentation(segmentationId, options = {}) {
    if (!options.viewport) {
        throw new Error('Viewport is required to compute contour from labelmap');
    }
    const results = await computeSurfaceFromLabelmapSegmentation(segmentationId, options);
    if (!results?.length) {
        console.error('Failed to convert labelmap to surface or labelmap is empty');
        return;
    }
    const { viewport } = options;
    const pointsAndPolys = results.map((surface) => {
        return {
            id: surface.segmentIndex.toString(),
            points: surface.data.points,
            polys: surface.data.polys,
            segmentIndex: surface.segmentIndex,
        };
    });
    const polyDataCache = await clipAndCacheSurfacesForViewport(pointsAndPolys, viewport);
    const rawResults = extractContourData(polyDataCache);
    return rawResults;
}
async function computeContourFromSurfaceSegmentation(segmentationId, options = {}) {
    if (!options.viewport) {
        throw new Error('Viewport is required to compute contour from surface');
    }
    const { viewport } = options;
    const segmentIndices = options.segmentIndices?.length
        ? options.segmentIndices
        : getUniqueSegmentIndices(segmentationId);
    const segmentIndexToSurfaceId = new Map();
    const surfaceIdToSegmentIndex = new Map();
    const segmentation = getSegmentation(segmentationId);
    const representationData = segmentation.representationData.Surface;
    const surfacesInfo = [];
    representationData.geometryIds.forEach((geometryId, segmentIndex) => {
        if (segmentIndices.includes(segmentIndex)) {
            segmentIndexToSurfaceId.set(segmentIndex, geometryId);
            const surface = cache.getGeometry(geometryId)?.data;
            if (surface) {
                surfacesInfo.push({
                    id: geometryId,
                    points: surface.points,
                    polys: surface.polys,
                    segmentIndex,
                });
            }
        }
    });
    segmentIndexToSurfaceId.forEach((surfaceId, segmentIndex) => {
        surfaceIdToSegmentIndex.set(surfaceId, segmentIndex);
    });
    const polyDataCache = await clipAndCacheSurfacesForViewport(surfacesInfo, viewport);
    const rawResults = extractContourData(polyDataCache);
    return rawResults;
}
export { computeContourFromLabelmapSegmentation };
