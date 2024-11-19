import { CardinalSpline } from './CardinalSpline';
class LinearSpline extends CardinalSpline {
    constructor() {
        super({ resolution: 0, fixedResolution: true, scale: 0, fixedScale: true });
    }
}
export { LinearSpline as default, LinearSpline };