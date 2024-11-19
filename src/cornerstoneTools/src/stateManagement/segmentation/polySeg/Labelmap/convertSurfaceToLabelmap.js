import { Enums, cache, eventTarget, getWebWorkerManager, triggerEvent, } from '@cornerstonejs/core';
import { WorkerTypes } from '../../../../enums';
const workerManager = getWebWorkerManager();
const triggerWorkerProgress = (eventTarget, progress) => {
    triggerEvent(eventTarget, Enums.Events.WEB_WORKER_PROGRESS, {
        progress,
        type: WorkerTypes.POLYSEG_SURFACE_TO_LABELMAP,
    });
};
export async function convertSurfaceToVolumeLabelmap(surfaceRepresentationData, segmentationVolume) {
    const { geometryIds } = surfaceRepresentationData;
    if (!geometryIds?.size) {
        throw new Error('No geometry IDs found for surface representation');
    }
    const segmentsInfo = new Map();
    geometryIds.forEach((geometryId, segmentIndex) => {
        const geometry = cache.getGeometry(geometryId);
        const geometryData = geometry.data;
        const points = geometryData.points;
        const polys = geometryData.polys;
        segmentsInfo.set(segmentIndex, {
            points,
            polys,
        });
    });
    const { dimensions, direction, origin, spacing, voxelManager } = segmentationVolume;
    triggerWorkerProgress(eventTarget, 0);
    const newScalarData = await workerManager.executeTask('polySeg', 'convertSurfacesToVolumeLabelmap', {
        segmentsInfo,
        dimensions,
        spacing,
        direction,
        origin,
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
export async function convertSurfaceToStackLabelmap() {
}
