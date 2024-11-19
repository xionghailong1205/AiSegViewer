import { cache } from '@cornerstonejs/core';
function validateRepresentationData(segmentationRepresentationData) {
    if ('volumeId' in segmentationRepresentationData) {
        segmentationRepresentationData =
            segmentationRepresentationData;
        const cachedVolume = cache.getVolume(segmentationRepresentationData.volumeId);
        if (!cachedVolume) {
            throw new Error(`volumeId of ${segmentationRepresentationData.volumeId} not found in cache, you should load and cache volume before adding segmentation`);
        }
    }
    else if ('imageIds' in segmentationRepresentationData) {
        segmentationRepresentationData =
            segmentationRepresentationData;
        if (!segmentationRepresentationData.imageIds) {
            throw new Error('The segmentationInput.representationData.imageIds is undefined, please provide a valid representationData.imageIds for stack data');
        }
    }
    else {
        throw new Error('The segmentationInput.representationData is undefined, please provide a valid representationData');
    }
}
export function validatePublic(segmentationInput) {
    if (!segmentationInput.representation.data) {
        throw new Error('The segmentationInput.representationData.data is undefined, please provide a valid representationData.data');
    }
    const representationData = segmentationInput.representation
        .data;
    validateRepresentationData(representationData);
}
export function validate(segmentationRepresentationData) {
    validateRepresentationData(segmentationRepresentationData);
}
