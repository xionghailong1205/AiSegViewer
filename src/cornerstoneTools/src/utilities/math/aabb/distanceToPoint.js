import distanceToPointSquared from './distanceToPointSquared';
export default function distanceToPoint(aabb, point) {
    return Math.sqrt(distanceToPointSquared(aabb, point));
}
