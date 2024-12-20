import { state } from './state';
export function addTool(ToolClass) {
    const toolName = ToolClass.toolName;
    const toolAlreadyAdded = state.tools[toolName] !== undefined;
    if (!toolName) {
        throw new Error(`No Tool Found for the ToolClass ${ToolClass.name}`);
    }
    state.tools[toolName] = {
        toolClass: ToolClass,
    };
}
export function hasTool(ToolClass) {
    const toolName = ToolClass.toolName;
    return !!(toolName && state.tools[toolName]);
}
export function hasToolByName(toolName) {
    return !!(toolName && state.tools[toolName]);
}
export function removeTool(ToolClass) {
    const toolName = ToolClass.toolName;
    if (!toolName) {
        throw new Error(`No tool found for: ${ToolClass.name}`);
    }
    if (!state.tools[toolName] !== undefined) {
        delete state.tools[toolName];
    }
    else {
        throw new Error(`${toolName} cannot be removed because it has not been added`);
    }
}
export default addTool;
