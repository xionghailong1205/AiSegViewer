import { utilities, BaseVolumeViewport } from '@cornerstonejs/core';
import ToolModes from '../../enums/ToolModes';
class BaseTool {
    constructor(toolProps, defaultToolProps) {
        const initialProps = utilities.deepMerge(defaultToolProps, toolProps);
        const { configuration = {}, supportedInteractionTypes, toolGroupId, } = initialProps;
        if (!configuration.strategies) {
            configuration.strategies = {};
            configuration.defaultStrategy = undefined;
            configuration.activeStrategy = undefined;
            configuration.strategyOptions = {};
        }
        this.toolGroupId = toolGroupId;
        this.supportedInteractionTypes = supportedInteractionTypes || [];
        this.configuration = Object.assign({}, configuration);
        this.mode = ToolModes.Disabled;
    }
    getToolName() {
        return this.constructor.toolName;
    }
    applyActiveStrategy(enabledElement, operationData) {
        const { strategies, activeStrategy } = this.configuration;
        return strategies[activeStrategy]?.call(this, enabledElement, operationData);
    }
    applyActiveStrategyCallback(enabledElement, operationData, callbackType) {
        const { strategies, activeStrategy } = this.configuration;
        if (!strategies[activeStrategy]) {
            throw new Error(`applyActiveStrategyCallback: active strategy ${activeStrategy} not found, check tool configuration or spellings`);
        }
        return strategies[activeStrategy][callbackType]?.call(this, enabledElement, operationData);
    }
    setConfiguration(newConfiguration) {
        this.configuration = utilities.deepMerge(this.configuration, newConfiguration);
    }
    setActiveStrategy(strategyName) {
        this.setConfiguration({ activeStrategy: strategyName });
    }
    getTargetImageData(targetId) {
        if (targetId.startsWith('imageId:')) {
            const imageId = targetId.split('imageId:')[1];
            const imageURI = utilities.imageIdToURI(imageId);
            let viewports = utilities.getViewportsWithImageURI(imageURI);
            if (!viewports || !viewports.length) {
                return;
            }
            viewports = viewports.filter((viewport) => {
                return viewport.getCurrentImageId() === imageId;
            });
            if (!viewports || !viewports.length) {
                return;
            }
            return viewports[0].getImageData();
        }
        else if (targetId.startsWith('volumeId:')) {
            const volumeId = utilities.getVolumeId(targetId);
            const viewports = utilities.getViewportsWithVolumeId(volumeId);
            if (!viewports || !viewports.length) {
                return;
            }
            return viewports[0].getImageData();
        }
        else if (targetId.startsWith('videoId:')) {
            const imageURI = utilities.imageIdToURI(targetId);
            const viewports = utilities.getViewportsWithImageURI(imageURI);
            if (!viewports || !viewports.length) {
                return;
            }
            return viewports[0].getImageData();
        }
        else {
            throw new Error('getTargetIdImage: targetId must start with "imageId:" or "volumeId:"');
        }
    }
    getTargetId(viewport) {
        const targetId = viewport.getViewReferenceId?.();
        if (targetId) {
            return targetId;
        }
        throw new Error('getTargetId: viewport must have a getViewReferenceId method');
    }
}
BaseTool.toolName = 'BaseTool';
export default BaseTool;
