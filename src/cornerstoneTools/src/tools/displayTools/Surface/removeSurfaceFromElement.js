import { getEnabledElement } from '@cornerstonejs/core';
import { getSurfaceActorUID } from '../../../stateManagement/segmentation/helpers/getSegmentationActor';
function removeSurfaceFromElement(element, segmentationId) {
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement;
    const actorEntries = viewport.getActors();
    const filteredSurfaceActors = actorEntries.filter((actor) => actor.uid.startsWith(getSurfaceActorUID(viewport.id, segmentationId, '')));
    viewport.removeActors(filteredSurfaceActors.map((actor) => actor.uid));
}
export default removeSurfaceFromElement;
