import _getHash from './_getHash';
import setNewAttributesIfValid from './setNewAttributesIfValid';
import setAttributesIfNecessary from './setAttributesIfNecessary';
export default function drawPath(svgDrawingHelper, annotationUID, pathUID, points, options) {
    const hasSubArrays = points.length && points[0].length && Array.isArray(points[0][0]);
    const pointsArrays = hasSubArrays ? points : [points];
    const { color = 'rgb(0, 255, 0)', width = 10, fillColor = 'none', fillOpacity = 0, lineWidth, lineDash, closePath = false, } = options;
    const strokeWidth = lineWidth || width;
    const svgns = 'http://www.w3.org/2000/svg';
    const svgNodeHash = _getHash(annotationUID, 'path', pathUID);
    const existingNode = svgDrawingHelper.getSvgNode(svgNodeHash);
    let pointsAttribute = '';
    for (let i = 0, numArrays = pointsArrays.length; i < numArrays; i++) {
        const points = pointsArrays[i];
        const numPoints = points.length;
        if (numPoints < 2) {
            continue;
        }
        for (let j = 0; j < numPoints; j++) {
            const point = points[j];
            const cmd = j ? 'L' : 'M';
            pointsAttribute += `${cmd} ${point[0].toFixed(1)}, ${point[1].toFixed(1)} `;
        }
        if (closePath) {
            pointsAttribute += 'Z ';
        }
    }
    if (!pointsAttribute) {
        return;
    }
    const attributes = {
        d: pointsAttribute,
        stroke: color,
        fill: fillColor,
        'fill-opacity': fillOpacity,
        'stroke-width': strokeWidth,
        'stroke-dasharray': lineDash,
    };
    if (existingNode) {
        setAttributesIfNecessary(attributes, existingNode);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    }
    else {
        const newNode = document.createElementNS(svgns, 'path');
        setNewAttributesIfValid(attributes, newNode);
        svgDrawingHelper.appendNode(newNode, svgNodeHash);
    }
}
