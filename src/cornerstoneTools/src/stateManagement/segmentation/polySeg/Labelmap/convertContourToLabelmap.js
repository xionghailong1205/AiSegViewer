import { vec3 } from 'gl-matrix';
import { cache, utilities, getWebWorkerManager, volumeLoader, imageLoader, metaData, Enums, triggerEvent, eventTarget, } from '@cornerstonejs/core';
import { getAnnotation } from '../../../annotation/annotationState';
import { WorkerTypes } from '../../../../enums';
const workerManager = getWebWorkerManager();
const triggerWorkerProgress = (eventTarget, progress) => {
    triggerEvent(eventTarget, Enums.Events.WEB_WORKER_PROGRESS, {
        progress,
        type: WorkerTypes.POLYSEG_CONTOUR_TO_LABELMAP,
    });
};
export async function convertContourToVolumeLabelmap(contourRepresentationData, options = {}) {
    const viewport = options.viewport;
    const volumeId = viewport.getVolumeId();
    const imageIds = utilities.getViewportImageIds(viewport);
    if (!imageIds) {
        throw new Error('No imageIds found, labelmap computation from contour requires viewports with imageIds');
    }
    const segmentationVolumeId = utilities.uuidv4();
    const segmentationVolume = volumeLoader.createAndCacheDerivedLabelmapVolume(volumeId, {
        volumeId: segmentationVolumeId,
    });
    const { dimensions, origin, direction, spacing, voxelManager } = segmentationVolume;
    const { segmentIndices, annotationUIDsInSegmentMap } = _getAnnotationMapFromSegmentation(contourRepresentationData, options);
    triggerWorkerProgress(eventTarget, 0);
    const newScalarData = await workerManager.executeTask('polySeg', 'convertContourToVolumeLabelmap', {
        segmentIndices,
        dimensions,
        scalarData: voxelManager.getCompleteScalarDataArray?.(),
        origin,
        direction,
        spacing,
        annotationUIDsInSegmentMap,
    }, {
        callbacks: [
            (progress) => {
                triggerWorkerProgress(eventTarget, progress);
            },
        ],
    });
    triggerWorkerProgress(eventTarget, 100);
    voxelManager.setCompleteScalarDataArray(newScalarData);
    segmentationVolume.modified();
    return {
        volumeId: segmentationVolume.volumeId,
    };
}
export async function convertContourToStackLabelmap(contourRepresentationData, options = {}) {
    if (!options.viewport) {
        throw new Error('No viewport provided, labelmap computation from contour requires viewports');
    }
    const viewport = options.viewport;
    const imageIds = viewport.getImageIds();
    if (!imageIds) {
        throw new Error('No imageIds found, labelmap computation from contour requires viewports with imageIds');
    }
    imageIds.forEach((imageId) => {
        if (!cache.getImageLoadObject(imageId)) {
            throw new Error('ImageIds must be cached before converting contour to labelmap');
        }
    });
    const segImages = await imageLoader.createAndCacheDerivedLabelmapImages(imageIds);
    const segmentationImageIds = segImages.map((it) => it.imageId);
    const { segmentIndices, annotationUIDsInSegmentMap } = _getAnnotationMapFromSegmentation(contourRepresentationData, options);
    const segmentationsInfo = new Map();
    segmentationImageIds.forEach((segImageId, index) => {
        const segImage = cache.getImage(segImageId);
        const imagePlaneModule = metaData.get(Enums.MetadataModules.IMAGE_PLANE, segImageId);
        let { columnCosines, rowCosines, rowPixelSpacing, columnPixelSpacing, imagePositionPatient, } = imagePlaneModule;
        columnCosines = columnCosines ?? [0, 1, 0];
        rowCosines = rowCosines ?? [1, 0, 0];
        rowPixelSpacing = rowPixelSpacing ?? 1;
        columnPixelSpacing = columnPixelSpacing ?? 1;
        imagePositionPatient = imagePositionPatient ?? [0, 0, 0];
        const rowCosineVec = vec3.fromValues(rowCosines[0], rowCosines[1], rowCosines[2]);
        const colCosineVec = vec3.fromValues(columnCosines[0], columnCosines[1], columnCosines[2]);
        const scanAxisNormal = vec3.create();
        vec3.cross(scanAxisNormal, rowCosineVec, colCosineVec);
        const direction = [...rowCosineVec, ...colCosineVec, ...scanAxisNormal];
        const spacing = [rowPixelSpacing, columnPixelSpacing, 1];
        const origin = imagePositionPatient;
        segmentationsInfo.set(imageIds[index], {
            direction,
            spacing,
            origin,
            scalarData: segImage.voxelManager.getScalarData(),
            imageId: segImageId,
            dimensions: [segImage.width, segImage.height, 1],
        });
    });
    triggerWorkerProgress(eventTarget, 0);
    const newSegmentationsScalarData = await workerManager.executeTask('polySeg', 'convertContourToStackLabelmap', {
        segmentationsInfo,
        annotationUIDsInSegmentMap,
        segmentIndices,
    }, {
        callbacks: [
            (progress) => {
                triggerWorkerProgress(eventTarget, progress);
            },
        ],
    });
    triggerWorkerProgress(eventTarget, 100);
    const segImageIds = [];
    newSegmentationsScalarData.forEach(({ scalarData }, referencedImageId) => {
        const segmentationInfo = segmentationsInfo.get(referencedImageId);
        const { imageId: segImageId } = segmentationInfo;
        const segImage = cache.getImage(segImageId);
        segImage.voxelManager.getScalarData().set(scalarData);
        segImage.imageFrame?.pixelData?.set(scalarData);
        segImageIds.push(segImageId);
    });
    return {
        imageIds: segImageIds,
    };
}
function _getAnnotationMapFromSegmentation(contourRepresentationData, options = {}) {
    const annotationMap = contourRepresentationData.annotationUIDsMap;
    const segmentIndices = options.segmentIndices?.length
        ? options.segmentIndices
        : Array.from(annotationMap.keys());
    const annotationUIDsInSegmentMap = new Map();
    segmentIndices.forEach((index) => {
        const annotationUIDsInSegment = annotationMap.get(index);
        let uids = Array.from(annotationUIDsInSegment);
        uids = uids.filter((uid) => !getAnnotation(uid).parentAnnotationUID);
        const annotations = uids.map((uid) => {
            const annotation = getAnnotation(uid);
            const hasChildAnnotations = annotation.childAnnotationUIDs?.length;
            return {
                polyline: annotation.data.contour.polyline,
                referencedImageId: annotation.metadata.referencedImageId,
                holesPolyline: hasChildAnnotations &&
                    annotation.childAnnotationUIDs.map((childUID) => {
                        const childAnnotation = getAnnotation(childUID);
                        return childAnnotation.data.contour.polyline;
                    }),
            };
        });
        annotationUIDsInSegmentMap.set(index, annotations);
    });
    return { segmentIndices, annotationUIDsInSegmentMap };
}
