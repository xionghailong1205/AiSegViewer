import { BaseVolumeViewport, getRenderingEngine, StackViewport, } from '@cornerstonejs/core';
export default function voiSyncCallback(synchronizerInstance, sourceViewport, targetViewport, modifiedEvent, options) {
    const eventDetail = modifiedEvent.detail;
    const { volumeId, range, invertStateChanged, invert, colormap } = eventDetail;
    const renderingEngine = getRenderingEngine(targetViewport.renderingEngineId);
    if (!renderingEngine) {
        throw new Error(`Rendering Engine does not exist: ${targetViewport.renderingEngineId}`);
    }
    const tViewport = renderingEngine.getViewport(targetViewport.viewportId);
    const tProperties = {
        voiRange: range,
    };
    if (options?.syncInvertState && invertStateChanged) {
        tProperties.invert = invert;
    }
    if (options?.syncColormap && colormap) {
        tProperties.colormap = colormap;
    }
    if (tViewport instanceof BaseVolumeViewport) {
        const isFusion = tViewport._actors && tViewport._actors.size > 1;
        if (isFusion) {
            tViewport.setProperties(tProperties, volumeId);
        }
        else {
            tViewport.setProperties(tProperties);
        }
    }
    else if (tViewport instanceof StackViewport) {
        tViewport.setProperties(tProperties);
    }
    else {
        throw new Error('Viewport type not supported.');
    }
    tViewport.render();
}
