import { utilities as csUtils } from '@cornerstonejs/core';
import { triggerSegmentationDataModified } from '../../../stateManagement/segmentation/triggerSegmentationEvents';
import compositions from './compositions';
import { getStrategyData } from './utils/getStrategyData';
import { StrategyCallbacks } from '../../../enums';
const { VoxelManager } = csUtils;
export default class BrushStrategy {
    static { this.COMPOSITIONS = compositions; }
    static { this.childFunctions = {
        [StrategyCallbacks.OnInteractionStart]: addListMethod(StrategyCallbacks.OnInteractionStart, StrategyCallbacks.Initialize),
        [StrategyCallbacks.OnInteractionEnd]: addListMethod(StrategyCallbacks.OnInteractionEnd, StrategyCallbacks.Initialize),
        [StrategyCallbacks.Fill]: addListMethod(StrategyCallbacks.Fill),
        [StrategyCallbacks.Initialize]: addListMethod(StrategyCallbacks.Initialize),
        [StrategyCallbacks.CreateIsInThreshold]: addSingletonMethod(StrategyCallbacks.CreateIsInThreshold),
        [StrategyCallbacks.AcceptPreview]: addListMethod(StrategyCallbacks.AcceptPreview, StrategyCallbacks.Initialize),
        [StrategyCallbacks.RejectPreview]: addListMethod(StrategyCallbacks.RejectPreview, StrategyCallbacks.Initialize),
        [StrategyCallbacks.INTERNAL_setValue]: addSingletonMethod(StrategyCallbacks.INTERNAL_setValue),
        [StrategyCallbacks.Preview]: addSingletonMethod(StrategyCallbacks.Preview, false),
        [StrategyCallbacks.ComputeInnerCircleRadius]: addListMethod(StrategyCallbacks.ComputeInnerCircleRadius),
        compositions: null,
    }; }
    constructor(name, ...initializers) {
        this._initialize = [];
        this._fill = [];
        this._onInteractionStart = [];
        this.fill = (enabledElement, operationData) => {
            const initializedData = this.initialize(enabledElement, operationData, StrategyCallbacks.Fill);
            if (!initializedData) {
                return;
            }
            const { strategySpecificConfiguration = {}, centerIJK } = initializedData;
            if (csUtils.isEqual(centerIJK, strategySpecificConfiguration.centerIJK)) {
                return operationData.preview;
            }
            else {
                strategySpecificConfiguration.centerIJK = centerIJK;
            }
            this._fill.forEach((func) => func(initializedData));
            const { segmentationVoxelManager, previewVoxelManager, previewSegmentIndex, } = initializedData;
            triggerSegmentationDataModified(initializedData.segmentationId, segmentationVoxelManager.getArrayOfModifiedSlices());
            if (!previewSegmentIndex || !previewVoxelManager.modifiedSlices.size) {
                segmentationVoxelManager.resetModifiedSlices();
                return null;
            }
            return initializedData.preview || initializedData;
        };
        this.onInteractionStart = (enabledElement, operationData) => {
            const { preview } = operationData;
            if (preview?.isPreviewFromHover) {
                preview.isPreviewFromHover = false;
                return;
            }
            const initializedData = this.initialize(enabledElement, operationData);
            if (!initializedData) {
                return;
            }
            this._onInteractionStart.forEach((func) => func.call(this, initializedData));
        };
        this.configurationName = name;
        this.compositions = initializers;
        initializers.forEach((initializer) => {
            const result = typeof initializer === 'function' ? initializer() : initializer;
            if (!result) {
                return;
            }
            for (const key in result) {
                if (!BrushStrategy.childFunctions[key]) {
                    throw new Error(`Didn't find ${key} as a brush strategy`);
                }
                BrushStrategy.childFunctions[key](this, result[key]);
            }
        });
        this.strategyFunction = (enabledElement, operationData) => {
            return this.fill(enabledElement, operationData);
        };
        for (const key of Object.keys(BrushStrategy.childFunctions)) {
            this.strategyFunction[key] = this[key];
        }
    }
    initialize(enabledElement, operationData, operationName) {
        const { viewport } = enabledElement;
        const data = getStrategyData({ operationData, viewport });
        if (!data) {
            console.warn('No data found for BrushStrategy');
            return operationData.preview;
        }
        const { imageVoxelManager, segmentationVoxelManager, segmentationImageData, } = data;
        const segmentationVoxelManagerToUse = operationData.override?.voxelManager || segmentationVoxelManager;
        const segmentationImageDataToUse = operationData.override?.imageData || segmentationImageData;
        const previewVoxelManager = operationData.preview?.previewVoxelManager ||
            VoxelManager.createHistoryVoxelManager({
                sourceVoxelManager: segmentationVoxelManagerToUse,
            });
        const previewEnabled = !!operationData.previewColors;
        const previewSegmentIndex = previewEnabled ? 255 : undefined;
        const initializedData = {
            operationName,
            previewSegmentIndex,
            ...operationData,
            enabledElement,
            imageVoxelManager,
            segmentationVoxelManager: segmentationVoxelManagerToUse,
            segmentationImageData: segmentationImageDataToUse,
            previewVoxelManager,
            viewport,
            centerWorld: null,
            isInObject: null,
            isInObjectBoundsIJK: null,
            brushStrategy: this,
        };
        this._initialize.forEach((func) => func(initializedData));
        return initializedData;
    }
}
function addListMethod(name, createInitialized) {
    const listName = `_${name}`;
    return (brushStrategy, func) => {
        brushStrategy[listName] ||= [];
        brushStrategy[listName].push(func);
        brushStrategy[name] ||= createInitialized
            ? (enabledElement, operationData) => {
                const initializedData = brushStrategy[createInitialized](enabledElement, operationData, name);
                brushStrategy[listName].forEach((func) => func.call(brushStrategy, initializedData));
            }
            : (operationData) => {
                brushStrategy[listName].forEach((func) => func.call(brushStrategy, operationData));
            };
    };
}
function addSingletonMethod(name, isInitialized = true) {
    return (brushStrategy, func) => {
        if (brushStrategy[name]) {
            throw new Error(`The singleton method ${name} already exists`);
        }
        brushStrategy[name] = isInitialized
            ? func
            : (enabledElement, operationData) => {
                operationData.enabledElement = enabledElement;
                return func.call(brushStrategy, operationData);
            };
    };
}
