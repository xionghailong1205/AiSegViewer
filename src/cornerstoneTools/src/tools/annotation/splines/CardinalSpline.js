import { CubicSpline } from './CubicSpline';
class CardinalSpline extends CubicSpline {
    constructor(props) {
        super(props);
        this._scale = props?.scale ?? 0.5;
        this._fixedScale = props?.fixedScale ?? false;
    }
    get scale() {
        return this._scale;
    }
    set scale(scale) {
        if (this._fixedScale || this._scale === scale) {
            return;
        }
        this._scale = scale;
        this.invalidated = true;
    }
    get fixedScale() {
        return this._fixedScale;
    }
    getTransformMatrix() {
        const { scale: s } = this;
        const s2 = 2 * s;
        return [
            0, 1, 0, 0,
            -s, 0, s, 0,
            s2, s - 3, 3 - s2, -s,
            -s, 2 - s, s - 2, s
        ];
    }
}
export { CardinalSpline as default, CardinalSpline };
