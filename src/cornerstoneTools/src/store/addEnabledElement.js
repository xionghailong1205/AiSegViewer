import { mouseEventListeners, wheelEventListener, touchEventListeners, keyEventListener, imageChangeEventListener, } from '../eventListeners';
import { imageRenderedEventDispatcher, cameraModifiedEventDispatcher, mouseToolEventDispatcher, touchToolEventDispatcher, keyboardToolEventDispatcher, imageSpacingCalibratedEventDispatcher, cameraResetEventDispatcher, } from '../eventDispatchers';
import { state } from './state';
import { annotationRenderingEngine } from '../stateManagement/annotation/AnnotationRenderingEngine';
export default function addEnabledElement(evt) {
    const { element, viewportId } = evt.detail;
    const svgLayer = _createSvgAnnotationLayer(viewportId);
    _setSvgNodeCache(element);
    _appendChild(svgLayer, element);
    annotationRenderingEngine.addViewportElement(viewportId, element);
    mouseEventListeners.enable(element);
    wheelEventListener.enable(element);
    touchEventListeners.enable(element);
    keyEventListener.enable(element);
    imageChangeEventListener.enable(element);
    imageRenderedEventDispatcher.enable(element);
    cameraModifiedEventDispatcher.enable(element);
    imageSpacingCalibratedEventDispatcher.enable(element);
    cameraResetEventDispatcher.enable(element);
    mouseToolEventDispatcher.enable(element);
    keyboardToolEventDispatcher.enable(element);
    touchToolEventDispatcher.enable(element);
    state.enabledElements.push(element);
}
function _createSvgAnnotationLayer(viewportId) {
    const svgns = 'http://www.w3.org/2000/svg';
    const svgLayer = document.createElementNS(svgns, 'svg');
    const svgLayerId = `svg-layer-${viewportId}`;
    svgLayer.classList.add('svg-layer');
    svgLayer.setAttribute('id', svgLayerId);
    svgLayer.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgLayer.style.width = '100%';
    svgLayer.style.height = '100%';
    svgLayer.style.pointerEvents = 'none';
    svgLayer.style.position = 'absolute';
    const defs = document.createElementNS(svgns, 'defs');
    const filter = document.createElementNS(svgns, 'filter');
    const feOffset = document.createElementNS(svgns, 'feOffset');
    const feColorMatrix = document.createElementNS(svgns, 'feColorMatrix');
    const feBlend = document.createElementNS(svgns, 'feBlend');
    filter.setAttribute('id', `shadow-${svgLayerId}`);
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    feOffset.setAttribute('result', 'offOut');
    feOffset.setAttribute('in', 'SourceGraphic');
    feOffset.setAttribute('dx', '0.5');
    feOffset.setAttribute('dy', '0.5');
    feColorMatrix.setAttribute('result', 'matrixOut');
    feColorMatrix.setAttribute('in', 'offOut');
    feColorMatrix.setAttribute('in2', 'matrix');
    feColorMatrix.setAttribute('values', '0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0');
    feBlend.setAttribute('in', 'SourceGraphic');
    feBlend.setAttribute('in2', 'matrixOut');
    feBlend.setAttribute('mode', 'normal');
    filter.appendChild(feOffset);
    filter.appendChild(feColorMatrix);
    filter.appendChild(feBlend);
    defs.appendChild(filter);
    svgLayer.appendChild(defs);
    return svgLayer;
}
function _setSvgNodeCache(element) {
    const { viewportUid: viewportId, renderingEngineUid: renderingEngineId } = element.dataset;
    const elementHash = `${viewportId}:${renderingEngineId}`;
    state.svgNodeCache[elementHash] = {};
}
function _appendChild(newNode, referenceNode) {
    referenceNode.querySelector('div.viewport-element').appendChild(newNode);
}
