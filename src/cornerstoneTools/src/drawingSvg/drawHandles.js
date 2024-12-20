import drawHandle from './drawHandle';
function drawHandles(svgDrawingHelper, annotationUID, handleGroupUID, handlePoints, options = {}) {
    handlePoints.forEach((handle, i) => {
        drawHandle(svgDrawingHelper, annotationUID, handleGroupUID, handle, options, i);
    });
}
export default drawHandles;
