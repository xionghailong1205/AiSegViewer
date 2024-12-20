import { getEnabledElement } from '@cornerstonejs/core';
import { state } from '../../../store/state';
import { Events } from '../../../enums';
import { hideElementCursor } from '../../../cursors/elementCursor';
import { polyline } from '../../../utilities/math';
const { getSubPixelSpacingAndXYDirections } = polyline;
function activateOpenContourEndEdit(evt, annotation, viewportIdsToRender, handle) {
    this.isDrawing = true;
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement;
    const { spacing, xDir, yDir } = getSubPixelSpacingAndXYDirections(viewport, this.configuration.subPixelResolution);
    const canvasPoints = annotation.data.contour.polyline.map(viewport.worldToCanvas);
    const handleIndexGrabbed = annotation.data.handles.activeHandleIndex;
    if (handleIndexGrabbed === 0) {
        canvasPoints.reverse();
    }
    let movingTextBox = false;
    if (handle?.worldPosition) {
        movingTextBox = true;
    }
    this.drawData = {
        canvasPoints: canvasPoints,
        polylineIndex: canvasPoints.length - 1,
    };
    this.commonData = {
        annotation,
        viewportIdsToRender,
        spacing,
        xDir,
        yDir,
        movingTextBox,
    };
    state.isInteractingWithTool = true;
    element.addEventListener(Events.MOUSE_UP, this.mouseUpDrawCallback);
    element.addEventListener(Events.MOUSE_DRAG, this.mouseDragDrawCallback);
    element.addEventListener(Events.MOUSE_CLICK, this.mouseUpDrawCallback);
    element.addEventListener(Events.TOUCH_END, this.mouseUpDrawCallback);
    element.addEventListener(Events.TOUCH_DRAG, this.mouseDragDrawCallback);
    element.addEventListener(Events.TOUCH_TAP, this.mouseUpDrawCallback);
    hideElementCursor(element);
}
function registerOpenContourEndEditLoop(toolInstance) {
    toolInstance.activateOpenContourEndEdit =
        activateOpenContourEndEdit.bind(toolInstance);
}
export default registerOpenContourEndEditLoop;
