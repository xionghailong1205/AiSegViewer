import { getEnabledElement, triggerEvent, eventTarget, getEnabledElementByIds, } from '@cornerstonejs/core';
import { Events, ChangeTypes } from '../../../enums';
import { getToolGroupsWithToolName } from '../../../store/ToolGroupManager';
function triggerAnnotationAddedForElement(annotation, element) {
    const enabledElement = getEnabledElement(element);
    const { renderingEngine, viewportId } = enabledElement;
    const eventType = Events.ANNOTATION_ADDED;
    const eventDetail = {
        annotation,
        viewportId,
        renderingEngineId: renderingEngine.id,
    };
    triggerEvent(eventTarget, eventType, eventDetail);
}
function triggerAnnotationAddedForFOR(annotation) {
    const { toolName } = annotation.metadata;
    const toolGroups = getToolGroupsWithToolName(toolName);
    if (!toolGroups.length) {
        return;
    }
    const viewportsToRender = [];
    toolGroups.forEach((toolGroup) => {
        toolGroup.viewportsInfo.forEach((viewportInfo) => {
            const { renderingEngineId, viewportId } = viewportInfo;
            const { FrameOfReferenceUID } = getEnabledElementByIds(viewportId, renderingEngineId);
            if (annotation.metadata.FrameOfReferenceUID === FrameOfReferenceUID) {
                viewportsToRender.push(viewportInfo);
            }
        });
    });
    const eventType = Events.ANNOTATION_ADDED;
    const eventDetail = { annotation };
    if (!viewportsToRender.length) {
        triggerEvent(eventTarget, eventType, eventDetail);
        return;
    }
    viewportsToRender.forEach(({ renderingEngineId, viewportId }) => {
        eventDetail.viewportId = viewportId;
        eventDetail.renderingEngineId = renderingEngineId;
        triggerEvent(eventTarget, eventType, eventDetail);
    });
}
function triggerAnnotationRemoved(eventDetail) {
    const eventType = Events.ANNOTATION_REMOVED;
    triggerEvent(eventTarget, eventType, eventDetail);
}
function triggerAnnotationModified(annotation, element, changeType = ChangeTypes.HandlesUpdated) {
    const enabledElement = getEnabledElement(element);
    const { viewportId, renderingEngineId } = enabledElement;
    const eventType = Events.ANNOTATION_MODIFIED;
    const eventDetail = {
        annotation,
        viewportId,
        renderingEngineId,
        changeType,
    };
    triggerEvent(eventTarget, eventType, eventDetail);
}
function triggerAnnotationCompleted(annotation) {
    const eventDetail = {
        annotation,
    };
    _triggerAnnotationCompleted(eventDetail);
}
function triggerContourAnnotationCompleted(annotation, contourHoleProcessingEnabled = false) {
    const eventDetail = {
        annotation,
        contourHoleProcessingEnabled,
    };
    _triggerAnnotationCompleted(eventDetail);
}
function _triggerAnnotationCompleted(eventDetail) {
    const eventType = Events.ANNOTATION_COMPLETED;
    triggerEvent(eventTarget, eventType, eventDetail);
}
export { triggerAnnotationAddedForElement, triggerAnnotationAddedForFOR, triggerAnnotationRemoved, triggerAnnotationModified, triggerAnnotationCompleted, triggerContourAnnotationCompleted, };
