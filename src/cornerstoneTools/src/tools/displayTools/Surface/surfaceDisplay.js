import { cache, getEnabledElementByViewportId, Enums, } from '@cornerstonejs/core';
import Representations from '../../../enums/SegmentationRepresentations';
import removeSurfaceFromElement from './removeSurfaceFromElement';
import addOrUpdateSurfaceToElement from './addOrUpdateSurfaceToElement';
import { getSegmentation } from '../../../stateManagement/segmentation/getSegmentation';
import { getColorLUT } from '../../../stateManagement/segmentation/getColorLUT';
import { canComputeRequestedRepresentation } from '../../../stateManagement/segmentation/polySeg/canComputeRequestedRepresentation';
import { computeAndAddSurfaceRepresentation } from '../../../stateManagement/segmentation/polySeg/Surface/computeAndAddSurfaceRepresentation';
const { ViewportType } = Enums;
function removeRepresentation(viewportId, segmentationId, renderImmediate = false) {
    const enabledElement = getEnabledElementByViewportId(viewportId);
    if (!enabledElement) {
        return;
    }
    const { viewport } = enabledElement;
    removeSurfaceFromElement(viewport.element, segmentationId);
    if (!renderImmediate) {
        return;
    }
    viewport.render();
}
async function render(viewport, representation) {
    const { segmentationId } = representation;
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        return;
    }
    let SurfaceData = segmentation.representationData[Representations.Surface];
    if (!SurfaceData &&
        canComputeRequestedRepresentation(segmentationId, Representations.Surface)) {
        SurfaceData = await computeAndAddSurfaceRepresentation(segmentationId, {
            viewport,
        });
        if (!SurfaceData) {
            throw new Error(`No Surface data found for segmentationId ${segmentationId}.`);
        }
    }
    const { geometryIds } = SurfaceData;
    if (!geometryIds?.size) {
        console.warn(`No Surfaces found for segmentationId ${segmentationId}. Skipping render.`);
    }
    const { colorLUTIndex } = representation;
    const colorLUT = getColorLUT(colorLUTIndex);
    const surfaces = [];
    geometryIds.forEach((geometryId) => {
        const geometry = cache.getGeometry(geometryId);
        if (!geometry?.data) {
            console.warn(`No Surfaces found for geometryId ${geometryId}. Skipping render.`);
            return;
        }
        const segmentIndex = geometry.data.segmentIndex;
        const surface = geometry.data;
        const color = colorLUT[segmentIndex];
        surface.color = color.slice(0, 3);
        surfaces.push(surface);
        addOrUpdateSurfaceToElement(viewport.element, surface, segmentationId);
    });
    viewport.render();
}
export default {
    render,
    removeRepresentation,
};
export { render, removeRepresentation };
