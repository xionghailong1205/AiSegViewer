import { create } from "zustand";
import { annotation } from "@cornerstonejs/tools";
import { getSEGService, viewportIds } from "@/service/segService";
import { getAnnotationManager } from "@cornerstonejs/tools/annotation/annotationState";

const { removeAnnotation } = annotation.state;

interface contextPosition {
  x: number;
  y: number;
}

type ContextMenuStatus = "open" | "closed";

interface state {
  anchorPosition: contextPosition;
  status: ContextMenuStatus;
  idOfSelectedAnnotation: string;
}

interface action {
  openContextMenu: (
    anchorPosition: contextPosition,
    idOfSelectedAnnotation: string
  ) => void;
  closeContextMenu: () => void;
  removeSelectedAnnotation: () => void;
  doAiSeg: () => void;
}

interface ContextMenuServiceProp extends state, action {}

export const useContextMenuService = create<ContextMenuServiceProp>(
  (set, get) => ({
    anchorPosition: { x: 0, y: 0 },
    status: "closed",
    idOfSelectedAnnotation: "",
    openContextMenu(anchorPosition, idOfSelectedAnnotation) {
      set({
        anchorPosition,
        idOfSelectedAnnotation,
        status: "open",
      });
    },
    closeContextMenu() {
      set({
        status: "closed",
      });
    },
    removeSelectedAnnotation() {
      const idOfSelectedAnnotation = get().idOfSelectedAnnotation;
      removeAnnotation(idOfSelectedAnnotation);

      const renderingEngine = getSEGService().renderingEngine;

      renderingEngine.render();
    },
    doAiSeg() {
      const idOfSelectedAnnotation = get().idOfSelectedAnnotation;

      const segService = getSEGService();

      const axialViewport = segService.renderingEngine.getViewport(
        viewportIds.MPR.AXIAL
      )!;

      const sliceIndex = axialViewport.getCurrentImageIdIndex();

      const annotationManager = getAnnotationManager();
      const selectedAnnotation = annotationManager.getAnnotation(
        idOfSelectedAnnotation
      );

      const topRightPoint = selectedAnnotation.data.handles.points[0].slice(
        0,
        2
      );
      const bottomLeftPoint = selectedAnnotation.data.handles.points[3].slice(
        0,
        2
      );

      const width = bottomLeftPoint[0] - topRightPoint[0];
      const height = bottomLeftPoint[1] - topRightPoint[1];

      segService.addSegData({
        referenceStudyUID: StudyInstanceUID,
        sliceIndex,
        left: topRightPoint[0],
        top: topRightPoint[1],
        width,
        height,
      });
    },
  })
);
