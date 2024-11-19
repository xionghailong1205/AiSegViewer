import { getActiveSegmentation as _getActiveSegmentation } from './getActiveSegmentation';
import { setActiveSegmentation as _setActiveSegmentation } from './setActiveSegmentation';
function getActiveSegmentation(viewportId) {
    return _getActiveSegmentation(viewportId);
}
function setActiveSegmentation(viewportId, segmentationId, suppressEvent = false) {
    _setActiveSegmentation(viewportId, segmentationId);
}
export { getActiveSegmentation, setActiveSegmentation, };
