import { config } from "@/config/config";
import createImageIdsAndCacheMetaData from "@/lib/createImageIdsAndCacheMetaData";
import { StreamingImageVolume, volumeLoader, cache } from "@cornerstonejs/core";

// 这个只能有一个实例子, 不然会出错
export class TemporaryVolumeManager {
  private StudyInstanceUID: string;
  private SeriesInstanceUID: string;
  private wadoRsRoot = config.wadoRsRoot;
  private temportVolumeId = "TEMPORY_VOLUME";

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
    const tmpVolume = cache.getVolume(this.temportVolumeId);

    if (!tmpVolume) {
      const imageIds = await createImageIdsAndCacheMetaData({
        StudyInstanceUID: this.StudyInstanceUID,
        SeriesInstanceUID: this.SeriesInstanceUID,
        wadoRsRoot: this.wadoRsRoot,
      });

      const tmpVolume = (await volumeLoader.createAndCacheVolume(
        this.temportVolumeId,
        {
          imageIds,
        }
      )) as StreamingImageVolume;

      return tmpVolume;
    } else {
      return tmpVolume;
    }
  }

  destoryVolume() {
    cache.removeVolumeLoadObject(this.temportVolumeId);
  }
}
