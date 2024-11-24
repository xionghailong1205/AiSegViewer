// import { setToolActiveOnPrimaryMouseButton } from "@/Actions/toolGroupAction";
import { SvgProp } from "./Types";

export enum toolType {
  MeasurementTool,
  OperatingTool,
  FunctionTool,
}

interface ButtonConstructorProp {
  label: string;
  iconComponent: (props: SvgProp) => JSX.Element;
  bindingToolName: string;
  toolType: toolType;
  functionToolHandler?: Function;
}

export class ToolButton {
  toolType: toolType;
  label: string;
  // 这里的 bindingTool 就是 toolName
  bindingTool: string;
  functionToolHandler?: Function;

  iconComponent: (props: SvgProp) => JSX.Element;

  clickhandler() {
    switch (this.toolType) {
      case toolType.MeasurementTool: {
        // setToolActiveOnPrimaryMouseButton(this.bindingTool);
        alert("之后设计逻辑");
        break;
      }
      case toolType.OperatingTool: {
        console.log("代码执行");
        // setToolActiveOnPrimaryMouseButton(this.bindingTool);
        // alert("之后设计逻辑");
        break;
      }
      case toolType.FunctionTool: {
        if (this.functionToolHandler) {
          this.functionToolHandler();
        } else {
          alert("尚未实现功能按钮对应的功能, 请检查 Function Button 文件夹.");
        }
        break;
      }
    }
  }

  constructor(initProp: ButtonConstructorProp) {
    this.label = initProp.label;
    this.bindingTool = initProp.bindingToolName;
    this.toolType = initProp.toolType;
    this.iconComponent = initProp.iconComponent;
    const functionToolHandler = initProp.functionToolHandler;
    if (functionToolHandler) {
      this.functionToolHandler = functionToolHandler;
    }
  }
}
