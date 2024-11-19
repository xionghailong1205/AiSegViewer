import type { RawContourData } from '../contourComputationStrategies';
import { type Types } from '@cornerstonejs/core';
export declare function createAndAddContourSegmentationsFromClippedSurfaces(rawContourData: RawContourData, viewport: Types.IViewport, segmentationId: string): Map<number, Set<string>>;
