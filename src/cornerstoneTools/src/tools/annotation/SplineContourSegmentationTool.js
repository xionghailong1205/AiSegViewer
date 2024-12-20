import { utilities } from '@cornerstonejs/core';
import SplineROITool from './SplineROITool';
class SplineContourSegmentationTool extends SplineROITool {
    constructor(toolProps) {
        const initialProps = utilities.deepMerge({
            configuration: {
                calculateStats: false,
            },
        }, toolProps);
        super(initialProps);
    }
    isContourSegmentationTool() {
        return true;
    }
}
SplineContourSegmentationTool.toolName = 'SplineContourSegmentationTool';
export default SplineContourSegmentationTool;
