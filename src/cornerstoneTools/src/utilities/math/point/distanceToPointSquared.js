export default function distanceToPointSquared(p1, p2) {
    if (p1.length !== p2.length) {
        throw Error('Both points should have the same dimensionality');
    }
    const [x1, y1, z1 = 0] = p1;
    const [x2, y2, z2 = 0] = p2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return dx * dx + dy * dy + dz * dz;
}
