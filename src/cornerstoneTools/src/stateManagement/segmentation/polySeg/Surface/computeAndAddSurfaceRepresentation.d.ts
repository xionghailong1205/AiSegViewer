import type { PolySegConversionOptions } from '../../../../types';
export declare function computeAndAddSurfaceRepresentation(segmentationId: string, options?: PolySegConversionOptions): Promise<{
    geometryIds: Map<number, string>;
}>;
