import { create } from "zustand";
import { annotation } from "@cornerstonejs/tools";
import { getSEGService } from "@/service/segService";

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
  })
);
