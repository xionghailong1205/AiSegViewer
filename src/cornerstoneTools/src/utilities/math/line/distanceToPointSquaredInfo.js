import { distanceToPointSquared } from '../point';
export default function distanceToPointSquaredInfo(lineStart, lineEnd, point) {
    let closestPoint;
    const distanceSquared = distanceToPointSquared(lineStart, lineEnd);
    if (lineStart[0] === lineEnd[0] && lineStart[1] === lineEnd[1]) {
        closestPoint = lineStart;
    }
    if (!closestPoint) {
        const dotProduct = ((point[0] - lineStart[0]) * (lineEnd[0] - lineStart[0]) +
            (point[1] - lineStart[1]) * (lineEnd[1] - lineStart[1])) /
            distanceSquared;
        if (dotProduct < 0) {
            closestPoint = lineStart;
        }
        else if (dotProduct > 1) {
            closestPoint = lineEnd;
        }
        else {
            closestPoint = [
                lineStart[0] + dotProduct * (lineEnd[0] - lineStart[0]),
                lineStart[1] + dotProduct * (lineEnd[1] - lineStart[1]),
            ];
        }
    }
    return {
        point: [...closestPoint],
        distanceSquared: distanceToPointSquared(point, closestPoint),
    };
}
