export default function distanceToPointSquared(aabb, point) {
    const aabbWidth = aabb.maxX - aabb.minX;
    const aabbHeight = aabb.maxY - aabb.minY;
    const aabbSize = [aabbWidth, aabbHeight];
    const aabbCenter = [
        aabb.minX + aabbWidth / 2,
        aabb.minY + aabbHeight / 2,
    ];
    const translatedPoint = [
        Math.abs(point[0] - aabbCenter[0]),
        Math.abs(point[1] - aabbCenter[1]),
    ];
    const dx = translatedPoint[0] - aabbSize[0] * 0.5;
    const dy = translatedPoint[1] - aabbSize[1] * 0.5;
    if (dx > 0 && dy > 0) {
        return dx * dx + dy * dy;
    }
    const dist = Math.max(dx, 0) + Math.max(dy, 0);
    return dist * dist;
}
