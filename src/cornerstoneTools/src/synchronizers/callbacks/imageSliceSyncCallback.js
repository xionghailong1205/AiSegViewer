import { vec3, mat4 } from 'gl-matrix';
import { getRenderingEngine, metaData, utilities, VolumeViewport, } from '@cornerstonejs/core';
import areViewportsCoplanar from './areViewportsCoplanar';
const getSpatialRegistration = (targetId, sourceId) => utilities.spatialRegistrationMetadataProvider.get('spatialRegistrationModule', targetId, sourceId);
export default async function imageSliceSyncCallback(synchronizerInstance, sourceViewport, targetViewport) {
    const renderingEngine = getRenderingEngine(targetViewport.renderingEngineId);
    if (!renderingEngine) {
        throw new Error(`No RenderingEngine for Id: ${targetViewport.renderingEngineId}`);
    }
    const sViewport = renderingEngine.getViewport(sourceViewport.viewportId);
    const options = synchronizerInstance.getOptions(targetViewport.viewportId);
    if (options?.disabled) {
        return;
    }
    const tViewport = renderingEngine.getViewport(targetViewport.viewportId);
    const imageId1 = sViewport.getCurrentImageId();
    const imagePlaneModule1 = metaData.get('imagePlaneModule', imageId1);
    const sourceImagePositionPatient = imagePlaneModule1.imagePositionPatient;
    const targetImageIds = tViewport.getImageIds();
    if (!areViewportsCoplanar(sViewport, tViewport)) {
        return;
    }
    let registrationMatrixMat4 = getSpatialRegistration(targetViewport.viewportId, sourceViewport.viewportId);
    if (!registrationMatrixMat4) {
        const frameOfReferenceUID1 = sViewport.getFrameOfReferenceUID();
        const frameOfReferenceUID2 = tViewport.getFrameOfReferenceUID();
        if (frameOfReferenceUID1 === frameOfReferenceUID2 &&
            options?.useInitialPosition !== false) {
            registrationMatrixMat4 = mat4.identity(mat4.create());
        }
        else {
            utilities.calculateViewportsSpatialRegistration(sViewport, tViewport);
            registrationMatrixMat4 = getSpatialRegistration(targetViewport.viewportId, sourceViewport.viewportId);
        }
        if (!registrationMatrixMat4) {
            return;
        }
    }
    const targetImagePositionPatientWithRegistrationMatrix = vec3.transformMat4(vec3.create(), sourceImagePositionPatient, registrationMatrixMat4);
    const closestImageIdIndex2 = _getClosestImageIdIndex(targetImagePositionPatientWithRegistrationMatrix, targetImageIds);
    let imageIndexToSet = closestImageIdIndex2.index;
    if (tViewport instanceof VolumeViewport) {
        imageIndexToSet = targetImageIds.length - closestImageIdIndex2.index - 1;
    }
    if (closestImageIdIndex2.index !== -1 &&
        tViewport.getCurrentImageIdIndex() !== closestImageIdIndex2.index) {
        await utilities.jumpToSlice(tViewport.element, {
            imageIndex: imageIndexToSet,
        });
    }
}
function _getClosestImageIdIndex(targetPoint, imageIds) {
    return imageIds.reduce((closestImageIdIndex, imageId, index) => {
        const { imagePositionPatient } = metaData.get('imagePlaneModule', imageId);
        const distance = vec3.distance(imagePositionPatient, targetPoint);
        if (distance < closestImageIdIndex.distance) {
            return {
                distance,
                index,
            };
        }
        return closestImageIdIndex;
    }, {
        distance: Infinity,
        index: -1,
    });
}
