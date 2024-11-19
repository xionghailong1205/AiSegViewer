import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import { BaseVolumeViewport, getEnabledElement, Enums, getEnabledElementByIds, cache, utilities, } from '@cornerstonejs/core';
import { triggerSegmentationRender } from '../../stateManagement/segmentation/SegmentationRenderingEngine';
import { updateLabelmapSegmentationImageReferences } from '../../stateManagement/segmentation/updateLabelmapSegmentationImageReferences';
import { getCurrentLabelmapImageIdForViewport } from '../../stateManagement/segmentation/getCurrentLabelmapImageIdForViewport';
import { SegmentationRepresentations } from '../../enums';
import { getLabelmapActorEntry } from '../../stateManagement/segmentation/helpers/getSegmentationActor';
import { getSegmentationRepresentations } from '../../stateManagement/segmentation/getSegmentationRepresentation';
const enable = function (element) {
    const { viewport } = getEnabledElement(element);
    if (viewport instanceof BaseVolumeViewport) {
        return;
    }
    element.addEventListener(Enums.Events.STACK_NEW_IMAGE, _imageChangeEventListener);
    element.addEventListener(Enums.Events.IMAGE_RENDERED, _imageChangeEventListener);
};
const disable = function (element) {
    element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, _imageChangeEventListener);
    element.removeEventListener(Enums.Events.IMAGE_RENDERED, _imageChangeEventListener);
};
const perViewportManualTriggers = new Map();
function _imageChangeEventListener(evt) {
    const eventData = evt.detail;
    const { viewportId, renderingEngineId } = eventData;
    const { viewport } = getEnabledElementByIds(viewportId, renderingEngineId);
    const representations = getSegmentationRepresentations(viewportId);
    if (!representations?.length) {
        return;
    }
    const labelmapRepresentations = representations.filter((representation) => representation.type === SegmentationRepresentations.Labelmap);
    const actors = viewport.getActors();
    labelmapRepresentations.forEach((representation) => {
        const { segmentationId } = representation;
        updateLabelmapSegmentationImageReferences(viewportId, segmentationId);
    });
    const labelmapActors = labelmapRepresentations
        .map((representation) => {
        return getLabelmapActorEntry(viewportId, representation.segmentationId);
    })
        .filter((actor) => actor !== undefined);
    if (!labelmapActors.length) {
        return;
    }
    labelmapActors.forEach((actor) => {
        const validActor = labelmapRepresentations.find((representation) => {
            const derivedImageId = getCurrentLabelmapImageIdForViewport(viewportId, representation.segmentationId);
            return derivedImageId === actor.referencedId;
        });
        if (!validActor) {
            viewport.removeActors([actor.uid]);
        }
    });
    labelmapRepresentations.forEach((representation) => {
        const { segmentationId } = representation;
        const currentImageId = viewport.getCurrentImageId();
        const derivedImageId = getCurrentLabelmapImageIdForViewport(viewportId, segmentationId);
        if (!derivedImageId) {
            return;
        }
        const derivedImage = cache.getImage(derivedImageId);
        if (!derivedImage) {
            console.warn('No derived image found in the cache for segmentation representation', representation);
            return;
        }
        const segmentationActorInput = actors.find((actor) => actor.referencedId === derivedImageId);
        if (!segmentationActorInput) {
            const { dimensions, spacing, direction } = viewport.getImageDataMetadata(derivedImage);
            const currentImage = cache.getImage(currentImageId) ||
                {
                    imageId: currentImageId,
                };
            const { origin: currentOrigin } = viewport.getImageDataMetadata(currentImage);
            const originToUse = currentOrigin;
            const scalarArray = vtkDataArray.newInstance({
                name: 'Pixels',
                numberOfComponents: 1,
                values: [...derivedImage.voxelManager.getScalarData()],
            });
            const imageData = vtkImageData.newInstance();
            imageData.setDimensions(dimensions[0], dimensions[1], 1);
            imageData.setSpacing(spacing);
            imageData.setDirection(direction);
            imageData.setOrigin(originToUse);
            imageData.getPointData().setScalars(scalarArray);
            imageData.modified();
            viewport.addImages([
                {
                    imageId: derivedImageId,
                    representationUID: `${segmentationId}-${SegmentationRepresentations.Labelmap}`,
                    callback: ({ imageActor }) => {
                        imageActor.getMapper().setInputData(imageData);
                    },
                },
            ]);
            triggerSegmentationRender(viewportId);
            return;
        }
        else {
            const segmentationImageData = segmentationActorInput.actor
                .getMapper()
                .getInputData();
            if (segmentationImageData.setDerivedImage) {
                segmentationImageData.setDerivedImage(derivedImage);
            }
            else {
                utilities.updateVTKImageDataWithCornerstoneImage(segmentationImageData, derivedImage);
            }
        }
        viewport.render();
        if (evt.type === Enums.Events.IMAGE_RENDERED) {
            viewport.element.removeEventListener(Enums.Events.IMAGE_RENDERED, _imageChangeEventListener);
        }
    });
}
export default {
    enable,
    disable,
};
