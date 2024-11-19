import { Enums, geometryLoader } from '@cornerstonejs/core';
import { getSegmentIndexColor } from '../../config/segmentationColor';
import { getSegmentation } from '../../getSegmentation';
export async function createAndCacheSurfacesFromRaw(segmentationId, rawSurfacesData, options = {}) {
    const segmentation = getSegmentation(segmentationId);
    const geometryIds = new Map();
    const promises = Object.keys(rawSurfacesData).map(async (index) => {
        const rawSurfaceData = rawSurfacesData[index];
        const segmentIndex = rawSurfaceData.segmentIndex;
        const color = getSegmentIndexColor(options.viewport.id, segmentation.segmentationId, segmentIndex).slice(0, 3);
        if (!color) {
            throw new Error('No color found for segment index, unable to create surface');
        }
        const closedSurface = {
            id: `segmentation_${segmentation.segmentationId}_surface_${segmentIndex}`,
            color,
            frameOfReferenceUID: 'test-frameOfReferenceUID',
            points: rawSurfaceData.data.points,
            polys: rawSurfaceData.data.polys,
            segmentIndex,
        };
        const geometryId = closedSurface.id;
        geometryIds.set(segmentIndex, geometryId);
        return geometryLoader.createAndCacheGeometry(geometryId, {
            type: Enums.GeometryType.SURFACE,
            geometryData: closedSurface,
        });
    });
    await Promise.all(promises);
    return {
        geometryIds,
    };
}
