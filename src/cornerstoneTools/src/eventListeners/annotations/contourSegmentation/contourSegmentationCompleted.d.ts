import type { Types } from '@cornerstonejs/core';
import type { ContourSegmentationAnnotation } from '../../../types/ContourSegmentationAnnotation';
import type { AnnotationCompletedEventType } from '../../../types/EventTypes';
export default function contourSegmentationCompletedListener(evt: AnnotationCompletedEventType): Promise<void>;
export declare function createPolylineHole(viewport: Types.IViewport, targetAnnotation: ContourSegmentationAnnotation, holeAnnotation: ContourSegmentationAnnotation): void;
