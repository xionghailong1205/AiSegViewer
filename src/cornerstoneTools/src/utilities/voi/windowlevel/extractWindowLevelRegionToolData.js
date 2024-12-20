import { VolumeViewport, utilities as csUtils, cache, StackViewport, } from '@cornerstonejs/core';
function extractWindowLevelRegionToolData(viewport) {
    if (viewport instanceof VolumeViewport) {
        return extractImageDataVolume(viewport);
    }
    if (viewport instanceof StackViewport) {
        return extractImageDataStack(viewport);
    }
    throw new Error('Viewport not supported');
}
function extractImageDataVolume(viewport) {
    const { scalarData, width, height } = csUtils.getCurrentVolumeViewportSlice(viewport);
    const { min: minPixelValue, max: maxPixelValue } = csUtils.getMinMax(scalarData);
    return {
        scalarData,
        minPixelValue,
        maxPixelValue,
        width,
        height,
        rows: width,
        columns: height,
    };
}
function extractImageDataStack(viewport) {
    const imageData = viewport.getImageData();
    const { scalarData } = imageData;
    const { min: minPixelValue, max: maxPixelValue } = csUtils.getMinMax(scalarData);
    const width = imageData.dimensions[0];
    const height = imageData.dimensions[1];
    const { rows, columns, color } = viewport.getCornerstoneImage();
    return {
        scalarData,
        width,
        height,
        minPixelValue,
        maxPixelValue,
        rows,
        columns,
        color,
    };
}
export { extractWindowLevelRegionToolData };
