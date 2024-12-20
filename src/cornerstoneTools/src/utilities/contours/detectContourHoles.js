const getIsPointInsidePolygon = (point, vertices) => {
    const x = point[0];
    const y = point[1];
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i][0], yi = vertices[i][1];
        const xj = vertices[j][0], yj = vertices[j][1];
        const intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) {
            inside = !inside;
        }
    }
    return inside;
};
function checkEnclosed(outerContour, innerContour, points) {
    const vertices = [];
    outerContour.contourPoints.forEach((point) => {
        vertices.push([points[point][0], points[point][1]]);
    });
    let pointsNotEnclosed = 0;
    innerContour.contourPoints.forEach((point) => {
        const result = getIsPointInsidePolygon([points[point][0], points[point][1]], vertices);
        if (!result) {
            pointsNotEnclosed++;
        }
    });
    return pointsNotEnclosed === 0;
}
export function processContourHoles(contours, points, useXOR = true) {
    const retContours = contours.filter((contour) => contour.type !== 'CLOSED_PLANAR');
    const closedContours = contours.filter((contour) => contour.type === 'CLOSED_PLANAR');
    const contourWithHoles = [];
    let contourWithoutHoles = [];
    closedContours.forEach((contour, index) => {
        const holes = [];
        closedContours.forEach((hContour, hIndex) => {
            if (index != hIndex) {
                if (checkEnclosed(contour, hContour, points)) {
                    holes.push(hIndex);
                }
            }
        });
        if (holes.length > 0) {
            contourWithHoles.push({
                contour,
                holes,
            });
        }
        else {
            contourWithoutHoles.push(index);
        }
    });
    if (useXOR) {
        contourWithHoles.forEach((contourHoleSet) => {
            contourHoleSet.contour.type = 'CLOSEDPLANAR_XOR';
            retContours.push(contourHoleSet.contour);
            contourHoleSet.holes.forEach((holeIndex) => {
                closedContours[holeIndex].type = 'CLOSEDPLANAR_XOR';
                retContours.push(closedContours[holeIndex]);
                contourWithoutHoles = contourWithoutHoles.filter((contourIndex) => {
                    return contourIndex !== holeIndex;
                });
            });
        });
        contourWithoutHoles.forEach((contourIndex) => {
            retContours.push(closedContours[contourIndex]);
        });
    }
    else {
    }
    return retContours;
}
export default { processContourHoles };
