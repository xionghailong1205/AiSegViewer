import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import type { EventTypes, ToolHandle, PublicToolProps, ToolProps, SVGDrawingHelper, Annotation } from '../../types';
import type { LengthAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class LengthTool extends AnnotationTool {
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
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => LengthAnnotation;
    isPointNearTool: (element: HTMLDivElement, annotation: LengthAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: LengthAnnotation) => void;
    handleSelectedCallback(evt: EventTypes.InteractionEventType, annotation: LengthAnnotation, handle: ToolHandle): void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragCallback: (evt: EventTypes.InteractionEventType) => void;
    cancel: (element: HTMLDivElement) => string;
    _activateModify: (element: HTMLDivElement) => void;
    _deactivateModify: (element: HTMLDivElement) => void;
    _activateDraw: (element: HTMLDivElement) => void;
    _deactivateDraw: (element: HTMLDivElement) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _calculateLength(pos1: any, pos2: any): number;
    _calculateCachedStats(annotation: any, renderingEngine: any, enabledElement: any): any;
    _isInsideVolume(index1: any, index2: any, dimensions: any): boolean;
}
export default LengthTool;
