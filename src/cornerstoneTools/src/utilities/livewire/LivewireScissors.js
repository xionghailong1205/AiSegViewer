import { utilities } from '@cornerstonejs/core';
import { BucketQueue } from '../BucketQueue';
const { isEqual } = utilities;
const MAX_UINT32 = 4294967295;
const TWO_THIRD_PI = 2 / (3 * Math.PI);
export class LivewireScissors {
    constructor(grayscalePixelData, width, height) {
        this._getPointIndex = (row, col) => {
            const { width } = this;
            return row * width + col;
        };
        this._getPointCoordinate = (index) => {
            const x = index % this.width;
            const y = Math.floor(index / this.width);
            return [x, y];
        };
        this._getPointCost = (pointIndex) => {
            return Math.round(this.searchGranularity * this.costs[pointIndex]);
        };
        const numPixels = grayscalePixelData.length;
        this.searchGranularityBits = 8;
        this.searchGranularity = 1 << this.searchGranularityBits;
        this.width = width;
        this.height = height;
        this.grayscalePixelData = grayscalePixelData;
        this.laplace = null;
        this.gradXNew = null;
        this.gradYNew = null;
        this.laplace = this._computeLaplace();
        this.gradMagnitude = this._computeGradient();
        this.gradXNew = this._computeGradientX();
        this.gradYNew = this._computeGradientY();
        this.visited = new Array(numPixels);
        this.parents = new Uint32Array(numPixels);
        this.costs = new Float32Array(numPixels);
    }
    startSearch(startPoint) {
        const startPointIndex = this._getPointIndex(startPoint[1], startPoint[0]);
        this.startPoint = null;
        this.visited.fill(false);
        this.parents.fill(MAX_UINT32);
        this.costs.fill(Infinity);
        this.priorityQueueNew = new BucketQueue({
            numBits: this.searchGranularityBits,
            getPriority: this._getPointCost,
        });
        this.startPoint = startPoint;
        this.costs[startPointIndex] = 0;
        this.priorityQueueNew.push(startPointIndex);
    }
    findMinNearby(testPoint, delta = 2) {
        const [x, y] = testPoint;
        const { costs } = this;
        const xRange = [
            Math.max(0, x - delta),
            Math.min(x + delta + 1, this.width),
        ];
        const yRange = [
            Math.max(0, y - delta),
            Math.min(y + delta + 1, this.height),
        ];
        let minValue = costs[this._getPointIndex(y, x)] * 0.8;
        let minPoint = testPoint;
        for (let xTest = xRange[0]; xTest < xRange[1]; xTest++) {
            for (let yTest = yRange[0]; yTest < yRange[1]; yTest++) {
                const distanceCost = 1 -
                    (Math.abs(xTest - testPoint[0]) + Math.abs(yTest - testPoint[1])) /
                        delta /
                        2;
                const weightCost = costs[this._getPointIndex(yTest, xTest)];
                const weight = weightCost * 0.8 + distanceCost * 0.2;
                if (weight < minValue) {
                    minPoint = [xTest, yTest];
                    minValue = weight;
                }
            }
        }
        return minPoint;
    }
    findPathToPoint(targetPoint) {
        if (!this.startPoint) {
            throw new Error('There is no search in progress');
        }
        const { startPoint, _getPointIndex: index, _getPointCoordinate: coord, } = this;
        const startPointIndex = index(startPoint[1], startPoint[0]);
        const targetPointIndex = index(targetPoint[1], targetPoint[0]);
        const { visited: visited, parents: parents, costs: cost, priorityQueueNew: priorityQueue, } = this;
        if (targetPointIndex === startPointIndex) {
            return [];
        }
        while (!priorityQueue.isEmpty() &&
            parents[targetPointIndex] === MAX_UINT32) {
            const pointIndex = priorityQueue.pop();
            if (visited[pointIndex]) {
                continue;
            }
            const point = coord(pointIndex);
            const neighborsPoints = this._getNeighborPoints(point);
            visited[pointIndex] = true;
            for (let i = 0, len = neighborsPoints.length; i < len; i++) {
                const neighborPoint = neighborsPoints[i];
                const neighborPointIndex = index(neighborPoint[1], neighborPoint[0]);
                const dist = this._getWeightedDistance(point, neighborPoint);
                const neighborCost = cost[pointIndex] + dist;
                if (neighborCost < cost[neighborPointIndex]) {
                    if (cost[neighborPointIndex] !== Infinity) {
                        priorityQueue.remove(neighborPointIndex);
                    }
                    cost[neighborPointIndex] = neighborCost;
                    parents[neighborPointIndex] = pointIndex;
                    priorityQueue.push(neighborPointIndex);
                }
            }
        }
        const pathPoints = [];
        let pathPointIndex = targetPointIndex;
        while (pathPointIndex !== MAX_UINT32) {
            pathPoints.push(coord(pathPointIndex));
            pathPointIndex = parents[pathPointIndex];
        }
        return pathPoints.reverse();
    }
    _getDeltaX(x, y) {
        const { grayscalePixelData: data, width } = this;
        let index = this._getPointIndex(y, x);
        if (x + 1 === width) {
            index--;
        }
        return data[index + 1] - data[index];
    }
    _getDeltaY(x, y) {
        const { grayscalePixelData: data, width, height } = this;
        let index = this._getPointIndex(y, x);
        if (y + 1 === height) {
            index -= width;
        }
        return data[index] - data[index + width];
    }
    _getGradientMagnitude(x, y) {
        const dx = this._getDeltaX(x, y);
        const dy = this._getDeltaY(x, y);
        return Math.sqrt(dx * dx + dy * dy);
    }
    _getLaplace(x, y) {
        const { grayscalePixelData: data, _getPointIndex: index } = this;
        const p02 = data[index(y - 2, x)];
        const p11 = data[index(y - 1, x - 1)];
        const p12 = data[index(y - 1, x)];
        const p13 = data[index(y - 1, x + 1)];
        const p20 = data[index(y, x - 2)];
        const p21 = data[index(y, x - 1)];
        const p22 = data[index(y, x)];
        const p23 = data[index(y, x + 1)];
        const p24 = data[index(y, x + 2)];
        const p31 = data[index(y + 1, x - 1)];
        const p32 = data[index(y + 1, x)];
        const p33 = data[index(y + 1, x + 1)];
        const p42 = data[index(y + 2, x)];
        let lap = p02;
        lap += p11 + 2 * p12 + p13;
        lap += p20 + 2 * p21 - 16 * p22 + 2 * p23 + p24;
        lap += p31 + 2 * p32 + p33;
        lap += p42;
        return lap;
    }
    _computeGradient() {
        const { width, height } = this;
        const gradient = new Float32Array(width * height);
        let pixelIndex = 0;
        let max = 0;
        let x = 0;
        let y = 0;
        for (y = 0; y < height - 1; y++) {
            for (x = 0; x < width - 1; x++) {
                gradient[pixelIndex] = this._getGradientMagnitude(x, y);
                max = Math.max(gradient[pixelIndex], max);
                pixelIndex++;
            }
            gradient[pixelIndex] = gradient[pixelIndex - 1];
            pixelIndex++;
        }
        for (let len = gradient.length; pixelIndex < len; pixelIndex++) {
            gradient[pixelIndex] = gradient[pixelIndex - width];
        }
        for (let i = 0, len = gradient.length; i < len; i++) {
            gradient[i] = 1 - gradient[i] / max;
        }
        return gradient;
    }
    _computeLaplace() {
        const { width, height, _getPointIndex: index } = this;
        const laplace = new Float32Array(width * height);
        laplace.fill(1, 0, index(2, 0));
        for (let y = 2; y < height - 2; y++) {
            laplace[index(y, 0)] = 1;
            laplace[index(y, 1)] = 1;
            for (let x = 2; x < width - 2; x++) {
                laplace[index(y, x)] = this._getLaplace(x, y) > 0.33 ? 0 : 1;
            }
            laplace[index(y, width - 2)] = 1;
            laplace[index(y, width - 1)] = 1;
        }
        laplace.fill(1, index(height - 2, 0));
        return laplace;
    }
    _computeGradientX() {
        const { width, height } = this;
        const gradX = new Float32Array(width * height);
        let pixelIndex = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                gradX[pixelIndex++] = this._getDeltaX(x, y);
            }
        }
        return gradX;
    }
    _computeGradientY() {
        const { width, height } = this;
        const gradY = new Float32Array(width * height);
        let pixelIndex = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                gradY[pixelIndex++] = this._getDeltaY(x, y);
            }
        }
        return gradY;
    }
    _getGradientUnitVector(px, py) {
        const { gradXNew, gradYNew, _getPointIndex: index } = this;
        const pointGradX = gradXNew[index(py, px)];
        const pointGradY = gradYNew[index(py, px)];
        let gradVecLen = Math.sqrt(pointGradX * pointGradX + pointGradY * pointGradY);
        gradVecLen = Math.max(gradVecLen, 1e-100);
        return [pointGradX / gradVecLen, pointGradY / gradVecLen];
    }
    _getGradientDirection(px, py, qx, qy) {
        const dgpUnitVec = this._getGradientUnitVector(px, py);
        const gdqUnitVec = this._getGradientUnitVector(qx, qy);
        let dp = dgpUnitVec[1] * (qx - px) - dgpUnitVec[0] * (qy - py);
        let dq = gdqUnitVec[1] * (qx - px) - gdqUnitVec[0] * (qy - py);
        if (dp < 0) {
            dp = -dp;
            dq = -dq;
        }
        if (px !== qx && py !== qy) {
            dp *= Math.SQRT1_2;
            dq *= Math.SQRT1_2;
        }
        dq = Math.min(Math.max(dq, -1), 1);
        const direction = TWO_THIRD_PI * (Math.acos(Math.min(dp, 1)) + Math.acos(dq));
        if (isNaN(direction) || !isFinite(direction)) {
            console.warn('Found non-direction:', px, py, qx, qy, dp, dq, direction);
            return 1;
        }
        return direction;
    }
    getCost(pointA, pointB) {
        return this._getWeightedDistance(pointA, pointB);
    }
    _getWeightedDistance(pointA, pointB) {
        const { _getPointIndex: index, width, height } = this;
        const [aX, aY] = pointA;
        const [bX, bY] = pointB;
        if (bX < 0 || bX >= width || bY < 0 || bY >= height) {
            return 1;
        }
        if (aX < 0 || aY < 0 || aX >= width || aY >= height) {
            return 0;
        }
        const bIndex = index(bY, bX);
        let gradient = this.gradMagnitude[bIndex];
        if (aX === bX || aY === bY) {
            gradient *= Math.SQRT1_2;
        }
        const laplace = this.laplace[bIndex];
        const direction = this._getGradientDirection(aX, aY, bX, bY);
        return 0.43 * gradient + 0.43 * laplace + 0.11 * direction;
    }
    _getNeighborPoints(point) {
        const { width, height } = this;
        const list = [];
        const sx = Math.max(point[0] - 1, 0);
        const sy = Math.max(point[1] - 1, 0);
        const ex = Math.min(point[0] + 1, width - 1);
        const ey = Math.min(point[1] + 1, height - 1);
        for (let y = sy; y <= ey; y++) {
            for (let x = sx; x <= ex; x++) {
                if (x !== point[0] || y !== point[1]) {
                    list.push([x, y]);
                }
            }
        }
        return list;
    }
    static createInstanceFromRawPixelData(pixelData, width, height, voiRange) {
        const numPixels = pixelData.length;
        const grayscalePixelData = new Float32Array(numPixels);
        const { lower: minPixelValue, upper: maxPixelValue } = voiRange;
        const pixelRange = maxPixelValue - minPixelValue;
        for (let i = 0, len = pixelData.length; i < len; i++) {
            grayscalePixelData[i] = Math.max(0, Math.min(1, (pixelData[i] - minPixelValue) / pixelRange));
        }
        return new LivewireScissors(grayscalePixelData, width, height);
    }
}
