declare const _default: {
    determineSegmentIndex: {
        initialize: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
        onInteractionStart: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    dynamicThreshold: {
        initialize: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
        onInteractionStart: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
        computeInnerCircleRadius: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    erase: {
        initialize: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    islandRemoval: {
        onInteractionEnd: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    preview: {
        preview: (operationData: import("../BrushStrategy").InitializedOperationData) => any;
        initialize: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
        acceptPreview: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
        rejectPreview: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    regionFill: {
        fill: (operationData: import("../BrushStrategy").InitializedOperationData) => void;
    };
    setValue: {
        setValue: (operationData: import("../BrushStrategy").InitializedOperationData, { value, index }: {
            value: any;
            index: any;
        }) => void;
    };
    threshold: {
        createIsInThreshold: (operationData: import("../BrushStrategy").InitializedOperationData) => (index: any) => boolean;
    };
};
export default _default;
