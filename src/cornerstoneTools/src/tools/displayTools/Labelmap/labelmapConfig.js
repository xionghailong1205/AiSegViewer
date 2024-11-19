const defaultLabelmapConfig = {
    renderOutline: true,
    renderOutlineInactive: true,
    outlineWidth: 3,
    outlineWidthInactive: 2,
    activeSegmentOutlineWidthDelta: 0,
    renderFill: true,
    renderFillInactive: true,
    fillAlpha: 0.5,
    fillAlphaInactive: 0.4,
    outlineOpacity: 1,
    outlineOpacityInactive: 0.85,
};
function getDefaultLabelmapStyle() {
    return defaultLabelmapConfig;
}
export default getDefaultLabelmapStyle;