import { getRenderingEngines } from '@cornerstonejs/core';
import { state } from '../state';
function getToolGroupForViewport(viewportId, renderingEngineId) {
    if (!renderingEngineId) {
        renderingEngineId = getRenderingEngines().find((re) => re.getViewports().find((vp) => vp.id === viewportId))?.id;
    }
    const toolGroupFilteredByIds = state.toolGroups.filter((tg) => tg.viewportsInfo.some((vp) => vp.renderingEngineId === renderingEngineId &&
        (!vp.viewportId || vp.viewportId === viewportId)));
    if (!toolGroupFilteredByIds.length) {
        return;
    }
    if (toolGroupFilteredByIds.length > 1) {
        throw new Error(`Multiple tool groups found for renderingEngineId: ${renderingEngineId} and viewportId: ${viewportId}. You should only
      have one tool group per viewport in a renderingEngine.`);
    }
    return toolGroupFilteredByIds[0];
}
export default getToolGroupForViewport;
