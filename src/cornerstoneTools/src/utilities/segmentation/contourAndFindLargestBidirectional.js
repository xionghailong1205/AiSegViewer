import { generateContourSetsFromLabelmap } from '../contours';
import SegmentationRepresentations from '../../enums/SegmentationRepresentations';
import findLargestBidirectional from './findLargestBidirectional';
const { Labelmap } = SegmentationRepresentations;
export default function contourAndFindLargestBidirectional(segmentation) {
    const contours = generateContourSetsFromLabelmap({
        segmentations: segmentation,
    });
    if (!contours?.length || !contours[0].sliceContours.length) {
        return;
    }
    const { representationData, segments = [
        null,
        { label: 'Unspecified', color: null, containedSegmentIndices: null },
    ], } = segmentation;
    const { volumeId: segVolumeId } = representationData[Labelmap];
    const segmentIndex = segments.findIndex((it) => !!it);
    if (segmentIndex === -1) {
        return;
    }
    segments[segmentIndex].segmentIndex = segmentIndex;
    return findLargestBidirectional(contours[0], segVolumeId, segments[segmentIndex]);
}
