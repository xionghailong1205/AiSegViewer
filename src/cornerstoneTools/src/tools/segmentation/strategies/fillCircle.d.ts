import { vec3 } from 'gl-matrix';
import type { Types } from '@cornerstonejs/core';
import BrushStrategy from './BrushStrategy';
declare function createPointInEllipse(worldInfo: {
    topLeftWorld: Types.Point3;
    bottomRightWorld: Types.Point3;
    center: Types.Point3 | vec3;
}): (pointLPS: Types.Point3) => boolean;
declare const CIRCLE_STRATEGY: BrushStrategy;
declare const CIRCLE_THRESHOLD_STRATEGY: BrushStrategy;
declare const fillInsideCircle: (enabledElement: any, operationData: any) => unknown;
declare const thresholdInsideCircle: (enabledElement: any, operationData: any) => unknown;
export declare function fillOutsideCircle(): void;
export { CIRCLE_STRATEGY, CIRCLE_THRESHOLD_STRATEGY, fillInsideCircle, thresholdInsideCircle, createPointInEllipse as createEllipseInPoint, };
