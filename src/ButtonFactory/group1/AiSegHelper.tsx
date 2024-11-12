import { ToolButton, toolType } from "../ButtonClass";
import Rectangle from "@/Icons/AnnotationTool/Rectangle";

import { RectangleROITool } from "@cornerstonejs/tools";

export const AiSegHelperButton = new ToolButton({
    label: "AI分割工具",
    iconComponent: Rectangle,
    toolType: toolType.OperatingTool,
    bindingToolName: RectangleROITool.toolName
})
