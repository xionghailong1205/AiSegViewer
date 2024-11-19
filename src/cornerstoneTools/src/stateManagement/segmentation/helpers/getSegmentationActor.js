import { getEnabledElementByViewportId } from '@cornerstonejs/core';
import { SegmentationRepresentations } from '../../../enums';
function getActorEntry(viewportId, segmentationId, filterFn) {
    const enabledElement = getEnabledElementByViewportId(viewportId);
    if (!enabledElement) {
        return;
    }
    const { renderingEngine, viewport } = enabledElement;
    if (!renderingEngine || !viewport) {
        return;
    }
    const actors = viewport.getActors();
    const filteredActors = actors.filter(filterFn);
    return filteredActors.length > 0 ? filteredActors[0] : undefined;
}
export function getLabelmapActorUID(viewportId, segmentationId) {
    const actorEntry = getLabelmapActorEntry(viewportId, segmentationId);
    return actorEntry?.uid;
}
export function getLabelmapActorEntry(viewportId, segmentationId) {
    return getActorEntry(viewportId, segmentationId, (actor) => actor.representationUID?.startsWith(`${segmentationId}-${SegmentationRepresentations.Labelmap}`));
}
export function getSurfaceActorEntry(viewportId, segmentationId, segmentIndex) {
    return getActorEntry(viewportId, segmentationId, (actor) => actor.representationUID?.startsWith(`${segmentationId}-${SegmentationRepresentations.Surface}-${segmentIndex}`));
}
export function getSurfaceActorUID(viewportId, segmentationId, segmentIndex) {
    const segIndex = segmentIndex ? segmentIndex.toString() : '';
    const actorEntry = getSurfaceActorEntry(viewportId, segmentationId, segIndex);
    return actorEntry?.uid;
}
