import { getEnabledElement } from '@cornerstonejs/core';
export default function getTouchEventPoints(evt, element) {
    const elementToUse = element || evt.currentTarget;
    const touches = evt.type === 'touchend' ? evt.changedTouches : evt.touches;
    return Object.keys(touches).map((i) => {
        const clientPoint = _clientToPoint(touches[i]);
        const pagePoint = _pageToPoint(touches[i]);
        const canvasPoint = _pagePointsToCanvasPoints(elementToUse, pagePoint);
        const { viewport } = getEnabledElement(elementToUse);
        const worldPoint = viewport.canvasToWorld(canvasPoint);
        return {
            page: pagePoint,
            client: clientPoint,
            canvas: canvasPoint,
            world: worldPoint,
            touch: {
                identifier: i,
                radiusX: touches[i].radiusX,
                radiusY: touches[i].radiusY,
                force: touches[i].force,
                rotationAngle: touches[i].rotationAngle,
            },
        };
    });
}
function _pagePointsToCanvasPoints(element, pagePoint) {
    const rect = element.getBoundingClientRect();
    return [
        pagePoint[0] - rect.left - window.pageXOffset,
        pagePoint[1] - rect.top - window.pageYOffset,
    ];
}
function _pageToPoint(touch) {
    return [touch.pageX, touch.pageY];
}
function _clientToPoint(touch) {
    return [touch.clientX, touch.clientY];
}
