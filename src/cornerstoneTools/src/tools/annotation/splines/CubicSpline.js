import { vec4 } from 'gl-matrix';
import { Spline } from './Spline';
import * as math from '../../../utilities/math';
const MAX_U_ERROR = 1e-8;
class CubicSpline extends Spline {
    getPreviewCurveSegments(controlPointPreview, closeSpline) {
        const previewNumCurveSegments = this._getNumCurveSegments() + 1;
        const startCurveSegIndex = Math.max(0, previewNumCurveSegments - 2);
        const endCurveSegIndex = closeSpline
            ? previewNumCurveSegments
            : previewNumCurveSegments - 1;
        const transformMatrix = this.getTransformMatrix();
        const controlPoints = [...this.controlPoints];
        const curveSegments = [];
        if (!closeSpline) {
            controlPoints.push(controlPointPreview);
        }
        for (let i = startCurveSegIndex; i <= endCurveSegIndex; i++) {
            const curveSegment = this._getCurveSegment(i, transformMatrix, controlPoints, closeSpline);
            curveSegments.push(curveSegment);
        }
        return curveSegments;
    }
    getSplineCurves() {
        const numCurveSegments = this._getNumCurveSegments();
        const curveSegments = new Array(numCurveSegments);
        if (numCurveSegments <= 0) {
            return [];
        }
        const transformMatrix = this.getTransformMatrix();
        let previousCurveSegmentsLength = 0;
        for (let i = 0; i < numCurveSegments; i++) {
            const curveSegment = this._getCurveSegment(i, transformMatrix);
            curveSegment.previousCurveSegmentsLength = previousCurveSegmentsLength;
            curveSegments[i] = curveSegment;
            previousCurveSegmentsLength += curveSegment.length;
        }
        return curveSegments;
    }
    _getNumCurveSegments(controlPoints = this.controlPoints, closed = this.closed) {
        return closed
            ? controlPoints.length
            : Math.max(0, controlPoints.length - 1);
    }
    _getPoint(u, transformMatrix, controlPoints = this.controlPoints, closed = this.closed) {
        const numCurveSegments = this._getNumCurveSegments(controlPoints, closed);
        const uInt = Math.floor(u);
        let curveSegmentIndex = uInt % numCurveSegments;
        const t = u - uInt;
        const curveSegmentIndexOutOfBounds = curveSegmentIndex < 0 || curveSegmentIndex >= numCurveSegments;
        if (curveSegmentIndexOutOfBounds) {
            if (this.closed) {
                curveSegmentIndex =
                    (numCurveSegments + curveSegmentIndex) % numCurveSegments;
            }
            else {
                return;
            }
        }
        const { p0, p1, p2, p3 } = this._getCurveSegmentPoints(curveSegmentIndex, controlPoints, closed);
        const tt = t * t;
        const ttt = tt * t;
        const tValues = vec4.fromValues(1, t, tt, ttt);
        const qValues = vec4.transformMat4(vec4.create(), tValues, transformMatrix);
        return [
            vec4.dot(qValues, vec4.fromValues(p0[0], p1[0], p2[0], p3[0])),
            vec4.dot(qValues, vec4.fromValues(p0[1], p1[1], p2[1], p3[1])),
        ];
    }
    _getCurveSegmentPoints(curveSegmentIndex, controlPoints = this.controlPoints, closed = this.closed) {
        const numCurveSegments = this._getNumCurveSegments(controlPoints, closed);
        const p1Index = curveSegmentIndex;
        const p0Index = p1Index - 1;
        const p2Index = closed ? (p1Index + 1) % numCurveSegments : p1Index + 1;
        const p3Index = p2Index + 1;
        const p1 = controlPoints[p1Index];
        const p2 = controlPoints[p2Index];
        let p0;
        let p3;
        if (p0Index >= 0) {
            p0 = controlPoints[p0Index];
        }
        else {
            p0 = closed
                ? controlPoints[controlPoints.length - 1]
                : math.point.mirror(p2, p1);
        }
        if (p3Index < controlPoints.length) {
            p3 = controlPoints[p3Index];
        }
        else {
            p3 = closed ? controlPoints[0] : math.point.mirror(p1, p2);
        }
        return { p0, p1, p2, p3 };
    }
    _getLineSegments(curveSegmentIndex, transformMatrix, controlPoints = this.controlPoints, closed = this.closed) {
        const numCurveSegments = this._getNumCurveSegments(controlPoints, closed);
        const numLineSegments = this.resolution + 1;
        const inc = 1 / numLineSegments;
        const minU = curveSegmentIndex;
        let maxU = minU + 1;
        if (!closed && curveSegmentIndex === numCurveSegments - 1) {
            maxU -= MAX_U_ERROR;
        }
        const lineSegments = [];
        let startPoint;
        let endPoint;
        let previousLineSegmentsLength = 0;
        for (let i = 0, u = minU; i <= numLineSegments; i++, u += inc) {
            u = u > maxU ? maxU : u;
            const point = this._getPoint(u, transformMatrix, controlPoints, closed);
            if (!i) {
                startPoint = point;
                continue;
            }
            endPoint = point;
            const dx = endPoint[0] - startPoint[0];
            const dy = endPoint[1] - startPoint[1];
            const length = Math.sqrt(dx ** 2 + dy ** 2);
            const aabb = {
                minX: startPoint[0] <= endPoint[0] ? startPoint[0] : endPoint[0],
                maxX: startPoint[0] >= endPoint[0] ? startPoint[0] : endPoint[0],
                minY: startPoint[1] <= endPoint[1] ? startPoint[1] : endPoint[1],
                maxY: startPoint[1] >= endPoint[1] ? startPoint[1] : endPoint[1],
            };
            lineSegments.push({
                points: {
                    start: startPoint,
                    end: endPoint,
                },
                aabb,
                length,
                previousLineSegmentsLength,
            });
            startPoint = endPoint;
            previousLineSegmentsLength += length;
        }
        return lineSegments;
    }
    _getCurveSegment(curveSegmentIndex, transformMatrix = this.getTransformMatrix(), controlPoints = this.controlPoints, closed = this.closed) {
        const { p0, p1, p2, p3 } = this._getCurveSegmentPoints(curveSegmentIndex, controlPoints, closed);
        const lineSegments = this._getLineSegments(curveSegmentIndex, transformMatrix, controlPoints, closed);
        let curveSegmentLength = 0;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        lineSegments.forEach(({ aabb: lineSegAABB, length: lineSegLength }) => {
            minX = Math.min(minX, lineSegAABB.minX);
            minY = Math.min(minY, lineSegAABB.minY);
            maxX = Math.max(maxX, lineSegAABB.maxX);
            maxY = Math.max(maxY, lineSegAABB.maxY);
            curveSegmentLength += lineSegLength;
        });
        return {
            controlPoints: { p0, p1, p2, p3 },
            aabb: { minX, minY, maxX, maxY },
            length: curveSegmentLength,
            previousCurveSegmentsLength: 0,
            lineSegments,
        };
    }
}
export { CubicSpline as default, CubicSpline };
