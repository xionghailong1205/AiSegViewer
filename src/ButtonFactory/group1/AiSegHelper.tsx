import { ToolButton, toolType } from "../ButtonClass";
import Rectangle from "@/Icons/AnnotationTool/Rectangle";
import RectangleToolForAISeg from "@/cornerstoneTools/RectangleToolForAISeg";

export const AiSegHelperButton = new ToolButton({
    label: "AI分割工具",
    iconComponent: Rectangle,
    toolType: toolType.OperatingTool,
    bindingToolName: RectangleToolForAISeg.toolName
})
