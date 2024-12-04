import { CrosshairsTool } from "@/cornerstoneTools/src";
import { ToolButton, toolType } from "../ButtonClass";
import { CrosshairIcon } from "@/Icons/OperatingTool";
import { getSEGService } from "@/service/segService";

export const CrosshairToolButton = new ToolButton({
    label: "开启十字线工具",
    iconComponent: CrosshairIcon,
    toolType: toolType.FunctionTool,
    bindingToolName: CrosshairsTool.toolName,
    functionToolHandler: () => {
        // const segService = getSEGService()
        // const toolGroup = segService.crosshairToolGroup
        // toolGroup.setToolActive(CrosshairsTool.toolName)
        // toolGroup.setToolPassive(CrosshairsTool.toolName)
    }
})