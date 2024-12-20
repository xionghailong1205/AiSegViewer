var StrategyCallbacks;
(function (StrategyCallbacks) {
    StrategyCallbacks["OnInteractionStart"] = "onInteractionStart";
    StrategyCallbacks["OnInteractionEnd"] = "onInteractionEnd";
    StrategyCallbacks["Preview"] = "preview";
    StrategyCallbacks["RejectPreview"] = "rejectPreview";
    StrategyCallbacks["AcceptPreview"] = "acceptPreview";
    StrategyCallbacks["Fill"] = "fill";
    StrategyCallbacks["StrategyFunction"] = "strategyFunction";
    StrategyCallbacks["CreateIsInThreshold"] = "createIsInThreshold";
    StrategyCallbacks["Initialize"] = "initialize";
    StrategyCallbacks["INTERNAL_setValue"] = "setValue";
    StrategyCallbacks["ComputeInnerCircleRadius"] = "computeInnerCircleRadius";
})(StrategyCallbacks || (StrategyCallbacks = {}));
export default StrategyCallbacks;
