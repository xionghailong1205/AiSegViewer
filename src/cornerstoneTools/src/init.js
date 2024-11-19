import { eventTarget, Enums } from '@cornerstonejs/core';
import { getAnnotationManager } from './stateManagement/annotation/annotationState';
import { Events as TOOLS_EVENTS } from './enums';
import { addEnabledElement, removeEnabledElement } from './store';
import { resetCornerstoneToolsState } from './store/state';
import { annotationCompletedListener, annotationRemovedListener, annotationSelectionListener, annotationModifiedListener, segmentationDataModifiedEventListener, segmentationModifiedListener, } from './eventListeners';
import { annotationInterpolationEventDispatcher } from './eventDispatchers';
import * as ToolGroupManager from './store/ToolGroupManager';
import { defaultSegmentationStateManager } from './stateManagement/segmentation/SegmentationStateManager';
import segmentationRepresentationModifiedListener from './eventListeners/segmentation/segmentationRepresentationModifiedListener';
let csToolsInitialized = false;
export function init(defaultConfiguration = {}) {
    if (csToolsInitialized) {
        return;
    }
    _addCornerstoneEventListeners();
    _addCornerstoneToolsEventListeners();
    csToolsInitialized = true;
}
export function destroy() {
    _removeCornerstoneEventListeners();
    _removeCornerstoneToolsEventListeners();
    ToolGroupManager.destroy();
    resetCornerstoneToolsState();
    const annotationManager = getAnnotationManager();
    const segmentationStateManager = defaultSegmentationStateManager;
    annotationManager.restoreAnnotations({});
    segmentationStateManager.resetState();
    csToolsInitialized = false;
}
function _addCornerstoneEventListeners() {
    _removeCornerstoneEventListeners();
    const elementEnabledEvent = Enums.Events.ELEMENT_ENABLED;
    const elementDisabledEvent = Enums.Events.ELEMENT_DISABLED;
    eventTarget.addEventListener(elementEnabledEvent, addEnabledElement);
    eventTarget.addEventListener(elementDisabledEvent, removeEnabledElement);
    annotationInterpolationEventDispatcher.enable();
}
function _removeCornerstoneEventListeners() {
    const elementEnabledEvent = Enums.Events.ELEMENT_ENABLED;
    const elementDisabledEvent = Enums.Events.ELEMENT_DISABLED;
    eventTarget.removeEventListener(elementEnabledEvent, addEnabledElement);
    eventTarget.removeEventListener(elementDisabledEvent, removeEnabledElement);
    annotationInterpolationEventDispatcher.disable();
}
function _addCornerstoneToolsEventListeners() {
    _removeCornerstoneToolsEventListeners();
    eventTarget.addEventListener(TOOLS_EVENTS.ANNOTATION_COMPLETED, annotationCompletedListener);
    eventTarget.addEventListener(TOOLS_EVENTS.ANNOTATION_MODIFIED, annotationModifiedListener);
    eventTarget.addEventListener(TOOLS_EVENTS.ANNOTATION_SELECTION_CHANGE, annotationSelectionListener);
    eventTarget.addEventListener(TOOLS_EVENTS.ANNOTATION_SELECTION_CHANGE, annotationSelectionListener);
    eventTarget.addEventListener(TOOLS_EVENTS.ANNOTATION_REMOVED, annotationRemovedListener);
    eventTarget.addEventListener(TOOLS_EVENTS.SEGMENTATION_MODIFIED, segmentationModifiedListener);
    eventTarget.addEventListener(TOOLS_EVENTS.SEGMENTATION_DATA_MODIFIED, segmentationDataModifiedEventListener);
    eventTarget.addEventListener(TOOLS_EVENTS.SEGMENTATION_REPRESENTATION_MODIFIED, segmentationRepresentationModifiedListener);
    eventTarget.addEventListener(TOOLS_EVENTS.SEGMENTATION_REPRESENTATION_ADDED, segmentationRepresentationModifiedListener);
}
function _removeCornerstoneToolsEventListeners() {
    eventTarget.removeEventListener(TOOLS_EVENTS.ANNOTATION_COMPLETED, annotationCompletedListener);
    eventTarget.removeEventListener(TOOLS_EVENTS.ANNOTATION_MODIFIED, annotationModifiedListener);
    eventTarget.removeEventListener(TOOLS_EVENTS.ANNOTATION_SELECTION_CHANGE, annotationSelectionListener);
    eventTarget.removeEventListener(TOOLS_EVENTS.ANNOTATION_SELECTION_CHANGE, annotationSelectionListener);
    eventTarget.removeEventListener(TOOLS_EVENTS.SEGMENTATION_MODIFIED, segmentationModifiedListener);
    eventTarget.removeEventListener(TOOLS_EVENTS.SEGMENTATION_DATA_MODIFIED, segmentationDataModifiedEventListener);
    eventTarget.removeEventListener(TOOLS_EVENTS.SEGMENTATION_REPRESENTATION_MODIFIED, segmentationRepresentationModifiedListener);
    eventTarget.removeEventListener(TOOLS_EVENTS.SEGMENTATION_REPRESENTATION_ADDED, segmentationRepresentationModifiedListener);
}
export default init;
