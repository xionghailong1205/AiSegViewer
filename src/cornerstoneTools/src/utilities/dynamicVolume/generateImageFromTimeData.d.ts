import type { Types } from '@cornerstonejs/core';
import { Enums } from '@cornerstonejs/core';
declare function generateImageFromTimeData(dynamicVolume: Types.IDynamicImageVolume, operation: Enums.GenerateImageType, options: {
    frameNumbers?: number[];
}): Float32Array;
declare function updateVolumeFromTimeData(dynamicVolume: Types.IDynamicImageVolume, operation: Enums.GenerateImageType, options: {
    frameNumbers?: number[];
    targetVolume: Types.IImageVolume;
}): void;
export { generateImageFromTimeData, updateVolumeFromTimeData };
