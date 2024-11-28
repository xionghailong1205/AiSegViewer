import { getSEGService, viewportIds } from "@/service/segService";
import { VolumeViewport } from "@cornerstonejs/core";
import { scrollVolume } from "@cornerstonejs/core/utilities/scroll";

export const jumpToSpecificIndex = (jumpIndex: number) => {
  const segService = getSEGService();
  const segViewport = segService.renderingEngine.getViewport(
    viewportIds.MPR.AXIAL
  ) as VolumeViewport;
  const totalIndex = segViewport.getNumberOfSlices();

  if (jumpIndex > totalIndex || jumpIndex < 1) {
    alert("超出范围");
    return;
  }

  const volumeId = segService.MPRVolumeID;
  const currentIndex = segViewport.getSliceIndex() + 1;
  const delta = jumpIndex - currentIndex;
  scrollVolume(segViewport, volumeId, delta, false);
};
