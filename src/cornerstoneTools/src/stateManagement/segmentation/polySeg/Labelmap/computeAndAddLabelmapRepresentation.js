import { SegmentationRepresentations } from '../../../../enums';
import { computeAndAddRepresentation } from '../computeAndAddRepresentation';
import { computeLabelmapData } from './labelmapComputationStrategies';
import { defaultSegmentationStateManager } from '../../SegmentationStateManager';
import { triggerSegmentationDataModified } from '../../triggerSegmentationEvents';
export async function computeAndAddLabelmapRepresentation(segmentationId, options = {}) {
    return computeAndAddRepresentation(segmentationId, SegmentationRepresentations.Labelmap, () => computeLabelmapData(segmentationId, options), () => null, () => {
        defaultSegmentationStateManager.processLabelmapRepresentationAddition(options.viewport.id, segmentationId);
        setTimeout(() => {
            triggerSegmentationDataModified(segmentationId);
        }, 0);
    });
}
