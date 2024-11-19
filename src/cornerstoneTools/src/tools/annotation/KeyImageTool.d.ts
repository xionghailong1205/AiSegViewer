import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import type { EventTypes, ToolHandle, PublicToolProps, ToolProps, SVGDrawingHelper } from '../../types';
import type { Annotation } from '../../types';
declare class KeyImageTool extends AnnotationTool {
    static toolName: any;
    _throttledCalculateCachedStats: Function;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: string[];
        handleIndex?: number;
        movingTextBox?: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => Annotation;
    cancel(): void;
    isPointNearTool: (element: HTMLDivElement, annotation: Annotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: Annotation) => void;
    handleSelectedCallback(evt: EventTypes.InteractionEventType, annotation: Annotation, handle: ToolHandle): void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    doubleClickCallback: (evt: EventTypes.TouchTapEventType) => void;
    _doneChangingTextCallback(element: any, annotation: any, updatedText: any): void;
    _activateModify: (element: HTMLDivElement) => void;
    _deactivateModify: (element: HTMLDivElement) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _isInsideVolume(index1: any, index2: any, dimensions: any): boolean;
}
export default KeyImageTool;
