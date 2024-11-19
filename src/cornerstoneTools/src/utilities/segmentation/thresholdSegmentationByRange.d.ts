import type { Types } from '@cornerstonejs/core';
import type { ThresholdInformation } from './utilities';
declare function thresholdSegmentationByRange(segmentationVolume: Types.IImageVolume, segmentationIndex: number, thresholdVolumeInformation: ThresholdInformation[], overlapType: number): Types.IImageVolume;
export default thresholdSegmentationByRange;
