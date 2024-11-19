import type { Types } from '@cornerstonejs/core';
import type { SVGDrawingHelper } from '../types';
export default function drawPath(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, pathUID: string, points: Types.Point2[] | Types.Point2[][], options: {
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    width?: number;
    lineWidth?: number;
    lineDash?: string;
    closePath?: boolean;
}): void;
