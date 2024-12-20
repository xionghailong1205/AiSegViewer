import _getHash from './_getHash';
import drawRectByCoordinates from './drawRectByCoordinates';
export default function drawRect(svgDrawingHelper, annotationUID, rectangleUID, start, end, options = {}, dataId = '') {
    const topLeft = [start[0], start[1]];
    const topRight = [end[0], start[1]];
    const bottomLeft = [start[0], end[1]];
    const bottomRight = [end[0], end[1]];
    drawRectByCoordinates(svgDrawingHelper, annotationUID, rectangleUID, [topLeft, topRight, bottomLeft, bottomRight], options, dataId);
}
