import type { Types } from '@cornerstonejs/core';
import { StrategyCallbacks } from '../../../enums';
import type { LabelmapToolOperationDataAny } from '../../../types/LabelmapToolOperationData';
import type vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
export type InitializedOperationData = LabelmapToolOperationDataAny & {
    operationName?: string;
    enabledElement: Types.IEnabledElement;
    centerIJK?: Types.Point3;
    centerWorld: Types.Point3;
    isInObject: (point: Types.Point3) => boolean;
    isInObjectBoundsIJK: Types.BoundsIJK;
    viewport: Types.IViewport;
    imageVoxelManager: Types.IVoxelManager<number> | Types.IVoxelManager<Types.RGB>;
    segmentationVoxelManager: Types.IVoxelManager<number>;
    segmentationImageData: vtkImageData;
    previewVoxelManager: Types.IVoxelManager<number>;
    previewSegmentIndex?: number;
    brushStrategy: BrushStrategy;
    configuration?: Record<string, any>;
};
export type StrategyFunction = (operationData: InitializedOperationData, ...args: any[]) => unknown;
export type CompositionInstance = {
    [callback in StrategyCallbacks]?: StrategyFunction;
};
export type CompositionFunction = () => CompositionInstance;
export type Composition = CompositionFunction | CompositionInstance;
export default class BrushStrategy {
    static COMPOSITIONS: {
        determineSegmentIndex: {
            initialize: (operationData: InitializedOperationData) => void;
            onInteractionStart: (operationData: InitializedOperationData) => void;
        };
        dynamicThreshold: {
            initialize: (operationData: InitializedOperationData) => void;
            onInteractionStart: (operationData: InitializedOperationData) => void;
            computeInnerCircleRadius: (operationData: InitializedOperationData) => void;
        };
        erase: {
            initialize: (operationData: InitializedOperationData) => void;
        };
        islandRemoval: {
            onInteractionEnd: (operationData: InitializedOperationData) => void;
        };
        preview: {
            preview: (operationData: InitializedOperationData) => any;
            initialize: (operationData: InitializedOperationData) => void;
            acceptPreview: (operationData: InitializedOperationData) => void;
            rejectPreview: (operationData: InitializedOperationData) => void;
        };
        regionFill: {
            fill: (operationData: InitializedOperationData) => void;
        };
        setValue: {
            setValue: (operationData: InitializedOperationData, { value, index }: {
                value: any;
                index: any;
            }) => void;
        };
        threshold: {
            createIsInThreshold: (operationData: InitializedOperationData) => (index: any) => boolean;
        };
    };
    protected static childFunctions: {
        onInteractionStart: (brushStrategy: any, func: any) => void;
        onInteractionEnd: (brushStrategy: any, func: any) => void;
        fill: (brushStrategy: any, func: any) => void;
        initialize: (brushStrategy: any, func: any) => void;
        createIsInThreshold: (brushStrategy: any, func: any) => void;
        acceptPreview: (brushStrategy: any, func: any) => void;
        rejectPreview: (brushStrategy: any, func: any) => void;
        setValue: (brushStrategy: any, func: any) => void;
        preview: (brushStrategy: any, func: any) => void;
        computeInnerCircleRadius: (brushStrategy: any, func: any) => void;
        compositions: any;
    };
    compositions: Composition[];
    strategyFunction: (enabledElement: any, operationData: any) => unknown;
    protected configurationName: string;
    protected _initialize: any[];
    protected _fill: any[];
    protected _acceptPreview: [];
    protected _onInteractionStart: any[];
    constructor(name: any, ...initializers: Composition[]);
    fill: (enabledElement: Types.IEnabledElement, operationData: LabelmapToolOperationDataAny) => any;
    protected initialize(enabledElement: Types.IEnabledElement, operationData: LabelmapToolOperationDataAny, operationName?: string): InitializedOperationData;
    onInteractionStart: (enabledElement: Types.IEnabledElement, operationData: LabelmapToolOperationDataAny) => void;
    onInteractionEnd: (enabledElement: Types.IEnabledElement, operationData: LabelmapToolOperationDataAny) => void;
    rejectPreview: (enabledElement: Types.IEnabledElement, operationData: LabelmapToolOperationDataAny) => void;
    acceptPreview: (enabledElement: Types.IEnabledElement, operationData: LabelmapToolOperationDataAny) => void;
    preview: (enabledElement: Types.IEnabledElement, operationData: LabelmapToolOperationDataAny) => unknown;
    setValue: (operationData: InitializedOperationData, data: any) => void;
    createIsInThreshold: (operationData: InitializedOperationData) => any;
}