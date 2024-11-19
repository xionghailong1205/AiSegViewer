import type { Annotations, Annotation } from '../../types/AnnotationTypes';
import type { AnnotationGroupSelector } from '../../types';
import { getAnnotation } from './getAnnotation';
declare function getAnnotationManager(): import("./FrameOfReferenceSpecificAnnotationManager").default;
declare function setAnnotationManager(annotationManager: any): void;
declare function resetAnnotationManager(): void;
declare function getAnnotations(toolName: string, annotationGroupSelector: AnnotationGroupSelector): Annotations;
declare function getAllAnnotations(): Annotations;
declare function clearParentAnnotation(annotation: Annotation): void;
declare function addChildAnnotation(parentAnnotation: Annotation, childAnnotation: Annotation): void;
declare function getParentAnnotation(annotation: Annotation): Annotation;
declare function getChildAnnotations(annotation: Annotation): Annotation[];
declare function addAnnotation(annotation: Annotation, annotationGroupSelector: AnnotationGroupSelector): string;
declare function getNumberOfAnnotations(toolName: string, annotationGroupSelector: AnnotationGroupSelector): number;
declare function removeAnnotation(annotationUID: string): void;
declare function removeAllAnnotations(): void;
declare function removeAnnotations(toolName: string, annotationGroupSelector: AnnotationGroupSelector): void;
declare function invalidateAnnotation(annotation: Annotation): void;
export { getAllAnnotations, getAnnotations, getParentAnnotation, getChildAnnotations, clearParentAnnotation, addChildAnnotation, getNumberOfAnnotations, addAnnotation, removeAnnotation, removeAnnotations, removeAllAnnotations, setAnnotationManager, getAnnotationManager, resetAnnotationManager, invalidateAnnotation, getAnnotation, };