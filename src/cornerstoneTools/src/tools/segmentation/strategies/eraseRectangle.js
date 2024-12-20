import { fillInsideRectangle } from './fillRectangle';
function eraseRectangle(enabledElement, operationData, inside = true) {
    const eraseOperationData = Object.assign({}, operationData, {
        segmentIndex: 0,
    });
    fillInsideRectangle(enabledElement, eraseOperationData);
}
export function eraseInsideRectangle(enabledElement, operationData) {
    eraseRectangle(enabledElement, operationData, true);
}
export function eraseOutsideRectangle(enabledElement, operationData) {
    eraseRectangle(enabledElement, operationData, false);
}
