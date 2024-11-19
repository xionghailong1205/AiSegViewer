import type { Types } from '@cornerstonejs/core';
import type { SurfaceSegmentationData } from '../../../../types/SurfaceTypes';
export declare function convertSurfaceToVolumeLabelmap(surfaceRepresentationData: SurfaceSegmentationData, segmentationVolume: Types.IImageVolume): Promise<{
    volumeId: string;
}>;
export declare function convertSurfaceToStackLabelmap(): Promise<void>;
