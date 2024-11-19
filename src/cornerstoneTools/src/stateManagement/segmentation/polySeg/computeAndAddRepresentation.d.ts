import type { SegmentationRepresentations } from '../../../enums';
declare function computeAndAddRepresentation<T>(segmentationId: string, type: SegmentationRepresentations, computeFunction: () => Promise<T>, updateFunction?: () => void, onComputationComplete?: () => void): Promise<T>;
export { computeAndAddRepresentation };
