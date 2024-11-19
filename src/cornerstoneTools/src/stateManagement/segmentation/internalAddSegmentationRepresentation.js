import CORNERSTONE_COLOR_LUT from '../../constants/COLOR_LUT';
import { triggerAnnotationRenderForViewportIds } from '../../utilities/triggerAnnotationRenderForViewportIds';
import { SegmentationRepresentations } from '../../enums';
import { triggerSegmentationModified } from './triggerSegmentationEvents';
import { addColorLUT } from './addColorLUT';
import { getNextColorLUTIndex } from './getNextColorLUTIndex';
import { defaultSegmentationStateManager } from './SegmentationStateManager';
import { getColorLUT } from './getColorLUT';
function internalAddSegmentationRepresentation(viewportId, representationInput) {
    const { segmentationId, config } = representationInput;
    const renderingConfig = {
        colorLUTIndex: getColorLUTIndex(config),
    };
    defaultSegmentationStateManager.addSegmentationRepresentation(viewportId, segmentationId, representationInput.type, renderingConfig);
    if (representationInput.type === SegmentationRepresentations.Contour) {
        triggerAnnotationRenderForViewportIds([viewportId]);
    }
    triggerSegmentationModified(segmentationId);
}
function getColorLUTIndex(config) {
    const { colorLUTOrIndex } = config || {};
    const isIndexProvided = typeof colorLUTOrIndex === 'number';
    const selectedColorLUT = isIndexProvided
        ? getColorLUT(colorLUTOrIndex)
        : CORNERSTONE_COLOR_LUT;
    const colorLUTIndex = isIndexProvided
        ? colorLUTOrIndex
        : getNextColorLUTIndex();
    if (!isIndexProvided) {
        addColorLUT(selectedColorLUT, colorLUTIndex);
    }
    return colorLUTIndex;
}
export { internalAddSegmentationRepresentation };
