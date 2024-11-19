import { SegmentationRepresentations } from '../../../enums';
import { getSegmentation } from '../getSegmentation';
import { validate as validateLabelmap } from '../../../tools/displayTools/Labelmap/validateLabelmap';
const conversionPaths = new Map([
    [
        SegmentationRepresentations.Labelmap,
        new Set([
            SegmentationRepresentations.Surface,
            SegmentationRepresentations.Contour,
        ]),
    ],
    [
        SegmentationRepresentations.Contour,
        new Set([
            SegmentationRepresentations.Labelmap,
            SegmentationRepresentations.Surface,
        ]),
    ],
    [
        SegmentationRepresentations.Surface,
        new Set([SegmentationRepresentations.Labelmap]),
    ],
]);
function canComputeRequestedRepresentation(segmentationId, type) {
    const { representationData } = getSegmentation(segmentationId);
    const existingRepresentationTypes = getExistingRepresentationTypes(representationData);
    return existingRepresentationTypes.some((existingRepresentationType) => canConvertFromTo(existingRepresentationType, type));
}
function getExistingRepresentationTypes(representationData) {
    const supportedTypes = [];
    Object.keys(representationData).forEach((representationType) => {
        const representationTypeData = representationData[representationType];
        let validateFn;
        switch (representationType) {
            case SegmentationRepresentations.Labelmap:
                validateFn = validateLabelmap;
                break;
        }
        if (validateFn) {
            try {
                validateFn(representationTypeData);
                supportedTypes.push(representationType);
            }
            catch (error) {
                console.warn(`Validation failed for labelmap of type ${representationType}`);
            }
        }
        else {
            supportedTypes.push(representationType);
        }
    });
    return supportedTypes;
}
async function canConvertFromTo(fromRepresentationType, toRepresentationType) {
    return (conversionPaths.get(fromRepresentationType)?.has(toRepresentationType) ||
        false);
}
export { canComputeRequestedRepresentation };
