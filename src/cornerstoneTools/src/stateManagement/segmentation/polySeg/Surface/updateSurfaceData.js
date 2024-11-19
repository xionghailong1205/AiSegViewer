import { cache } from '@cornerstonejs/core';
import { getUniqueSegmentIndices } from '../../../../utilities/segmentation/getUniqueSegmentIndices';
import { getViewportIdsWithSegmentation } from '../../getViewportIdsWithSegmentation';
import { getSegmentation } from '../../getSegmentation';
import { triggerSegmentationModified } from '../../triggerSegmentationEvents';
import { getSegmentationRepresentation } from '../../getSegmentationRepresentation';
import { SegmentationRepresentations } from '../../../../enums';
import { computeSurfaceFromLabelmapSegmentation } from './surfaceComputationStrategies';
import { createAndCacheSurfacesFromRaw } from './createAndCacheSurfacesFromRaw';
export async function updateSurfaceData(segmentationId) {
    const surfacesObj = await computeSurfaceFromLabelmapSegmentation(segmentationId);
    if (!surfacesObj) {
        return;
    }
    const segmentation = getSegmentation(segmentationId);
    const indices = getUniqueSegmentIndices(segmentationId);
    if (!indices.length) {
        const geometryIds = segmentation.representationData.Surface.geometryIds;
        geometryIds.forEach((geometryId) => {
            const geometry = cache.getGeometry(geometryId);
            const surface = geometry.data;
            surface.points = [];
            surface.polys = [];
        });
        triggerSegmentationModified(segmentationId);
        return;
    }
    const promises = surfacesObj.map(({ data, segmentIndex }) => {
        const geometryId = `segmentation_${segmentationId}_surface_${segmentIndex}`;
        const geometry = cache.getGeometry(geometryId);
        if (!geometry) {
            const viewportIds = getViewportIdsWithSegmentation(segmentationId);
            return viewportIds.map((viewportId) => {
                const surfaceRepresentation = getSegmentationRepresentation(viewportId, {
                    segmentationId,
                    type: SegmentationRepresentations.Surface,
                });
                return [surfaceRepresentation].map((surfaceRepresentation) => {
                    segmentation.representationData.Surface.geometryIds.set(segmentIndex, geometryId);
                    return createAndCacheSurfacesFromRaw(segmentationId, [{ segmentIndex, data }], {
                        segmentationId: surfaceRepresentation.segmentationId,
                    });
                });
            });
        }
        else if (indices.includes(segmentIndex)) {
            const surface = geometry.data;
            surface.points = data.points;
            surface.polys = data.polys;
        }
        else {
            const surface = geometry.data;
            surface.points = [];
            surface.polys = [];
        }
    });
    await Promise.all(promises);
    triggerSegmentationModified(segmentationId);
}
