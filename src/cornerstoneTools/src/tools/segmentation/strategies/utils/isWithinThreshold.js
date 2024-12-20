function isWithinThreshold(index, imageScalarData, strategySpecificConfiguration) {
    const { THRESHOLD, THRESHOLD_INSIDE_CIRCLE } = strategySpecificConfiguration;
    const voxelValue = imageScalarData[index];
    const { threshold } = THRESHOLD || THRESHOLD_INSIDE_CIRCLE;
    return threshold[0] <= voxelValue && voxelValue <= threshold[1];
}
export default isWithinThreshold;
