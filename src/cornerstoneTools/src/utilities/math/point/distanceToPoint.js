import distanceToPointSquared from './distanceToPointSquared';
export default function distanceToPoint(p1, p2) {
    return Math.sqrt(distanceToPointSquared(p1, p2));
}
