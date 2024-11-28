import { create } from "zustand";
import { annotation } from "@cornerstonejs/tools";
import { getSEGService, viewportIds } from "@/service/segService";
import { scrollVolume } from "@cornerstonejs/core/utilities/scroll";
import { VolumeViewport } from "@cornerstonejs/core";

const { getAnnotationManager } = annotation.state;
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
  doAiSeg: () => Promise<string>;
  apiTest: () => void;
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
    async doAiSeg() {
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
      const bottomRightPoint = selectedAnnotation.data.handles.points[2].slice(
        0,
        2
      );
      const bottomLeftPoint = selectedAnnotation.data.handles.points[3].slice(
        0,
        2
      );

      const originCoordinate = segService.getOriginCoordinate();

      const left = Math.abs(topRightPoint[0] - originCoordinate[0]);
      const top = Math.abs(topRightPoint[1] - originCoordinate[1]);

      const width = Math.abs(bottomLeftPoint[0] - topRightPoint[0]);
      const height = Math.abs(bottomLeftPoint[1] - topRightPoint[1]);

      console.log({
        referenceStudyUID: StudyInstanceUID,
        sliceIndex,
        top,
        left,
        width,
        height,
      });

      const message = await segService.createSegTask(
        {
          referenceStudyUID: StudyInstanceUID,
          sliceIndex,
          top,
          left,
          width,
          height,
        },
        idOfSelectedAnnotation
      );

      return message;
    },
    // 我们在这里做一个简单 API 测试起
    apiTest() {
      const segService = getSEGService();
      const segViewport = segService.renderingEngine.getViewport(
        viewportIds.MPR.AXIAL
      ) as VolumeViewport;
      const volumeId = segService.MPRVolumeID;
      const currentIndex = segViewport.getSliceIndex() + 1;
      const jumpIndex = 36;

      const delta = jumpIndex - currentIndex;
      console.log(delta);

      scrollVolume(segViewport, volumeId, delta, false);
    },
  })
);
