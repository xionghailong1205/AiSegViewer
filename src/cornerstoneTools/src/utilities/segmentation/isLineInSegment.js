import { cache } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
export default function isLineInSegment(point1, point2, isInSegment) {
    const ijk1 = isInSegment.toIJK(point1);
    const ijk2 = isInSegment.toIJK(point2);
    const testPoint = vec3.create();
    const { testIJK } = isInSegment;
    const delta = vec3.sub(vec3.create(), ijk1, ijk2);
    const testSize = Math.round(Math.max(...delta.map(Math.abs)));
    if (testSize < 2) {
        return true;
    }
    const unitDelta = vec3.scale(vec3.create(), delta, 1 / testSize);
    for (let i = 1; i < testSize; i++) {
        vec3.scaleAndAdd(testPoint, ijk2, unitDelta, i);
        if (!testIJK(testPoint)) {
            return false;
        }
    }
    return true;
}
function createIsInSegment(segVolumeId, segmentIndex, containedSegmentIndices) {
    const vol = cache.getVolume(segVolumeId);
    if (!vol) {
        console.warn(`No volume found for ${segVolumeId}`);
        return;
    }
    const voxelManager = vol.voxelManager;
    const width = vol.dimensions[0];
    const pixelsPerSlice = width * vol.dimensions[1];
    return {
        testCenter: (point1, point2) => {
            const point = vec3.add(vec3.create(), point1, point2).map((it) => it / 2);
            const ijk = vol.imageData.worldToIndex(point).map(Math.round);
            const [i, j, k] = ijk;
            const index = i + j * width + k * pixelsPerSlice;
            const value = voxelManager.getAtIndex(index);
            return value === segmentIndex || containedSegmentIndices?.has(value);
        },
        toIJK: (point) => vol.imageData.worldToIndex(point),
        testIJK: (ijk) => {
            const [i, j, k] = ijk;
            const index = Math.round(i) + Math.round(j) * width + Math.round(k) * pixelsPerSlice;
            const value = voxelManager.getAtIndex(index);
            return value === segmentIndex || containedSegmentIndices?.has(value);
        },
    };
}
export { createIsInSegment, isLineInSegment };
