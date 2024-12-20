import type { Types } from '@cornerstonejs/core';
import { Spline } from './Spline';
import type { SplineLineSegment, SplineCurveSegment } from '../../../types/';
declare abstract class QuadraticSpline extends Spline {
    protected getSplineCurves(): SplineCurveSegment[];
    protected getLineSegments(): SplineLineSegment[];
    getPreviewCurveSegments(controlPointPreview: Types.Point2, closeSpline: boolean): SplineCurveSegment[];
}
export { QuadraticSpline as default, QuadraticSpline };
