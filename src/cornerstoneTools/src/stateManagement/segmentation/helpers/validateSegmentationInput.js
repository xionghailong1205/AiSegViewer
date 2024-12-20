import * as Enums from '../../../enums';
import { validatePublic as validatePublicLabelmap } from '../../../tools/displayTools/Labelmap/validateLabelmap';
function validateSegmentationInput(segmentationInputArray) {
    if (!segmentationInputArray || segmentationInputArray.length === 0) {
        throw new Error('The segmentationInputArray is undefined or an empty array');
    }
    segmentationInputArray.forEach((segmentationInput) => {
        if (segmentationInput.segmentationId === undefined) {
            throw new Error('Undefined segmentationInput.segmentationId. Please provide a valid segmentationId');
        }
        if (segmentationInput.representation === undefined) {
            throw new Error('Undefined segmentationInput.representation. Please provide a valid representation');
        }
        if (segmentationInput.representation.type ===
            Enums.SegmentationRepresentations.Labelmap) {
            validatePublicLabelmap(segmentationInput);
        }
    });
}
export default validateSegmentationInput;
