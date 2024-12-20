import { vec3 } from 'gl-matrix';
import StrategyCallbacks from '../../../../enums/StrategyCallbacks';
export default {
    [StrategyCallbacks.CreateIsInThreshold]: (operationData) => {
        const { imageVoxelManager, strategySpecificConfiguration, segmentIndex } = operationData;
        if (!strategySpecificConfiguration || !segmentIndex) {
            return;
        }
        return (index) => {
            const { THRESHOLD, THRESHOLD_INSIDE_CIRCLE } = strategySpecificConfiguration;
            const voxelValue = imageVoxelManager.getAtIndex(index);
            const gray = Array.isArray(voxelValue)
                ? vec3.length(voxelValue)
                : voxelValue;
            const { threshold } = THRESHOLD || THRESHOLD_INSIDE_CIRCLE || {};
            if (!threshold?.length) {
                return true;
            }
            return threshold[0] <= gray && gray <= threshold[1];
        };
    },
};
