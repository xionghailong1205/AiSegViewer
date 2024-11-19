import { getEnabledElementByViewportId } from '@cornerstonejs/core';
import Representations from '../../../enums/SegmentationRepresentations';
import { handleContourSegmentation } from './contourHandler/handleContourSegmentation';
import { getSegmentation } from '../../../stateManagement/segmentation/getSegmentation';
import { canComputeRequestedRepresentation } from '../../../stateManagement/segmentation/polySeg/canComputeRequestedRepresentation';
import { computeAndAddContourRepresentation } from '../../../stateManagement/segmentation/polySeg/Contour/computeAndAddContourRepresentation';
import removeContourFromElement from './removeContourFromElement';
let polySegConversionInProgress = false;
const processedViewportSegmentations = new Map();
function removeRepresentation(viewportId, segmentationId, renderImmediate = false) {
    const enabledElement = getEnabledElementByViewportId(viewportId);
    if (!enabledElement) {
        return;
    }
    const { viewport } = enabledElement;
    if (!renderImmediate) {
        return;
    }
    removeContourFromElement(viewportId, segmentationId);
    viewport.render();
}
async function render(viewport, contourRepresentation) {
    const { segmentationId } = contourRepresentation;
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        return;
    }
    let contourData = segmentation.representationData[Representations.Contour];
    if (!contourData &&
        canComputeRequestedRepresentation(segmentationId, Representations.Contour) &&
        !polySegConversionInProgress) {
        polySegConversionInProgress = true;
        contourData = await computeAndAddContourRepresentation(segmentationId, {
            viewport,
        });
        polySegConversionInProgress = false;
    }
    if (!contourData) {
        return;
    }
    if (!contourData.geometryIds?.length) {
        return;
    }
    handleContourSegmentation(viewport, contourData.geometryIds, contourData.annotationUIDsMap, contourRepresentation);
}
export default {
    render,
    removeRepresentation,
};
