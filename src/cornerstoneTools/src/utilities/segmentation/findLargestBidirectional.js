import { vec3 } from 'gl-matrix';
import { createIsInSegment, isLineInSegment } from './isLineInSegment';
const EPSILON = 1e-2;
export default function findLargestBidirectional(contours, segVolumeId, segment) {
    const { sliceContours } = contours;
    const { segmentIndex, containedSegmentIndices } = segment;
    let maxBidirectional;
    const isInSegment = createIsInSegment(segVolumeId, segmentIndex, containedSegmentIndices);
    for (const sliceContour of sliceContours) {
        const bidirectional = createBidirectionalForSlice(sliceContour, isInSegment, maxBidirectional);
        if (!bidirectional) {
            continue;
        }
        maxBidirectional = bidirectional;
    }
    if (maxBidirectional) {
        Object.assign(maxBidirectional, segment);
    }
    return maxBidirectional;
}
function createBidirectionalForSlice(sliceContour, isInSegment, currentMax = { maxMajor: 0, maxMinor: 0 }) {
    const { points } = sliceContour.polyData;
    const { maxMinor: currentMaxMinor, maxMajor: currentMaxMajor } = currentMax;
    let maxMajor = currentMaxMajor * currentMaxMajor;
    let maxMinor = currentMaxMinor * currentMaxMinor;
    let maxMajorPoints;
    for (let index1 = 0; index1 < points.length; index1++) {
        for (let index2 = index1 + 1; index2 < points.length; index2++) {
            const point1 = points[index1];
            const point2 = points[index2];
            const distance2 = vec3.sqrDist(point1, point2);
            if (distance2 < maxMajor) {
                continue;
            }
            if (distance2 - EPSILON < maxMajor + EPSILON && maxMajorPoints) {
                continue;
            }
            if (!isInSegment.testCenter(point1, point2)) {
                continue;
            }
            if (!isLineInSegment(point1, point2, isInSegment)) {
                continue;
            }
            maxMajor = distance2 - EPSILON;
            maxMajorPoints = [index1, index2];
            maxMinor = 0;
        }
    }
    if (!maxMajorPoints) {
        return;
    }
    maxMajor = Math.sqrt(maxMajor + EPSILON);
    const handle0 = points[maxMajorPoints[0]];
    const handle1 = points[maxMajorPoints[1]];
    const unitMajor = vec3.sub(vec3.create(), handle0, handle1);
    vec3.scale(unitMajor, unitMajor, 1 / maxMajor);
    let maxMinorPoints;
    for (let index1 = 0; index1 < points.length; index1++) {
        for (let index2 = index1 + 1; index2 < points.length; index2++) {
            const point1 = points[index1];
            const point2 = points[index2];
            const distance2 = vec3.sqrDist(point1, point2);
            if (distance2 <= maxMinor) {
                continue;
            }
            const delta = vec3.sub(vec3.create(), point1, point2);
            const dot = Math.abs(vec3.dot(delta, unitMajor)) / Math.sqrt(distance2);
            if (dot > EPSILON) {
                continue;
            }
            if (!isInSegment.testCenter(point1, point2)) {
                continue;
            }
            if (!isLineInSegment(point1, point2, isInSegment)) {
                continue;
            }
            maxMinor = distance2;
            maxMinorPoints = [index1, index2];
        }
    }
    if (!maxMinorPoints) {
        return;
    }
    maxMinor = Math.sqrt(maxMinor);
    const handle2 = points[maxMinorPoints[0]];
    const handle3 = points[maxMinorPoints[1]];
    const bidirectional = {
        majorAxis: [handle0, handle1],
        minorAxis: [handle2, handle3],
        maxMajor,
        maxMinor,
        ...sliceContour,
    };
    return bidirectional;
}
