import type { Types } from '@cornerstonejs/core';
import ToolModes from '../../enums/ToolModes';
import type StrategyCallbacks from '../../enums/StrategyCallbacks';
import type { InteractionTypes, ToolProps, PublicToolProps } from '../../types';
declare abstract class BaseTool {
    static toolName: any;
    supportedInteractionTypes: InteractionTypes[];
    configuration: Record<string, any>;
    toolGroupId: string;
    mode: ToolModes;
    constructor(toolProps: PublicToolProps, defaultToolProps: ToolProps);
    getToolName(): string;
    applyActiveStrategy(enabledElement: Types.IEnabledElement, operationData: unknown): any;
    applyActiveStrategyCallback(enabledElement: Types.IEnabledElement, operationData: unknown, callbackType: StrategyCallbacks | string): any;
    setConfiguration(newConfiguration: Record<string, any>): void;
    setActiveStrategy(strategyName: string): void;
    protected getTargetImageData(targetId: string): Types.IImageData | Types.CPUIImageData;
    protected getTargetId(viewport: Types.IViewport): string | undefined;
}
export default BaseTool;
