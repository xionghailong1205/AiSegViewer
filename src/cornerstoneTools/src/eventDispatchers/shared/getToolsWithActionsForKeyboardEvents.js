import { getToolGroupForViewport } from '../../store/ToolGroupManager';
export default function getToolsWithModesForKeyboardEvent(evt, toolModes) {
    const toolsWithActions = new Map();
    const { renderingEngineId, viewportId } = evt.detail;
    const toolGroup = getToolGroupForViewport(viewportId, renderingEngineId);
    if (!toolGroup) {
        return toolsWithActions;
    }
    const toolGroupToolNames = Object.keys(toolGroup.toolOptions);
    const key = evt.detail.key;
    for (let j = 0; j < toolGroupToolNames.length; j++) {
        const toolName = toolGroupToolNames[j];
        const tool = toolGroup.getToolInstance(toolName);
        const actionsConfig = tool.configuration?.actions;
        if (!actionsConfig) {
            continue;
        }
        const actions = Object.values(actionsConfig);
        if (!actions?.length || !toolModes.includes(tool.mode)) {
            continue;
        }
        const action = actions.find((action) => action.bindings.some((binding) => binding.key === key));
        if (action) {
            toolsWithActions.set(tool, action);
        }
    }
    return toolsWithActions;
}
