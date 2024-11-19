import { SegmentationRepresentations } from '../../../enums';
import { cache } from '@cornerstonejs/core';
function normalizeSegmentationInput(segmentationInput) {
    const { segmentationId, representation, config } = segmentationInput;
    const { type, data: inputData } = representation;
    const data = inputData ? { ...inputData } : {};
    if (!data) {
        throw new Error('Segmentation representation data may not be undefined');
    }
    if (type === SegmentationRepresentations.Contour) {
        normalizeContourData(data);
    }
    console.log(data);
    const normalizedSegments = normalizeSegments(config?.segments, type, data);
    delete config?.segments;
    return {
        segmentationId,
        label: config?.label ?? null,
        cachedStats: config?.cachedStats ?? {},
        segments: normalizedSegments,
        representationData: {
            [type]: {
                ...data,
            },
        },
    };
}
function normalizeContourData(contourData) {
    contourData.geometryIds = contourData.geometryIds ?? [];
    contourData.annotationUIDsMap = contourData.annotationUIDsMap ?? new Map();
}
function normalizeSegments(segmentsConfig, type, data) {
    const normalizedSegments = {};
    if (segmentsConfig) {
        Object.entries(segmentsConfig).forEach(([segmentIndex, segment]) => {
            normalizedSegments[segmentIndex] = {
                segmentIndex: Number(segmentIndex),
                label: segment.label ?? `Segment ${segmentIndex}`,
                locked: segment.locked ?? false,
                cachedStats: segment.cachedStats ?? {},
                active: segment.active ?? false,
            };
        });
    }
    else if (type === SegmentationRepresentations.Surface) {
        normalizeSurfaceSegments(normalizedSegments, data);
    }
    else {
        normalizedSegments[1] = createDefaultSegment();
    }
    return normalizedSegments;
}
function normalizeSurfaceSegments(normalizedSegments, surfaceData) {
    const { geometryIds } = surfaceData;
    geometryIds.forEach((geometryId) => {
        const geometry = cache.getGeometry(geometryId);
        if (geometry?.data) {
            const { segmentIndex } = geometry.data;
            normalizedSegments[segmentIndex] = { segmentIndex };
        }
    });
}
function createDefaultSegment() {
    return {
        segmentIndex: 1,
        label: 'Segment 1',
        locked: false,
        cachedStats: {},
        active: true,
    };
}
export default normalizeSegmentationInput;
