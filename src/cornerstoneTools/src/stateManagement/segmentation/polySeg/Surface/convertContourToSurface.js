import { Enums, eventTarget, triggerEvent, getWebWorkerManager, } from '@cornerstonejs/core';
import { getAnnotation } from '../../../annotation/annotationState';
import { WorkerTypes } from '../../../../enums';
const workerManager = getWebWorkerManager();
const triggerWorkerProgress = (eventTarget, progress, id) => {
    triggerEvent(eventTarget, Enums.Events.WEB_WORKER_PROGRESS, {
        progress,
        type: WorkerTypes.POLYSEG_CONTOUR_TO_SURFACE,
        id,
    });
};
export async function convertContourToSurface(contourRepresentationData, segmentIndex) {
    const { annotationUIDsMap } = contourRepresentationData;
    const polylines = [];
    const numPointsArray = [];
    const annotationUIDs = annotationUIDsMap.get(segmentIndex);
    for (const annotationUID of annotationUIDs) {
        const annotation = getAnnotation(annotationUID);
        const { polyline } = annotation.data
            .contour;
        numPointsArray.push(polyline.length);
        polyline.forEach((polyline) => polylines.push(...polyline));
    }
    triggerWorkerProgress(eventTarget, 0, segmentIndex);
    const results = await workerManager.executeTask('polySeg', 'convertContourToSurface', {
        polylines,
        numPointsArray,
    }, {
        callbacks: [
            (progress) => {
                triggerWorkerProgress(eventTarget, progress, segmentIndex);
            },
        ],
    });
    triggerWorkerProgress(eventTarget, 100, segmentIndex);
    return results;
}
