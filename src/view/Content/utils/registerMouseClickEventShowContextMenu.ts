import { useContextMenuService } from "@/store/useContextMenuService";
import {
  Enums as toolEnums,
  Types as toolTypes,
  utilities,
} from "@cornerstonejs/tools";
const getAnnotationNearPoint = utilities.getAnnotationNearPoint;
const cs3DToolsEvents = toolEnums.Events;

const openContextMenu = useContextMenuService.getState().openContextMenu;

export const registerMouseClickEventShowContextMenu = (
  viewportElement: HTMLDivElement
) => {
  const RightClickAnnotationHandle = (e: Event) => {
    const event = e as toolTypes.EventTypes.MouseClickEventType;

    const isRigthButtonClicked = event.detail.event.which === 3 ? true : false;

    if (isRigthButtonClicked) {
      const pageCoordinate = event.detail.currentPoints.page;

      const anchorPosition = {
        x: pageCoordinate[0],
        y: pageCoordinate[1],
      };

      const canvasPoint = event.detail.currentPoints.canvas;
      const element = event.detail.element;

      const result = getAnnotationNearPoint(element, canvasPoint);
      if (result) {
        // 我们需要将这个 annotation 的 ID 组册到我们的 zustand store 中进行一些操作
        const idOfSelectedAnnotation = result.annotationUID!;

        openContextMenu(anchorPosition, idOfSelectedAnnotation);
      } else {
        // do nothing
      }
    } else {
      // do nothing
    }
  };

  viewportElement.addEventListener(
    cs3DToolsEvents.MOUSE_CLICK,
    RightClickAnnotationHandle
  );

  return () => {
    viewportElement.removeEventListener(
      cs3DToolsEvents.MOUSE_CLICK,
      RightClickAnnotationHandle
    );
  };
};
