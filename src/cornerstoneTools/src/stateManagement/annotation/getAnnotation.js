import { defaultFrameOfReferenceSpecificAnnotationManager } from './FrameOfReferenceSpecificAnnotationManager';
export function getAnnotation(annotationUID) {
    const manager = defaultFrameOfReferenceSpecificAnnotationManager;
    const annotation = manager.getAnnotation(annotationUID);
    return annotation;
}
