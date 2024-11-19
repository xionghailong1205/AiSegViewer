import { eventTarget } from '@cornerstonejs/core';
import { Events } from '../../../enums';
import addRepresentationData from '../internalAddRepresentationData';
import { triggerSegmentationModified } from '../triggerSegmentationEvents';
import debounce from '../../../utilities/debounce';
import { registerPolySegWorker } from './registerPolySegWorker';
const computedRepresentations = new Map();
async function computeAndAddRepresentation(segmentationId, type, computeFunction, updateFunction, onComputationComplete) {
    registerPolySegWorker();
    const data = await computeFunction();
    addRepresentationData({
        segmentationId,
        type,
        data,
    });
    onComputationComplete?.();
    if (!computedRepresentations.has(segmentationId)) {
        computedRepresentations.set(segmentationId, []);
    }
    const representations = computedRepresentations.get(segmentationId);
    if (!representations.includes(type)) {
        representations.push(type);
    }
    subscribeToSegmentationChanges(updateFunction);
    triggerSegmentationModified(segmentationId);
    return data;
}
function subscribeToSegmentationChanges(updateFunction) {
    const debouncedUpdateFunction = (event) => {
        _debouncedSegmentationModified(event, updateFunction);
    };
    updateFunction._debouncedUpdateFunction = debouncedUpdateFunction;
    eventTarget.removeEventListener(Events.SEGMENTATION_DATA_MODIFIED, updateFunction._debouncedUpdateFunction);
    eventTarget.addEventListener(Events.SEGMENTATION_DATA_MODIFIED, updateFunction._debouncedUpdateFunction);
}
const _debouncedSegmentationModified = debounce((event, updateFunction) => {
    const segmentationId = event.detail.segmentationId;
    const representations = computedRepresentations.get(segmentationId);
    if (!representations || !representations.length) {
        return;
    }
    updateFunction(segmentationId);
    if (representations.length) {
        triggerSegmentationModified(segmentationId);
    }
}, 300);
export { computeAndAddRepresentation };
