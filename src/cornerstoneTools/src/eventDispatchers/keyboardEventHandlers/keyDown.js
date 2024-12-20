import getActiveToolForKeyboardEvent from '../shared/getActiveToolForKeyboardEvent';
import getToolsWithActionsForKeyboardEvent from '../shared/getToolsWithActionsForKeyboardEvents';
import ToolModes from '../../enums/ToolModes';
import { getToolGroupForViewport } from '../../store/ToolGroupManager';
export default function keyDown(evt) {
    const activeTool = getActiveToolForKeyboardEvent(evt);
    if (activeTool) {
        const { renderingEngineId, viewportId } = evt.detail;
        const toolGroup = getToolGroupForViewport(viewportId, renderingEngineId);
        const toolName = activeTool.getToolName();
        if (Object.keys(toolGroup.toolOptions).includes(toolName)) {
            toolGroup.setViewportsCursorByToolName(toolName);
        }
    }
    const activeToolsWithEventBinding = getToolsWithActionsForKeyboardEvent(evt, [
        ToolModes.Active,
    ]);
    if (activeToolsWithEventBinding?.size) {
        const { element } = evt.detail;
        for (const [key, value] of [...activeToolsWithEventBinding.entries()]) {
            const method = typeof value.method === 'function' ? value.method : key[value.method];
            method.call(key, element, value, evt);
        }
    }
}
