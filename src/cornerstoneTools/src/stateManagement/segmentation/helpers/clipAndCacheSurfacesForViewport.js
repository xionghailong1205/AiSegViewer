import { Enums, getWebWorkerManager, eventTarget, triggerEvent, } from '@cornerstonejs/core';
import { WorkerTypes } from '../../../enums';
import { pointToString } from '../../../utilities/pointToString';
import { registerPolySegWorker } from '../polySeg/registerPolySegWorker';
import { getSurfaceActorEntry } from './getSegmentationActor';
const workerManager = getWebWorkerManager();
const polyDataCache = new Map();
const surfacesAABBCache = new Map();
const triggerWorkerProgress = (eventTarget, progress) => {
    triggerEvent(eventTarget, Enums.Events.WEB_WORKER_PROGRESS, {
        progress,
        type: WorkerTypes.SURFACE_CLIPPING,
    });
};
export async function clipAndCacheSurfacesForViewport(surfacesInfo, viewport) {
    registerPolySegWorker();
    const planesInfo = viewport.getSlicesClippingPlanes?.();
    if (!planesInfo) {
        return;
    }
    const currentSliceIndex = viewport.getSliceIndex();
    planesInfo.sort((a, b) => {
        const diffA = Math.abs(a.sliceIndex - currentSliceIndex);
        const diffB = Math.abs(b.sliceIndex - currentSliceIndex);
        return diffA - diffB;
    });
    triggerWorkerProgress(eventTarget, 0);
    await updateSurfacesAABBCache(surfacesInfo);
    const surfacesAABB = new Map();
    surfacesInfo.forEach((surface) => {
        surfacesAABB.set(surface.id, surfacesAABBCache.get(surface.id));
    });
    const camera = viewport.getCamera();
    await workerManager
        .executeTask('polySeg', 'cutSurfacesIntoPlanes', {
        surfacesInfo,
        planesInfo,
        surfacesAABB,
    }, {
        callbacks: [
            ({ progress }) => {
                triggerWorkerProgress(eventTarget, progress);
            },
            ({ sliceIndex, polyDataResults }) => {
                polyDataResults.forEach((polyDataResult, segmentIndex) => {
                    const segmentIndexNumber = Number(segmentIndex);
                    const cacheId = generateCacheId(viewport, camera.viewPlaneNormal, sliceIndex);
                    updatePolyDataCache(segmentIndexNumber, cacheId, polyDataResult);
                });
            },
        ],
    })
        .catch((error) => {
        console.error(error);
    });
    triggerWorkerProgress(eventTarget, 100);
    return polyDataCache;
}
async function updateSurfacesAABBCache(surfacesInfo) {
    const surfacesWithoutAABB = surfacesInfo.filter((surface) => !surfacesAABBCache.has(surface.id));
    if (!surfacesWithoutAABB.length) {
        return;
    }
    const surfacesAABB = await workerManager.executeTask('polySeg', 'getSurfacesAABBs', {
        surfacesInfo: surfacesWithoutAABB,
    }, {
        callbacks: [
            ({ progress }) => {
                triggerWorkerProgress(eventTarget, progress);
            },
        ],
    });
    surfacesAABB.forEach((aabb, id) => {
        surfacesAABBCache.set(id, aabb);
    });
}
export function generateCacheId(viewport, viewPlaneNormal, sliceIndex) {
    return `${viewport.id}-${pointToString(viewPlaneNormal)}-${sliceIndex}`;
}
export function updatePolyDataCache(segmentIndex, cacheId, polyDataResult) {
    const { points, lines, numberOfCells } = polyDataResult;
    let segmentCache = polyDataCache.get(segmentIndex);
    if (!segmentCache) {
        segmentCache = new Map();
        polyDataCache.set(segmentIndex, segmentCache);
    }
    segmentCache.set(cacheId, { points, lines, numberOfCells });
}
