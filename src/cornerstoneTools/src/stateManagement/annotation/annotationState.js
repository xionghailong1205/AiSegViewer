import { utilities as csUtils } from '@cornerstonejs/core';
import { defaultFrameOfReferenceSpecificAnnotationManager } from './FrameOfReferenceSpecificAnnotationManager';
import { getAnnotation } from './getAnnotation';
import { triggerAnnotationAddedForElement, triggerAnnotationAddedForFOR, triggerAnnotationRemoved, } from './helpers/state';
import { checkAndSetAnnotationLocked } from './annotationLocking';
import { checkAndDefineCachedStatsProperty, checkAndDefineTextBoxProperty, } from './utilities/defineProperties';
import { checkAndSetAnnotationVisibility } from './annotationVisibility';
let defaultManager = defaultFrameOfReferenceSpecificAnnotationManager;
const preprocessingFn = (annotation) => {
    annotation = checkAndDefineTextBoxProperty(annotation);
    annotation = checkAndDefineCachedStatsProperty(annotation);
    const uid = annotation.annotationUID;
    const isLocked = checkAndSetAnnotationLocked(uid);
    annotation.isLocked = isLocked;
    const isVisible = checkAndSetAnnotationVisibility(uid);
    annotation.isVisible = isVisible;
    return annotation;
};
defaultManager.setPreprocessingFn(preprocessingFn);
function getAnnotationManager() {
    return defaultManager;
}
function setAnnotationManager(annotationManager) {
    defaultManager = annotationManager;
}
function resetAnnotationManager() {
    defaultManager = defaultFrameOfReferenceSpecificAnnotationManager;
}
function getAnnotations(toolName, annotationGroupSelector) {
    const manager = getAnnotationManager();
    const groupKey = manager.getGroupKey(annotationGroupSelector);
    return manager.getAnnotations(groupKey, toolName);
}
function getAllAnnotations() {
    const manager = getAnnotationManager();
    return manager.getAllAnnotations();
}
function clearParentAnnotation(annotation) {
    const { annotationUID: childUID, parentAnnotationUID } = annotation;
    if (!parentAnnotationUID) {
        return;
    }
    const parentAnnotation = getAnnotation(parentAnnotationUID);
    const childUIDIndex = parentAnnotation.childAnnotationUIDs.indexOf(childUID);
    parentAnnotation.childAnnotationUIDs.splice(childUIDIndex, 1);
    annotation.parentAnnotationUID = undefined;
}
function addChildAnnotation(parentAnnotation, childAnnotation) {
    const { annotationUID: parentUID } = parentAnnotation;
    const { annotationUID: childUID } = childAnnotation;
    clearParentAnnotation(childAnnotation);
    if (!parentAnnotation.childAnnotationUIDs) {
        parentAnnotation.childAnnotationUIDs = [];
    }
    if (parentAnnotation.childAnnotationUIDs.includes(childUID)) {
        return;
    }
    parentAnnotation.childAnnotationUIDs.push(childUID);
    childAnnotation.parentAnnotationUID = parentUID;
}
function getParentAnnotation(annotation) {
    return annotation.parentAnnotationUID
        ? getAnnotation(annotation.parentAnnotationUID)
        : undefined;
}
function getChildAnnotations(annotation) {
    return (annotation.childAnnotationUIDs?.map((childAnnotationUID) => getAnnotation(childAnnotationUID)) ?? []);
}
function addAnnotation(annotation, annotationGroupSelector) {
    if (!annotation.annotationUID) {
        annotation.annotationUID = csUtils.uuidv4();
    }
    const manager = getAnnotationManager();
    if (annotationGroupSelector instanceof HTMLDivElement) {
        const groupKey = manager.getGroupKey(annotationGroupSelector);
        manager.addAnnotation(annotation, groupKey);
        triggerAnnotationAddedForElement(annotation, annotationGroupSelector);
    }
    else {
        manager.addAnnotation(annotation, undefined);
        triggerAnnotationAddedForFOR(annotation);
    }
    return annotation.annotationUID;
}
function getNumberOfAnnotations(toolName, annotationGroupSelector) {
    const manager = getAnnotationManager();
    const groupKey = manager.getGroupKey(annotationGroupSelector);
    return manager.getNumberOfAnnotations(groupKey, toolName);
}
function removeAnnotation(annotationUID) {
    if (!annotationUID) {
        return;
    }
    const manager = getAnnotationManager();
    const annotation = manager.getAnnotation(annotationUID);
    if (!annotation) {
        return;
    }
    annotation.childAnnotationUIDs?.forEach((childAnnotationUID) => removeAnnotation(childAnnotationUID));
    manager.removeAnnotation(annotationUID);
    triggerAnnotationRemoved({ annotation, annotationManagerUID: manager.uid });
}
function removeAllAnnotations() {
    const manager = getAnnotationManager();
    const removedAnnotations = manager.removeAllAnnotations();
    for (const annotation of removedAnnotations) {
        triggerAnnotationRemoved({
            annotation,
            annotationManagerUID: manager.uid,
        });
    }
}
function removeAnnotations(toolName, annotationGroupSelector) {
    const manager = getAnnotationManager();
    const groupKey = manager.getGroupKey(annotationGroupSelector);
    const removedAnnotations = manager.removeAnnotations(groupKey, toolName);
    for (const annotation of removedAnnotations) {
        triggerAnnotationRemoved({
            annotation,
            annotationManagerUID: manager.uid,
        });
    }
}
function invalidateAnnotation(annotation) {
    let currAnnotation = annotation;
    while (currAnnotation) {
        currAnnotation.invalidated = true;
        currAnnotation = currAnnotation.parentAnnotationUID
            ? getAnnotation(currAnnotation.parentAnnotationUID)
            : undefined;
    }
}
export { getAllAnnotations, getAnnotations, getParentAnnotation, getChildAnnotations, clearParentAnnotation, addChildAnnotation, getNumberOfAnnotations, addAnnotation, removeAnnotation, removeAnnotations, removeAllAnnotations, setAnnotationManager, getAnnotationManager, resetAnnotationManager, invalidateAnnotation, getAnnotation, };
