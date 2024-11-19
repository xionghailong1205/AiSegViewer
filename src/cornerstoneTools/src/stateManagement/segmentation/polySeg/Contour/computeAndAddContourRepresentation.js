import { SegmentationRepresentations } from '../../../../enums';
import { computeAndAddRepresentation } from '../computeAndAddRepresentation';
import { computeContourData } from './contourComputationStrategies';
export function computeAndAddContourRepresentation(segmentationId, options = {}) {
    return computeAndAddRepresentation(segmentationId, SegmentationRepresentations.Contour, () => computeContourData(segmentationId, options), () => undefined);
}
