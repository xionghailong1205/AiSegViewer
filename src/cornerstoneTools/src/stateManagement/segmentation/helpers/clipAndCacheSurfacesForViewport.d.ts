import type { Types } from '@cornerstonejs/core';
export type SurfacesInfo = {
    id: string;
    points: number[];
    polys: number[];
    segmentIndex: number;
};
export type SurfaceClipResult = {
    points: number[];
    lines: number[];
    numberOfCells: number;
};
export type PolyDataClipCacheType = Map<number, Map<string, SurfaceClipResult>>;
export declare function clipAndCacheSurfacesForViewport(surfacesInfo: SurfacesInfo[], viewport: Types.IVolumeViewport): Promise<PolyDataClipCacheType>;
export declare function generateCacheId(viewport: any, viewPlaneNormal: any, sliceIndex: any): string;
export declare function updatePolyDataCache(segmentIndex: number, cacheId: string, polyDataResult: SurfaceClipResult): void;
