import { getSegmentation } from '../../stateManagement/segmentation/getSegmentation';
import { triggerSegmentationModified } from './triggerSegmentationEvents';
function isSegmentIndexLocked(segmentationId, segmentIndex) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        throw new Error(`No segmentation state found for ${segmentationId}`);
    }
    const { segments } = segmentation;
    return segments[segmentIndex].locked;
}
function setSegmentIndexLocked(segmentationId, segmentIndex, locked = true) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        throw new Error(`No segmentation state found for ${segmentationId}`);
    }
    const { segments } = segmentation;
    segments[segmentIndex].locked = locked;
    triggerSegmentationModified(segmentationId);
}
function getLockedSegmentIndices(segmentationId) {
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        throw new Error(`No segmentation state found for ${segmentationId}`);
    }
    const { segments } = segmentation;
    const lockedSegmentIndices = Object.keys(segments).filter((segmentIndex) => segments[segmentIndex].locked);
    return lockedSegmentIndices.map((segmentIndex) => parseInt(segmentIndex));
}
export { isSegmentIndexLocked, setSegmentIndexLocked, getLockedSegmentIndices };
