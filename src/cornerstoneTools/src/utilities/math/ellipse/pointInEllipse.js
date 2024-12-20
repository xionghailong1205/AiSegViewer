export default function pointInEllipse(ellipse, pointLPS, inverts = {}) {
    if (!inverts.precalculated) {
        precalculatePointInEllipse(ellipse, inverts);
    }
    return inverts.precalculated(pointLPS);
}
const precalculatePointInEllipse = (ellipse, inverts = {}) => {
    const { xRadius, yRadius, zRadius } = ellipse;
    if (inverts.invXRadiusSq === undefined ||
        inverts.invYRadiusSq === undefined ||
        inverts.invZRadiusSq === undefined) {
        inverts.invXRadiusSq = xRadius !== 0 ? 1 / xRadius ** 2 : 0;
        inverts.invYRadiusSq = yRadius !== 0 ? 1 / yRadius ** 2 : 0;
        inverts.invZRadiusSq = zRadius !== 0 ? 1 / zRadius ** 2 : 0;
    }
    const { invXRadiusSq, invYRadiusSq, invZRadiusSq } = inverts;
    const { center } = ellipse;
    const [centerL, centerP, centerS] = center;
    inverts.precalculated = (pointLPS) => {
        const dx = pointLPS[0] - centerL;
        let inside = dx * dx * invXRadiusSq;
        if (inside > 1) {
            return false;
        }
        const dy = pointLPS[1] - centerP;
        inside += dy * dy * invYRadiusSq;
        if (inside > 1) {
            return false;
        }
        const dz = pointLPS[2] - centerS;
        inside += dz * dz * invZRadiusSq;
        return inside <= 1;
    };
    return inverts;
};
export { precalculatePointInEllipse };
