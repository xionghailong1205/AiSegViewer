import _getHash from './_getHash';
import drawEllipseByCoordinates from './drawEllipseByCoordinates';
function drawEllipse(svgDrawingHelper, annotationUID, ellipseUID, corner1, corner2, options = {}, dataId = '') {
    const top = [(corner1[0] + corner2[0]) / 2, corner1[1]];
    const bottom = [(corner1[0] + corner2[0]) / 2, corner2[1]];
    const left = [corner1[0], (corner1[1] + corner2[1]) / 2];
    const right = [corner2[0], (corner1[1] + corner2[1]) / 2];
    drawEllipseByCoordinates(svgDrawingHelper, annotationUID, ellipseUID, [bottom, top, left, right], (options = {}), (dataId = ''));
}
export default drawEllipse;
