import type { PolySegConversionOptions } from '../../../../types';
export declare function computeAndAddContourRepresentation(segmentationId: string, options?: PolySegConversionOptions): Promise<{
    annotationUIDsMap: Map<number, Set<string>>;
}>;
