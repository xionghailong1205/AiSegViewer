import StrategyCallbacks from '../../../../enums/StrategyCallbacks';
export default {
    [StrategyCallbacks.Initialize]: (operationData) => {
        operationData.segmentIndex = 0;
    },
};