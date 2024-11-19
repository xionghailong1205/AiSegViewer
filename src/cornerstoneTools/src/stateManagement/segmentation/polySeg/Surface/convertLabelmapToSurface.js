import { cache, eventTarget, getWebWorkerManager, triggerEvent, Enums, } from '@cornerstonejs/core';
import { computeVolumeLabelmapFromStack } from '../../helpers/computeVolumeLabelmapFromStack';
import { WorkerTypes } from '../../../../enums';
const workerManager = getWebWorkerManager();
const triggerWorkerProgress = (eventTarget, progress, id) => {
    triggerEvent(eventTarget, Enums.Events.WEB_WORKER_PROGRESS, {
        progress,
        type: WorkerTypes.POLYSEG_LABELMAP_TO_SURFACE,
        id,
    });
};
export async function convertLabelmapToSurface(labelmapRepresentationData, segmentIndex) {
    console.log("代码执行");
    let volumeId;
    if (labelmapRepresentationData.volumeId) {
        volumeId = labelmapRepresentationData
            .volumeId;
    }
    else {
        const { imageIds } = labelmapRepresentationData;
        ({ volumeId } = await computeVolumeLabelmapFromStack({
            imageIds,
        }));
    }
    const volume = cache.getVolume(volumeId);
    const scalarData = volume.voxelManager.getCompleteScalarDataArray();
    const { dimensions, spacing, origin, direction } = volume;
    triggerWorkerProgress(eventTarget, 0, segmentIndex);
    const results = await workerManager.executeTask('polySeg', 'convertLabelmapToSurface', {
        scalarData,
        dimensions,
        spacing,
        origin,
        direction,
        segmentIndex,
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
