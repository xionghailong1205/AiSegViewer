import type { Types } from '@cornerstonejs/core';
import type { ContourSegmentationData } from '../../../../types';
export declare function convertContourToSurface(contourRepresentationData: ContourSegmentationData, segmentIndex: number): Promise<Types.SurfaceData>;
