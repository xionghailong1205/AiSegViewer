import { QuadraticSpline } from './QuadraticSpline';
const TRANSFORM_MATRIX = [
    1, 0, 0,
    -2, 2, 0,
    1, -2, 1,
];
class QuadraticBezier extends QuadraticSpline {
    hasTangentPoints() {
        return true;
    }
    getTransformMatrix() {
        return TRANSFORM_MATRIX;
    }
}
export { QuadraticBezier as default, QuadraticBezier };
