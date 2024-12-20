import { vec3 } from 'gl-matrix';
export function getPoint(points, idx) {
    const idx3 = idx * 3;
    if (idx3 < points.length) {
        return vec3.fromValues(points[idx3], points[idx3 + 1], points[idx3 + 2]);
    }
}
export function getPolyDataPointIndexes(polyData) {
    const linesData = polyData.getLines().getData();
    let idx = 0;
    const lineSegments = new Map();
    while (idx < linesData.length) {
        const segmentSize = linesData[idx++];
        const segment = [];
        for (let i = 0; i < segmentSize; i++) {
            segment.push(linesData[idx + i]);
        }
        lineSegments.set(segment[0], segment);
        idx += segmentSize;
    }
    const contours = [];
    const findStartingPoint = (map) => {
        for (const [key, value] of map.entries()) {
            if (value !== undefined) {
                return key;
            }
        }
        return -1;
    };
    let startPoint = findStartingPoint(lineSegments);
    while (startPoint !== -1) {
        const contour = [startPoint];
        while (lineSegments.has(startPoint)) {
            const nextPoint = lineSegments.get(startPoint)[1];
            if (lineSegments.has(nextPoint)) {
                contour.push(nextPoint);
            }
            lineSegments.delete(startPoint);
            startPoint = nextPoint;
        }
        contours.push(contour);
        startPoint = findStartingPoint(lineSegments);
    }
    return contours.length ? contours : undefined;
}
export function getPolyDataPoints(polyData) {
    const contoursIndexes = getPolyDataPointIndexes(polyData);
    if (!contoursIndexes) {
        return;
    }
    const rawPointsData = polyData.getPoints().getData();
    return contoursIndexes.map((contourIndexes) => contourIndexes.map((index) => getPoint(rawPointsData, index)));
}
