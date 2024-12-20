class RectangleROIStartEndThreshold {
    constructor() {
    }
    static getContourSequence(toolData, metadataProvider) {
        const { data } = toolData;
        const { projectionPoints, projectionPointsImageIds } = data.cachedStats;
        return projectionPoints.map((point, index) => {
            const ContourData = getPointData(point);
            const ContourImageSequence = getContourImageSequence(projectionPointsImageIds[index], metadataProvider);
            return {
                NumberOfContourPoints: ContourData.length / 3,
                ContourImageSequence,
                ContourGeometricType: 'CLOSED_PLANAR',
                ContourData,
            };
        });
    }
}
RectangleROIStartEndThreshold.toolName = 'RectangleROIStartEndThreshold';
function getPointData(points) {
    const orderedPoints = [
        ...points[0],
        ...points[1],
        ...points[3],
        ...points[2],
    ];
    const pointsArray = orderedPoints.flat();
    const pointsArrayWithPrecision = pointsArray.map((point) => {
        return point.toFixed(2);
    });
    return pointsArrayWithPrecision;
}
function getContourImageSequence(imageId, metadataProvider) {
    const sopCommon = metadataProvider.get('sopCommonModule', imageId);
    return {
        ReferencedSOPClassUID: sopCommon.sopClassUID,
        ReferencedSOPInstanceUID: sopCommon.sopInstanceUID,
    };
}
export default RectangleROIStartEndThreshold;
