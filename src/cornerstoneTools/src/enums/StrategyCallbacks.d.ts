declare enum StrategyCallbacks {
    OnInteractionStart = "onInteractionStart",
    OnInteractionEnd = "onInteractionEnd",
    Preview = "preview",
    RejectPreview = "rejectPreview",
    AcceptPreview = "acceptPreview",
    Fill = "fill",
    StrategyFunction = "strategyFunction",
    CreateIsInThreshold = "createIsInThreshold",
    Initialize = "initialize",
    INTERNAL_setValue = "setValue",
    ComputeInnerCircleRadius = "computeInnerCircleRadius"
}
export default StrategyCallbacks;
