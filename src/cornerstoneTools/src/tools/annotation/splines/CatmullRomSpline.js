import { CardinalSpline } from './CardinalSpline';
class CatmullRomSpline extends CardinalSpline {
    constructor() {
        super({ scale: 0.5, fixedScale: true });
    }
}
export { CatmullRomSpline as default, CatmullRomSpline };
