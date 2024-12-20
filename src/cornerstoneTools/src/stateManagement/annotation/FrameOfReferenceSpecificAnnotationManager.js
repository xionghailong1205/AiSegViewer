import { Enums, eventTarget, getEnabledElement, utilities, } from '@cornerstonejs/core';
class FrameOfReferenceSpecificAnnotationManager {
    constructor(uid) {
        this.getGroupKey = (annotationGroupSelector) => {
            if (typeof annotationGroupSelector === 'string') {
                return annotationGroupSelector;
            }
            const element = annotationGroupSelector;
            const enabledElement = getEnabledElement(element);
            if (!enabledElement) {
                throw new Error('Element not enabled, you must have an enabled element if you are not providing a FrameOfReferenceUID');
            }
            return enabledElement.FrameOfReferenceUID;
        };
        this._imageVolumeModifiedHandler = (evt) => {
            const eventDetail = evt.detail;
            const { FrameOfReferenceUID } = eventDetail;
            const annotations = this.annotations;
            const frameOfReferenceSpecificAnnotations = annotations[FrameOfReferenceUID];
            if (!frameOfReferenceSpecificAnnotations) {
                return;
            }
            Object.keys(frameOfReferenceSpecificAnnotations).forEach((toolName) => {
                const toolSpecificAnnotations = frameOfReferenceSpecificAnnotations[toolName];
                toolSpecificAnnotations.forEach((annotation) => {
                    const invalidated = annotation.invalidated;
                    if (invalidated !== undefined) {
                        annotation.invalidated = true;
                    }
                });
            });
        };
        this.getFramesOfReference = () => {
            return Object.keys(this.annotations);
        };
        this.getAnnotations = (groupKey, toolName) => {
            const annotations = this.annotations;
            if (!annotations[groupKey]) {
                return [];
            }
            if (toolName) {
                return annotations[groupKey][toolName]
                    ? annotations[groupKey][toolName]
                    : [];
            }
            return annotations[groupKey];
        };
        this.getAnnotation = (annotationUID) => {
            const annotations = this.annotations;
            for (const frameOfReferenceUID in annotations) {
                const frameOfReferenceAnnotations = annotations[frameOfReferenceUID];
                for (const toolName in frameOfReferenceAnnotations) {
                    const toolSpecificAnnotations = frameOfReferenceAnnotations[toolName];
                    for (const annotation of toolSpecificAnnotations) {
                        if (annotationUID === annotation.annotationUID) {
                            return annotation;
                        }
                    }
                }
            }
        };
        this.getNumberOfAnnotations = (groupKey, toolName) => {
            const annotations = this.getAnnotations(groupKey, toolName);
            if (!annotations.length) {
                return 0;
            }
            if (toolName) {
                return annotations.length;
            }
            let total = 0;
            for (const toolName in annotations) {
                total += annotations[toolName].length;
            }
            return total;
        };
        this.addAnnotation = (annotation, groupKey) => {
            const { metadata } = annotation;
            const { FrameOfReferenceUID, toolName } = metadata;
            groupKey = groupKey || FrameOfReferenceUID;
            const annotations = this.annotations;
            let frameOfReferenceSpecificAnnotations = annotations[groupKey];
            if (!frameOfReferenceSpecificAnnotations) {
                annotations[groupKey] = {};
                frameOfReferenceSpecificAnnotations = annotations[groupKey];
            }
            let toolSpecificAnnotations = frameOfReferenceSpecificAnnotations[toolName];
            if (!toolSpecificAnnotations) {
                frameOfReferenceSpecificAnnotations[toolName] = [];
                toolSpecificAnnotations = frameOfReferenceSpecificAnnotations[toolName];
            }
            if (this.preprocessingFn) {
                annotation = this.preprocessingFn(annotation);
            }
            toolSpecificAnnotations.push(annotation);
        };
        this.removeAnnotation = (annotationUID) => {
            const { annotations } = this;
            for (const groupKey in annotations) {
                const groupAnnotations = annotations[groupKey];
                for (const toolName in groupAnnotations) {
                    const toolAnnotations = groupAnnotations[toolName];
                    const index = toolAnnotations.findIndex((annotation) => annotation.annotationUID === annotationUID);
                    if (index !== -1) {
                        toolAnnotations.splice(index, 1);
                        if (toolAnnotations.length === 0) {
                            delete groupAnnotations[toolName];
                        }
                    }
                }
                if (Object.keys(groupAnnotations).length === 0) {
                    delete annotations[groupKey];
                }
            }
        };
        this.removeAnnotations = (groupKey, toolName) => {
            const annotations = this.annotations;
            const removedAnnotations = [];
            if (!annotations[groupKey]) {
                return removedAnnotations;
            }
            if (toolName) {
                const annotationsForTool = annotations[groupKey][toolName];
                for (const annotation of annotationsForTool) {
                    this.removeAnnotation(annotation.annotationUID);
                    removedAnnotations.push(annotation);
                }
            }
            else {
                for (const toolName in annotations[groupKey]) {
                    const annotationsForTool = annotations[groupKey][toolName];
                    for (const annotation of annotationsForTool) {
                        this.removeAnnotation(annotation.annotationUID);
                        removedAnnotations.push(annotation);
                    }
                }
            }
            return removedAnnotations;
        };
        this.saveAnnotations = (groupKey, toolName) => {
            const annotations = this.annotations;
            if (groupKey && toolName) {
                const frameOfReferenceSpecificAnnotations = annotations[groupKey];
                if (!frameOfReferenceSpecificAnnotations) {
                    return;
                }
                const toolSpecificAnnotations = frameOfReferenceSpecificAnnotations[toolName];
                return structuredClone(toolSpecificAnnotations);
            }
            else if (groupKey) {
                const frameOfReferenceSpecificAnnotations = annotations[groupKey];
                return structuredClone(frameOfReferenceSpecificAnnotations);
            }
            return structuredClone(annotations);
        };
        this.restoreAnnotations = (state, groupKey, toolName) => {
            const annotations = this.annotations;
            if (groupKey && toolName) {
                let frameOfReferenceSpecificAnnotations = annotations[groupKey];
                if (!frameOfReferenceSpecificAnnotations) {
                    annotations[groupKey] = {};
                    frameOfReferenceSpecificAnnotations = annotations[groupKey];
                }
                frameOfReferenceSpecificAnnotations[toolName] = state;
            }
            else if (groupKey) {
                annotations[groupKey] = state;
            }
            else {
                this.annotations = structuredClone(state);
            }
        };
        this.getAllAnnotations = () => {
            return Object.values(this.annotations)
                .map((frameOfReferenceSpecificAnnotations) => Object.values(frameOfReferenceSpecificAnnotations))
                .flat(2);
        };
        this.getNumberOfAllAnnotations = () => {
            let count = 0;
            const annotations = this.annotations;
            for (const groupKey in annotations) {
                const frameOfReferenceSpecificAnnotations = annotations[groupKey];
                for (const toolName in frameOfReferenceSpecificAnnotations) {
                    const toolSpecificAnnotations = frameOfReferenceSpecificAnnotations[toolName];
                    count += toolSpecificAnnotations.length;
                }
            }
            return count;
        };
        this.removeAllAnnotations = () => {
            const removedAnnotations = [];
            for (const annotation of this.getAllAnnotations()) {
                this.removeAnnotation(annotation.annotationUID);
                removedAnnotations.push(annotation);
            }
            return removedAnnotations;
        };
        if (!uid) {
            uid = utilities.uuidv4();
        }
        this.annotations = {};
        this.uid = uid;
        eventTarget.addEventListener(Enums.Events.IMAGE_VOLUME_MODIFIED, this._imageVolumeModifiedHandler);
    }
    setPreprocessingFn(preprocessingFn) {
        this.preprocessingFn = preprocessingFn;
    }
}
const defaultFrameOfReferenceSpecificAnnotationManager = new FrameOfReferenceSpecificAnnotationManager('DEFAULT');
export { defaultFrameOfReferenceSpecificAnnotationManager };
export default FrameOfReferenceSpecificAnnotationManager;
