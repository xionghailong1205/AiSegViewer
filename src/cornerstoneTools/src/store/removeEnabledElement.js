import { getEnabledElement } from '@cornerstonejs/core';
import { mouseEventListeners, wheelEventListener, touchEventListeners, keyEventListener, imageChangeEventListener, } from '../eventListeners';
import { imageRenderedEventDispatcher, cameraModifiedEventDispatcher, mouseToolEventDispatcher, keyboardToolEventDispatcher, imageSpacingCalibratedEventDispatcher, touchToolEventDispatcher, cameraResetEventDispatcher, } from '../eventDispatchers';
import filterToolsWithAnnotationsForElement from './filterToolsWithAnnotationsForElement';
import { state } from './state';
import getToolsWithModesForElement from '../utilities/getToolsWithModesForElement';
import { ToolModes } from '../enums';
import { removeAnnotation } from '../stateManagement';
import getSynchronizersForViewport from './SynchronizerManager/getSynchronizersForViewport';
import getToolGroupForViewport from './ToolGroupManager/getToolGroupForViewport';
import { annotationRenderingEngine } from '../stateManagement/annotation/AnnotationRenderingEngine';
const VIEWPORT_ELEMENT = 'viewport-element';
function removeEnabledElement(elementDisabledEvt) {
    const { element, viewportId } = elementDisabledEvt.detail;
    _resetSvgNodeCache(element);
    _removeSvgNode(element);
    annotationRenderingEngine.removeViewportElement(viewportId, element);
    mouseEventListeners.disable(element);
    wheelEventListener.disable(element);
    touchEventListeners.disable(element);
    keyEventListener.disable(element);
    imageChangeEventListener.disable(element);
    imageRenderedEventDispatcher.disable(element);
    cameraModifiedEventDispatcher.disable(element);
    imageSpacingCalibratedEventDispatcher.disable(element);
    cameraResetEventDispatcher.disable(element);
    mouseToolEventDispatcher.disable(element);
    keyboardToolEventDispatcher.disable(element);
    touchToolEventDispatcher.disable(element);
    _removeViewportFromSynchronizers(element);
    _removeViewportFromToolGroup(element);
    _removeEnabledElement(element);
}
const _removeViewportFromSynchronizers = (element) => {
    const enabledElement = getEnabledElement(element);
    const synchronizers = getSynchronizersForViewport(enabledElement.viewportId, enabledElement.renderingEngineId);
    synchronizers.forEach((sync) => {
        sync.remove(enabledElement);
    });
};
const _removeViewportFromToolGroup = (element) => {
    const { renderingEngineId, viewportId } = getEnabledElement(element);
    const toolGroup = getToolGroupForViewport(viewportId, renderingEngineId);
    if (toolGroup) {
        toolGroup.removeViewports(renderingEngineId, viewportId);
    }
};
const _removeAllToolsForElement = function (element) {
    const tools = getToolsWithModesForElement(element, [
        ToolModes.Active,
        ToolModes.Passive,
    ]);
    const toolsWithData = filterToolsWithAnnotationsForElement(element, tools);
    toolsWithData.forEach(({ annotations }) => {
        annotations.forEach((annotation) => {
            removeAnnotation(annotation.annotationUID);
        });
    });
};
function _resetSvgNodeCache(element) {
    const { viewportUid: viewportId, renderingEngineUid: renderingEngineId } = element.dataset;
    const elementHash = `${viewportId}:${renderingEngineId}`;
    delete state.svgNodeCache[elementHash];
}
function _removeSvgNode(element) {
    const internalViewportNode = element.querySelector(`div.${VIEWPORT_ELEMENT}`);
    const svgLayer = internalViewportNode.querySelector('svg');
    if (svgLayer) {
        internalViewportNode.removeChild(svgLayer);
    }
}
const _removeEnabledElement = function (element) {
    const foundElementIndex = state.enabledElements.findIndex((el) => el === element);
    if (foundElementIndex > -1) {
        state.enabledElements.splice(foundElementIndex, 1);
    }
};
export default removeEnabledElement;
