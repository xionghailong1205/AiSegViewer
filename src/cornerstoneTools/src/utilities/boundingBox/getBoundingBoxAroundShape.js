import { CONSTANTS } from '@cornerstonejs/core';
const { EPSILON } = CONSTANTS;
function calculateBoundingBox(points, dimensions, isWorld = false) {
    let xMin = Infinity;
    let xMax = isWorld ? -Infinity : 0;
    let yMin = Infinity;
    let yMax = isWorld ? -Infinity : 0;
    let zMin = Infinity;
    let zMax = isWorld ? -Infinity : 0;
    const is3D = points[0]?.length === 3;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        xMin = Math.min(p[0], xMin);
        xMax = Math.max(p[0], xMax);
        yMin = Math.min(p[1], yMin);
        yMax = Math.max(p[1], yMax);
        if (is3D) {
            zMin = Math.min(p[2] ?? zMin, zMin);
            zMax = Math.max(p[2] ?? zMax, zMax);
        }
    }
    if (dimensions) {
        xMin = Math.max(isWorld ? dimensions[0] + EPSILON : 0, xMin);
        xMax = Math.min(isWorld ? dimensions[0] - EPSILON : dimensions[0] - 1, xMax);
        yMin = Math.max(isWorld ? dimensions[1] + EPSILON : 0, yMin);
        yMax = Math.min(isWorld ? dimensions[1] - EPSILON : dimensions[1] - 1, yMax);
        if (is3D && dimensions.length === 3) {
            zMin = Math.max(isWorld ? dimensions[2] + EPSILON : 0, zMin);
            zMax = Math.min(isWorld ? dimensions[2] - EPSILON : dimensions[2] - 1, zMax);
        }
    }
    else if (!isWorld) {
        xMin = Math.max(0, xMin);
        xMax = Math.min(Infinity, xMax);
        yMin = Math.max(0, yMin);
        yMax = Math.min(Infinity, yMax);
        if (is3D) {
            zMin = Math.max(0, zMin);
            zMax = Math.min(Infinity, zMax);
        }
    }
    return is3D
        ? [
            [xMin, xMax],
            [yMin, yMax],
            [zMin, zMax],
        ]
        : [[xMin, xMax], [yMin, yMax], null];
}
export function getBoundingBoxAroundShapeIJK(points, dimensions) {
    return calculateBoundingBox(points, dimensions, false);
}
export function getBoundingBoxAroundShapeWorld(points, clipBounds) {
    return calculateBoundingBox(points, clipBounds, true);
}
