import { state } from '../../stateManagement/annotation';
import RectangleROIStartEndThresholdTool from '../../tools/segmentation/RectangleROIStartEndThresholdTool';
import RectangleROIThresholdTool from '../../tools/segmentation/RectangleROIThresholdTool';
import thresholdVolumeByRange from './thresholdVolumeByRange';
import getBoundsIJKFromRectangleAnnotations from '../rectangleROITool/getBoundsIJKFromRectangleAnnotations';
function rectangleROIThresholdVolumeByRange(annotationUIDs, segmentationVolume, thresholdVolumeInformation, options) {
    const annotations = annotationUIDs.map((annotationUID) => {
        return state.getAnnotation(annotationUID);
    });
    _validateAnnotations(annotations);
    let boundsIJK;
    for (let i = 0; i < thresholdVolumeInformation.length; i++) {
        const volumeSize = thresholdVolumeInformation[i].volume.voxelManager.getScalarDataLength();
        if (volumeSize === segmentationVolume.voxelManager.getScalarDataLength() ||
            i === 0) {
            boundsIJK = getBoundsIJKFromRectangleAnnotations(annotations, thresholdVolumeInformation[i].volume, options);
        }
    }
    const outputSegmentationVolume = thresholdVolumeByRange(segmentationVolume, thresholdVolumeInformation, { ...options, boundsIJK });
    outputSegmentationVolume.modified();
    return outputSegmentationVolume;
}
function _validateAnnotations(annotations) {
    const validToolNames = [
        RectangleROIThresholdTool.toolName,
        RectangleROIStartEndThresholdTool.toolName,
    ];
    for (const annotation of annotations) {
        const name = annotation.metadata.toolName;
        if (!validToolNames.includes(name)) {
            throw new Error('rectangleROIThresholdVolumeByRange only supports RectangleROIThreshold and RectangleROIStartEndThreshold annotations');
        }
    }
}
export default rectangleROIThresholdVolumeByRange;
