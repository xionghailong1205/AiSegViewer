import {
  cornerstoneStreamingImageVolumeLoader,
  init as csRenderInit,
  volumeLoader,
} from "@cornerstonejs/core";
import { init as csToolsInit } from "@cornerstonejs/tools";
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";

export const initCornerstoneCore = async () => {
  volumeLoader.registerUnknownVolumeLoader(
    cornerstoneStreamingImageVolumeLoader
  );

  await csRenderInit();
  await csToolsInit();
  dicomImageLoaderInit({ maxWebWorkers: 1 });

  return "success";
};
