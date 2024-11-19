import type { Types } from '@cornerstonejs/core';
declare function isWithinThreshold(index: number, imageScalarData: Types.PixelDataTypedArray, strategySpecificConfiguration: {
    THRESHOLD?: {
        threshold: number[];
    };
    THRESHOLD_INSIDE_CIRCLE?: {
        threshold: number[];
    };
}): boolean;
export default isWithinThreshold;
