import type { Types } from '@cornerstonejs/core';
import type { LabelmapSegmentationData } from '../../../../types/LabelmapTypes';
export declare function convertLabelmapToSurface(labelmapRepresentationData: LabelmapSegmentationData, segmentIndex: number): Promise<Types.SurfaceData>;
