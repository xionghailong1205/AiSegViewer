import { getEnabledElementByViewportId } from "@cornerstonejs/core";
import { utilities } from "@cornerstonejs/tools";

export function triggerAnnotationRenderForViewportIds(
  viewportIdsToRender: string[]
): void {
  if (!viewportIdsToRender.length) {
    return;
  }

  viewportIdsToRender.forEach((viewportId) => {
    const enabledElement = getEnabledElementByViewportId(viewportId);
    if (!enabledElement) {
      console.warn(`Viewport not available for ${viewportId}`);
      return;
    }

    const { viewport } = enabledElement;

    if (!viewport) {
      console.warn(`Viewport not available for ${viewportId}`);
      return;
    }

    const element = viewport.element;
    utilities.triggerAnnotationRender(element);
  });
}

export default triggerAnnotationRenderForViewportIds;
