import * as math from '../../../utilities/math';
class Spline {
    constructor(props) {
        this._controlPoints = [];
        this._invalidated = false;
        this._length = 0;
        this._controlPoints = [];
        this._resolution = props?.resolution ?? 20;
        this._fixedResolution = props?.fixedResolution ?? false;
        this._closed = props?.closed ?? false;
        this._invalidated = true;
    }
    get controlPoints() {
        return this._controlPoints;
    }
    get numControlPoints() {
        return this._controlPoints.length;
    }
    get resolution() {
        return this._resolution;
    }
    set resolution(resolution) {
        if (this._fixedResolution || this._resolution === resolution) {
            return;
        }
        this._resolution = resolution;
        this.invalidated = true;
    }
    get fixedResolution() {
        return this._fixedResolution;
    }
    get closed() {
        return this._closed;
    }
    set closed(closed) {
        if (this._closed === closed) {
            return;
        }
        this._closed = closed;
        this.invalidated = true;
    }
    get aabb() {
        this._update();
        return this._aabb;
    }
    get length() {
        this._update();
        return this._length;
    }
    get invalidated() {
        return this._invalidated;
    }
    set invalidated(invalidated) {
        this._invalidated = invalidated;
    }
    hasTangentPoints() {
        return false;
    }
    addControlPoint(point) {
        this._controlPoints.push([point[0], point[1]]);
        this.invalidated = true;
    }
    addControlPoints(points) {
        points.forEach((point) => this.addControlPoint(point));
    }
    addControlPointAtU(u) {
        const lineSegment = this._getLineSegmentAt(u);
        const { start: startPoint, end: endPoint } = lineSegment.points;
        const curveSegmentIndex = Math.floor(u);
        const curveSegment = this._curveSegments[curveSegmentIndex];
        const t = u - Math.floor(curveSegmentIndex);
        const controlPointPos = [
            startPoint[0] + t * (endPoint[0] - startPoint[0]),
            startPoint[1] + t * (endPoint[1] - startPoint[1]),
        ];
        const insertIndex = this._controlPoints.indexOf(curveSegment.controlPoints.p1) + 1;
        this._controlPoints.splice(insertIndex, 0, controlPointPos);
        this.invalidated = true;
        return {
            index: insertIndex,
            point: controlPointPos,
        };
    }
    deleteControlPointByIndex(index) {
        const minControlPoints = this._closed ? 3 : 1;
        const canDelete = index >= 0 &&
            index < this._controlPoints.length &&
            this._controlPoints.length > minControlPoints;
        if (!canDelete) {
            return false;
        }
        this._controlPoints.splice(index, 1);
        this.invalidated = true;
        return true;
    }
    clearControlPoints() {
        this._controlPoints = [];
        this.invalidated = true;
    }
    setControlPoints(points) {
        this.clearControlPoints();
        this.addControlPoints(points);
    }
    updateControlPoint(index, newControlPoint) {
        if (index < 0 || index >= this._controlPoints.length) {
            throw new Error('Index out of bounds');
        }
        this._controlPoints[index] = [...newControlPoint];
        this.invalidated = true;
    }
    getControlPoints() {
        return this._controlPoints.map((controlPoint) => [
            controlPoint[0],
            controlPoint[1],
        ]);
    }
    getClosestControlPoint(point) {
        const controlPoints = this._controlPoints;
        let minSquaredDist = Infinity;
        let closestPointIndex = -1;
        for (let i = 0, len = controlPoints.length; i < len; i++) {
            const controlPoint = controlPoints[i];
            const dx = point[0] - controlPoint[0];
            const dy = point[1] - controlPoint[1];
            const squaredDist = dx * dx + dy * dy;
            if (squaredDist < minSquaredDist) {
                minSquaredDist = squaredDist;
                closestPointIndex = i;
            }
        }
        return {
            index: closestPointIndex,
            point: closestPointIndex === -1
                ? undefined
                : [...controlPoints[closestPointIndex]],
            distance: Math.sqrt(minSquaredDist),
        };
    }
    getClosestControlPointWithinDistance(point, maxDist) {
        const closestControlPoint = this.getClosestControlPoint(point);
        return closestControlPoint.distance <= maxDist
            ? closestControlPoint
            : undefined;
    }
    getClosestPoint(point) {
        this._update();
        const curveSegmentsDistInfo = this._getCurveSegmmentsDistanceSquaredInfo(point);
        if (!curveSegmentsDistInfo.length) {
            return;
        }
        curveSegmentsDistInfo.sort((csA, csB) => csA.distanceSquared - csB.distanceSquared);
        let closestPoint;
        let closestPointCurveSegmentIndex = -1;
        let minDistSquared = Infinity;
        let minDistCurveSegment;
        let minDistLineSegment;
        for (let i = 0; i < curveSegmentsDistInfo.length; i++) {
            const curveSegmentDistInfo = curveSegmentsDistInfo[i];
            if (curveSegmentDistInfo.distanceSquared > minDistSquared) {
                continue;
            }
            const { curveSegmentIndex, curveSegment } = curveSegmentDistInfo;
            const { lineSegments } = curveSegment;
            for (let j = 0; j < lineSegments.length; j++) {
                const lineSegment = lineSegments[j];
                const { point: lineSegPoint, distanceSquared: lineSegDistSquared } = math.lineSegment.distanceToPointSquaredInfo(lineSegment.points.start, lineSegment.points.end, point);
                if (lineSegDistSquared < minDistSquared) {
                    minDistLineSegment = lineSegment;
                    closestPointCurveSegmentIndex = curveSegmentIndex;
                    minDistCurveSegment = curveSegmentDistInfo.curveSegment;
                    closestPoint = lineSegPoint;
                    minDistSquared = lineSegDistSquared;
                }
            }
        }
        const curveSegmentLengthToPoint = minDistLineSegment.previousLineSegmentsLength +
            math.point.distanceToPoint(minDistLineSegment.points.start, closestPoint);
        const t = curveSegmentLengthToPoint / minDistCurveSegment.length;
        const u = closestPointCurveSegmentIndex + t;
        return {
            point: closestPoint,
            uValue: u,
            distance: Math.sqrt(minDistSquared),
        };
    }
    getClosestPointOnControlPointLines(point) {
        const linePoints = [...this._controlPoints];
        if (this._closed) {
            linePoints.push(this._controlPoints[0]);
        }
        if (!linePoints.length) {
            return;
        }
        let closestPoint;
        let minDistSquared = Infinity;
        let startPoint = linePoints[0];
        for (let i = 1, len = linePoints.length; i < len; i++) {
            const endPoint = linePoints[i];
            const { point: lineSegPoint, distanceSquared: lineSegDistSquared } = math.lineSegment.distanceToPointSquaredInfo(startPoint, endPoint, point);
            if (lineSegDistSquared < minDistSquared) {
                closestPoint = lineSegPoint;
                minDistSquared = lineSegDistSquared;
            }
            startPoint = endPoint;
        }
        return {
            point: closestPoint,
            distance: Math.sqrt(minDistSquared),
        };
    }
    getPolylinePoints() {
        this._update();
        return this._convertCurveSegmentsToPolyline(this._curveSegments);
    }
    getPreviewPolylinePoints(controlPointPreview, closeDistance) {
        if (this._closed) {
            return [];
        }
        this._update();
        const closestControlPoint = this.getClosestControlPointWithinDistance(controlPointPreview, closeDistance);
        const closeSpline = closestControlPoint?.index === 0;
        const previewCurveSegments = this.getPreviewCurveSegments(controlPointPreview, closeSpline);
        return previewCurveSegments?.length
            ? this._convertCurveSegmentsToPolyline(previewCurveSegments)
            : [];
    }
    isPointNearCurve(point, maxDist) {
        this._update();
        const curveSegments = this._getCurveSegmmentsWithinDistance(point, maxDist);
        const maxDistSquared = maxDist * maxDist;
        for (let i = 0; i < curveSegments.length; i++) {
            const { lineSegments } = curveSegments[i];
            for (let j = 0; j < lineSegments.length; j++) {
                const lineSegment = lineSegments[j];
                const lineDistSquared = math.lineSegment.distanceToPointSquared(lineSegment.points.start, lineSegment.points.end, point);
                if (lineDistSquared <= maxDistSquared) {
                    return true;
                }
            }
        }
        return false;
    }
    containsPoint(point) {
        this._update();
        const controlPoints = this._controlPoints;
        if (controlPoints.length < 3) {
            return false;
        }
        const curveSegments = [...this._curveSegments];
        const closingCurveSegment = this._getClosingCurveSegmentWithStraightLineSegment();
        if (closingCurveSegment) {
            curveSegments.push(closingCurveSegment);
        }
        let numIntersections = 0;
        for (let i = 0; i < curveSegments.length; i++) {
            const curveSegment = curveSegments[i];
            const { aabb: curveSegAABB } = curveSegment;
            const mayIntersectCurveSegment = point[0] <= curveSegAABB.maxX &&
                point[1] >= curveSegAABB.minY &&
                point[1] < curveSegAABB.maxY;
            if (!mayIntersectCurveSegment) {
                continue;
            }
            const { lineSegments } = curveSegment;
            for (let i = 0; i < lineSegments.length; i++) {
                const lineSegment = lineSegments[i];
                const { aabb: lineSegmentAABB } = lineSegment;
                const mayIntersectLineSegment = point[0] <= lineSegmentAABB.maxX &&
                    point[1] >= lineSegmentAABB.minY &&
                    point[1] < lineSegmentAABB.maxY;
                if (mayIntersectLineSegment) {
                    const { start: p1, end: p2 } = lineSegment.points;
                    const isVerticalLine = p1[0] === p2[0];
                    const xIntersection = ((point[1] - p1[1]) * (p2[0] - p1[0])) / (p2[1] - p1[1]) + p1[0];
                    numIntersections +=
                        isVerticalLine || point[0] <= xIntersection ? 1 : 0;
                }
            }
        }
        return numIntersections % 2 === 1;
    }
    _update() {
        if (!this._invalidated) {
            return;
        }
        const curveSegments = this.getSplineCurves();
        let length = 0;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let i = 0, len = curveSegments.length; i < len; i++) {
            const { aabb: curveSegAABB, length: curveSegLength } = curveSegments[i];
            minX = minX <= curveSegAABB.minX ? minX : curveSegAABB.minX;
            minY = minY <= curveSegAABB.minY ? minY : curveSegAABB.minY;
            maxX = maxX >= curveSegAABB.maxX ? maxX : curveSegAABB.maxX;
            maxY = maxY >= curveSegAABB.maxY ? maxY : curveSegAABB.maxY;
            length += curveSegLength;
        }
        this._curveSegments = curveSegments;
        this._aabb = { minX, minY, maxX, maxY };
        this._length = length;
        this._invalidated = false;
    }
    _convertCurveSegmentsToPolyline(curveSegments) {
        this._update();
        const polylinePoints = [];
        curveSegments.forEach(({ lineSegments }, curveSegIndex) => {
            lineSegments.forEach((lineSegment, lineSegIndex) => {
                if (curveSegIndex === 0 && lineSegIndex === 0) {
                    polylinePoints.push([...lineSegment.points.start]);
                }
                polylinePoints.push([...lineSegment.points.end]);
            });
        });
        return polylinePoints;
    }
    _getCurveSegmmentsDistanceSquaredInfo(point) {
        this._update();
        const curveSegmentsDistanceSquared = [];
        const { _curveSegments: curveSegments } = this;
        for (let i = 0; i < curveSegments.length; i++) {
            const curveSegment = curveSegments[i];
            const distanceSquared = math.aabb.distanceToPointSquared(curveSegment.aabb, point);
            curveSegmentsDistanceSquared.push({
                curveSegmentIndex: i,
                curveSegment,
                distanceSquared,
            });
        }
        return curveSegmentsDistanceSquared;
    }
    _getCurveSegmmentsWithinDistance(point, maxDist) {
        this._update();
        const maxDistSquared = maxDist * maxDist;
        if (math.aabb.distanceToPointSquared(this.aabb, point) > maxDistSquared) {
            return [];
        }
        const curveSegmentsDistance = this._getCurveSegmmentsDistanceSquaredInfo(point);
        const curveSegmentsWithinRange = [];
        for (let i = 0, len = curveSegmentsDistance.length; i < len; i++) {
            const { curveSegment, distanceSquared: curveSegmentDistSquared } = curveSegmentsDistance[i];
            if (curveSegmentDistSquared <= maxDistSquared) {
                curveSegmentsWithinRange.push(curveSegment);
            }
        }
        return curveSegmentsWithinRange;
    }
    _getLineSegmentAt(u) {
        this._update();
        const curveSegmentIndex = Math.floor(u);
        const t = u - curveSegmentIndex;
        const curveSegment = this._curveSegments[curveSegmentIndex];
        const { lineSegments } = curveSegment;
        const pointLength = curveSegment.length * t;
        for (let i = 0; i < lineSegments.length; i++) {
            const lineSegment = lineSegments[i];
            const lengthEnd = lineSegment.previousLineSegmentsLength + lineSegment.length;
            if (pointLength >= lineSegment.previousLineSegmentsLength &&
                pointLength <= lengthEnd) {
                return lineSegment;
            }
        }
    }
    _getClosingCurveSegmentWithStraightLineSegment() {
        if (this.closed) {
            return;
        }
        const controlPoints = this._controlPoints;
        const startControlPoint = controlPoints[0];
        const endControlPoint = controlPoints[controlPoints.length - 1];
        const closingLineSegment = {
            points: {
                start: [...startControlPoint],
                end: [...endControlPoint],
            },
            aabb: {
                minX: Math.min(startControlPoint[0], endControlPoint[0]),
                minY: Math.min(startControlPoint[1], endControlPoint[1]),
                maxX: Math.max(startControlPoint[0], endControlPoint[0]),
                maxY: Math.max(startControlPoint[1], endControlPoint[1]),
            },
        };
        return {
            aabb: {
                minX: closingLineSegment.aabb.minX,
                minY: closingLineSegment.aabb.minY,
                maxX: closingLineSegment.aabb.maxX,
                maxY: closingLineSegment.aabb.maxY,
            },
            lineSegments: [closingLineSegment],
        };
    }
}
export { Spline as default, Spline };
