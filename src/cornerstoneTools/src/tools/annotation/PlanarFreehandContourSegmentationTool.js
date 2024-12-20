import { utilities } from '@cornerstonejs/core';
import { triggerSegmentationDataModified } from '../../stateManagement/segmentation/triggerSegmentationEvents';
import PlanarFreehandROITool from './PlanarFreehandROITool';
class PlanarFreehandContourSegmentationTool extends PlanarFreehandROITool {
    constructor(toolProps) {
        const initialProps = utilities.deepMerge({
            configuration: {
                calculateStats: false,
                allowOpenContours: false,
            },
        }, toolProps);
        super(initialProps);
    }
    isContourSegmentationTool() {
        return true;
    }
    renderAnnotationInstance(renderContext) {
        const annotation = renderContext.annotation;
        const { invalidated } = annotation;
        const renderResult = super.renderAnnotationInstance(renderContext);
        if (invalidated) {
            const { segmentationId } = annotation.data.segmentation;
            triggerSegmentationDataModified(segmentationId);
        }
        return renderResult;
    }
}
PlanarFreehandContourSegmentationTool.toolName =
    'PlanarFreehandContourSegmentationTool';
export default PlanarFreehandContourSegmentationTool;
