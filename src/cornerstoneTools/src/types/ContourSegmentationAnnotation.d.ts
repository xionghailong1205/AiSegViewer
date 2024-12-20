import type { Types } from '@cornerstonejs/core';
import type { ContourAnnotation } from './ContourAnnotation';
export type ContourSegmentationAnnotationData = {
    autoGenerated?: boolean;
    interpolationUID?: string;
    interpolationCompleted?: boolean;
    data: {
        segmentation: {
            segmentationId: string;
            segmentIndex: number;
        };
        contour: {
            originalPolyline?: Types.Point3[];
        };
    };
    metadata?: {
        originalToolName?: string;
    };
    handles?: {
        interpolationSources?: Types.IPointsManager<Types.Point3>[];
    };
    onInterpolationComplete?: (annotation: ContourSegmentationAnnotation) => unknown;
};
export type ContourSegmentationAnnotation = ContourAnnotation & ContourSegmentationAnnotationData;
