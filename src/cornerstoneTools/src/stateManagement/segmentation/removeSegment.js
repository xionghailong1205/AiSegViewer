import { getActiveSegmentIndex } from './getActiveSegmentIndex';
import { getSegmentation } from './getSegmentation';
import { getSegmentationRepresentations } from './getSegmentationRepresentation';
import { getViewportIdsWithSegmentation } from './getViewportIdsWithSegmentation';
import { clearSegmentValue } from './helpers/clearSegmentValue';
import { setActiveSegmentIndex } from './segmentIndex';
import { updateSegmentations } from './updateSegmentations';
export function removeSegment(segmentationId, segmentIndex, options = {
    setNextSegmentAsActive: true,
}) {
    clearSegmentValue(segmentationId, segmentIndex);
    const isThisSegmentActive = getActiveSegmentIndex(segmentationId) === segmentIndex;
    const segmentation = getSegmentation(segmentationId);
    const { segments } = segmentation;
    delete segments[segmentIndex];
    const updatedSegments = {
        ...segments,
    };
    updateSegmentations([
        {
            segmentationId,
            payload: {
                segments: updatedSegments,
            },
        },
    ]);
    if (isThisSegmentActive && options.setNextSegmentAsActive) {
        const segmentIndices = Object.keys(segments)
            .map(Number)
            .sort((a, b) => a - b);
        const currentIndex = segmentIndices.indexOf(segmentIndex);
        const nextSegmentIndex = segmentIndices[currentIndex + 1];
        const previousSegmentIndex = segmentIndices[currentIndex - 1];
        if (nextSegmentIndex !== undefined) {
            setActiveSegmentIndex(segmentationId, nextSegmentIndex);
        }
        else if (previousSegmentIndex !== undefined) {
            setActiveSegmentIndex(segmentationId, previousSegmentIndex);
        }
    }
    const viewportIds = getViewportIdsWithSegmentation(segmentationId);
    viewportIds.forEach((viewportId) => {
        const representations = getSegmentationRepresentations(viewportId, {
            segmentationId,
        });
        representations.forEach((representation) => {
            delete representation.segments[segmentIndex];
        });
    });
}
