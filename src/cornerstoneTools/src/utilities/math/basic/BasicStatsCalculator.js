import { utilities } from '@cornerstonejs/core';
import Calculator from './Calculator';
const { PointsManager } = utilities;
export default class BasicStatsCalculator extends Calculator {
    static { this.max = [-Infinity]; }
    static { this.min = [Infinity]; }
    static { this.sum = [0]; }
    static { this.count = 0; }
    static { this.runMean = [0]; }
    static { this.m2 = [0]; }
    static { this.pointsInShape = PointsManager.create3(1024); }
    static statsInit(options) {
        if (!options.storePointData) {
            BasicStatsCalculator.pointsInShape = null;
        }
    }
    static { this.statsCallback = ({ value: newValue, pointLPS = null }) => {
        if (Array.isArray(newValue) &&
            newValue.length > 1 &&
            this.max.length === 1) {
            this.max.push(this.max[0], this.max[0]);
            this.min.push(this.min[0], this.min[0]);
            this.sum.push(this.sum[0], this.sum[0]);
            this.runMean.push(0, 0);
            this.m2.push(this.m2[0], this.m2[0]);
        }
        this.pointsInShape?.push(pointLPS);
        const newArray = Array.isArray(newValue) ? newValue : [newValue];
        this.count += 1;
        this.max.map((it, idx) => {
            const value = newArray[idx];
            const delta = value - this.runMean[idx];
            this.sum[idx] += value;
            this.runMean[idx] += delta / this.count;
            const delta2 = value - this.runMean[idx];
            this.m2[idx] += delta * delta2;
            this.min[idx] = Math.min(this.min[idx], value);
            this.max[idx] = Math.max(it, value);
        });
    }; }
    static { this.getStatistics = (options) => {
        const mean = this.sum.map((sum) => sum / this.count);
        const stdDev = this.m2.map((squaredDiffSum) => Math.sqrt(squaredDiffSum / this.count));
        const unit = options?.unit || null;
        const named = {
            max: {
                name: 'max',
                label: 'Max Pixel',
                value: singleArrayAsNumber(this.max),
                unit,
            },
            min: {
                name: 'min',
                label: 'Min Pixel',
                value: singleArrayAsNumber(this.min),
                unit,
            },
            mean: {
                name: 'mean',
                label: 'Mean Pixel',
                value: singleArrayAsNumber(mean),
                unit,
            },
            stdDev: {
                name: 'stdDev',
                label: 'Standard Deviation',
                value: singleArrayAsNumber(stdDev),
                unit,
            },
            count: {
                name: 'count',
                label: 'Pixel Count',
                value: this.count,
                unit: null,
            },
            pointsInShape: this.pointsInShape,
            array: [],
        };
        named.array.push(named.max, named.mean, named.stdDev, named.stdDev, named.count);
        this.max = [-Infinity];
        this.min = [Infinity];
        this.sum = [0];
        this.m2 = [0];
        this.runMean = [0];
        this.count = 0;
        this.pointsInShape = PointsManager.create3(1024);
        return named;
    }; }
}
function singleArrayAsNumber(val) {
    return val.length === 1 ? val[0] : val;
}
