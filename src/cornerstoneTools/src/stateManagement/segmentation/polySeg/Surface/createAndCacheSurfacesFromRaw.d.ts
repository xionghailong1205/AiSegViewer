import type { RawSurfacesData } from './surfaceComputationStrategies';
import type { PolySegConversionOptions } from '../../../../types';
export declare function createAndCacheSurfacesFromRaw(segmentationId: string, rawSurfacesData: RawSurfacesData, options?: PolySegConversionOptions): Promise<{
    geometryIds: Map<number, string>;
}>;
