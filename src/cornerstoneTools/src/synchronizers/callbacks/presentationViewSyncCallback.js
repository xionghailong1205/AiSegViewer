import { getRenderingEngine } from '@cornerstonejs/core';
export default function presentationViewSyncCallback(_synchronizerInstance, sourceViewport, targetViewport, _sourceEvent, options) {
    const renderingEngine = getRenderingEngine(targetViewport.renderingEngineId);
    if (!renderingEngine) {
        throw new Error(`No RenderingEngine for Id: ${targetViewport.renderingEngineId}`);
    }
    const tViewport = renderingEngine.getViewport(targetViewport.viewportId);
    const sViewport = renderingEngine.getViewport(sourceViewport.viewportId);
    const presentationView = sViewport.getViewPresentation(options);
    tViewport.setViewPresentation(presentationView);
    tViewport.render();
}
