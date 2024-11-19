import type { AnnotationCompletedEventType, AnnotationModifiedEventType, AnnotationRemovedEventType } from '../../../types/EventTypes';
import type AnnotationGroupSelector from '../../../types/AnnotationGroupSelector';
import type { AcceptInterpolationSelector } from '../../../types/InterpolationTypes';
export default class InterpolationManager {
    static toolNames: any[];
    static addTool(toolName: string): void;
    static acceptAutoGenerated(annotationGroupSelector: AnnotationGroupSelector, selector?: AcceptInterpolationSelector): void;
    static handleAnnotationCompleted: (evt: AnnotationCompletedEventType) => void;
    static handleAnnotationUpdate: (evt: AnnotationModifiedEventType) => void;
    static handleAnnotationDelete: (evt: AnnotationRemovedEventType) => void;
}