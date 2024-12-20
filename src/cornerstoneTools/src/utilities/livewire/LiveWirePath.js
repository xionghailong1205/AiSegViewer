export class LivewirePath {
    constructor(inputPointArray, inputControlPointIndexArray) {
        this.pointArray = inputPointArray ? inputPointArray.slice() : [];
        this._controlPointIndexes = inputControlPointIndexArray
            ? inputControlPointIndexArray.slice()
            : [];
    }
    getPoint(index) {
        return this.pointArray[index];
    }
    getLastPoint() {
        return this.pointArray[this.pointArray.length - 1];
    }
    isControlPoint(point) {
        const index = this.pointArray.indexOf(point);
        if (index !== -1) {
            return this._controlPointIndexes.indexOf(index) !== -1;
        }
        else {
            throw new Error('Error: isControlPoint called with not in list point.');
        }
    }
    addPoint(point) {
        this.pointArray.push(point);
    }
    addControlPoint(point) {
        const index = this.pointArray.indexOf(point);
        if (index !== -1) {
            this._controlPointIndexes.push(index);
        }
        else {
            throw new Error('Cannot mark a non registered point as control point.');
        }
    }
    getControlPoints() {
        return this._controlPointIndexes.map((i) => this.pointArray[i]);
    }
    getNumControlPoints() {
        return this._controlPointIndexes.length;
    }
    removeLastControlPoint() {
        if (this._controlPointIndexes.length) {
            this._controlPointIndexes.pop();
        }
    }
    getLastControlPoint() {
        if (this._controlPointIndexes.length) {
            return this.pointArray[this._controlPointIndexes[this._controlPointIndexes.length - 1]];
        }
    }
    removeLastPoints(count) {
        this.pointArray.splice(this.pointArray.length - count, count);
    }
    addPoints(newPointArray) {
        this.pointArray = this.pointArray.concat(newPointArray);
    }
    prependPath(other) {
        const otherSize = other.pointArray.length;
        const shiftedIndexArray = [];
        this.pointArray = other.pointArray.concat(this.pointArray);
        for (let i = 0; i < this._controlPointIndexes.length; ++i) {
            shiftedIndexArray[i] = this._controlPointIndexes[i] + otherSize;
        }
        this._controlPointIndexes =
            other._controlPointIndexes.concat(shiftedIndexArray);
    }
    appendPath(other) {
        this.addPoints(other.pointArray);
        other._controlPointIndexes.forEach((point) => this._controlPointIndexes.push(point));
    }
}
