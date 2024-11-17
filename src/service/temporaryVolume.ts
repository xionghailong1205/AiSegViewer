import { config } from "@/config/config";
import createImageIdsAndCacheMetaData from "@/lib/createImageIdsAndCacheMetaData";
import { StreamingImageVolume, volumeLoader } from "@cornerstonejs/core";

// 这个只能有一个实例子, 不然会出错
export class TemporaryVolumeManager {
  private StudyInstanceUID: string;
  private SeriesInstanceUID: string;
  private wadoRsRoot = config.wadoRsRoot;
  private temportVolumeId = "TEMPORY_VOLUME";
  private volume: StreamingImageVolume;

  constructor({
    StudyInstanceUID,
    SeriesInstanceUID,
  }: {
    StudyInstanceUID: string;
    SeriesInstanceUID: string;
  }) {
    this.StudyInstanceUID = StudyInstanceUID;
    this.SeriesInstanceUID = SeriesInstanceUID;
  }

  async getVolume() {
    if (!this.volume) {
      const imageIds = await createImageIdsAndCacheMetaData({
        StudyInstanceUID: this.StudyInstanceUID,
        SeriesInstanceUID: this.SeriesInstanceUID,
        wadoRsRoot: this.wadoRsRoot,
      });

      this.volume = (await volumeLoader.createAndCacheVolume(
        this.temportVolumeId,
        {
          imageIds,
        }
      )) as StreamingImageVolume;

      return this.volume;
    } else {
      return this.volume;
    }
  }

  destoryVolume() {}
}
