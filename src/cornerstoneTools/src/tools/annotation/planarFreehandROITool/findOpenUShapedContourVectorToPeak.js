import { vec2 } from 'gl-matrix';
export default function findOpenUShapedContourVectorToPeak(canvasPoints, viewport) {
    const first = canvasPoints[0];
    const last = canvasPoints[canvasPoints.length - 1];
    const firstToLastUnitVector = vec2.create();
    vec2.set(firstToLastUnitVector, last[0] - first[0], last[1] - first[1]);
    vec2.normalize(firstToLastUnitVector, firstToLastUnitVector);
    const normalVector1 = vec2.create();
    const normalVector2 = vec2.create();
    vec2.set(normalVector1, -firstToLastUnitVector[1], firstToLastUnitVector[0]);
    vec2.set(normalVector2, firstToLastUnitVector[1], -firstToLastUnitVector[0]);
    const centerOfFirstToLast = [
        (first[0] + last[0]) / 2,
        (first[1] + last[1]) / 2,
    ];
    const furthest = {
        dist: 0,
        index: null,
    };
    for (let i = 0; i < canvasPoints.length; i++) {
        const canvasPoint = canvasPoints[i];
        const distance = vec2.dist(canvasPoint, centerOfFirstToLast);
        if (distance > furthest.dist) {
            furthest.dist = distance;
            furthest.index = i;
        }
    }
    const toFurthest = [
        canvasPoints[furthest.index],
        centerOfFirstToLast,
    ];
    const toFurthestWorld = toFurthest.map(viewport.canvasToWorld);
    return toFurthestWorld;
}
export function findOpenUShapedContourVectorToPeakOnRender(enabledElement, annotation) {
    const { viewport } = enabledElement;
    const canvasPoints = annotation.data.contour.polyline.map(viewport.worldToCanvas);
    return findOpenUShapedContourVectorToPeak(canvasPoints, viewport);
}
