import type { PolySegConversionOptions } from '../../../../types';
import type { SurfaceClipResult } from '../../helpers/clipAndCacheSurfacesForViewport';
export type RawContourData = Map<number, SurfaceClipResult[]>;
export declare function computeContourData(segmentationId: string, options?: PolySegConversionOptions): Promise<{
    annotationUIDsMap: Map<number, Set<string>>;
}>;
declare function computeContourFromLabelmapSegmentation(segmentationId: any, options?: PolySegConversionOptions): Promise<RawContourData>;
export { computeContourFromLabelmapSegmentation };
