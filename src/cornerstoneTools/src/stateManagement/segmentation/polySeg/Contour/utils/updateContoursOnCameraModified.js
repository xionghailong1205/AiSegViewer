import { utilities, Enums } from '@cornerstonejs/core';
import { extractContourData } from './extractContourData';
import { clipAndCacheSurfacesForViewport } from '../../../helpers/clipAndCacheSurfacesForViewport';
import { createAndAddContourSegmentationsFromClippedSurfaces } from './createAndAddContourSegmentationsFromClippedSurfaces';
const currentViewportNormal = new Map();
export function updateContoursOnCameraModified(surfacesInfo, viewport, segmentationRepresentationUID) {
    async function cameraModifiedCallback(evt) {
        const { camera } = evt.detail;
        const { viewPlaneNormal } = camera;
        const surface1 = surfacesInfo[0];
        const currentNormal = currentViewportNormal.get(surface1.id);
        if (utilities.isEqual(viewPlaneNormal, currentNormal)) {
            return;
        }
        currentViewportNormal.set(surface1.id, viewPlaneNormal);
        const polyDataCache = await clipAndCacheSurfacesForViewport(surfacesInfo, viewport);
        const results = extractContourData(polyDataCache);
        createAndAddContourSegmentationsFromClippedSurfaces(results, viewport, segmentationRepresentationUID);
        viewport.render();
    }
    const camera = viewport.getCamera();
    currentViewportNormal.set(surfacesInfo[0].id, camera.viewPlaneNormal);
    viewport.element.removeEventListener(Enums.Events.CAMERA_MODIFIED, cameraModifiedCallback);
    viewport.element.addEventListener(Enums.Events.CAMERA_MODIFIED);
}
