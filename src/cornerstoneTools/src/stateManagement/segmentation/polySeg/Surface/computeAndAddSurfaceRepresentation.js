import { SegmentationRepresentations } from '../../../../enums';
import { computeAndAddRepresentation } from '../computeAndAddRepresentation';
import { computeSurfaceData } from './surfaceComputationStrategies';
import { updateSurfaceData } from './updateSurfaceData';
export function computeAndAddSurfaceRepresentation(segmentationId, options = {}) {
    return computeAndAddRepresentation(segmentationId, SegmentationRepresentations.Surface, () => computeSurfaceData(segmentationId, options), () => updateSurfaceData(segmentationId));
}
