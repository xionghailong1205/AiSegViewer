import type { Types } from '@cornerstonejs/core';
import type { PolySegConversionOptions } from '../../../../types';
export type RawSurfacesData = {
    segmentIndex: number;
    data: Types.SurfaceData;
}[];
export declare function computeSurfaceData(segmentationId: string, options?: PolySegConversionOptions): Promise<{
    geometryIds: Map<number, string>;
}>;
declare function computeSurfaceFromLabelmapSegmentation(segmentationId: any, options?: PolySegConversionOptions): Promise<RawSurfacesData>;
declare function computeSurfaceFromContourSegmentation(segmentationId: string, options?: PolySegConversionOptions): Promise<RawSurfacesData>;
export { computeSurfaceFromContourSegmentation, computeSurfaceFromLabelmapSegmentation, };
