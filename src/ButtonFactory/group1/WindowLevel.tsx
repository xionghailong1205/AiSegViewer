import { WindowLevelTool } from "@/cornerstoneTools/src";
import { WindowLevelTool as Icon } from "@/Icons/WindowLevelTool";
import { ToolButton, toolType } from "../ButtonClass";

export const WindowLevelToolButton = new ToolButton({
    label: "窗宽窗位调整工具",
    iconComponent: Icon,
    toolType: toolType.OperatingTool,
    bindingToolName: WindowLevelTool.toolName
})