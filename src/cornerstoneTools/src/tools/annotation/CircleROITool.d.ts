import { AnnotationTool } from '../base';
import type { Types } from '@cornerstonejs/core';
import type { EventTypes, ToolHandle, PublicToolProps, ToolProps, SVGDrawingHelper, Annotation } from '../../types';
import type { CircleROIAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class CircleROITool extends AnnotationTool {
    static toolName: any;
    _throttledCalculateCachedStats: Function;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: Array<string>;
        handleIndex?: number;
        movingTextBox?: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => CircleROIAnnotation;
    isPointNearTool: (element: HTMLDivElement, annotation: CircleROIAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: CircleROIAnnotation) => void;
    handleSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: CircleROIAnnotation, handle: ToolHandle) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragDrawCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragModifyCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragHandle: (evt: EventTypes.InteractionEventType) => void;
    cancel: (element: HTMLDivElement) => string;
    _activateModify: (element: any) => void;
    _deactivateModify: (element: any) => void;
    _activateDraw: (element: any) => void;
    _deactivateDraw: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _calculateCachedStats: (annotation: any, viewport: any, renderingEngine: any, enabledElement: any) => any;
    _isInsideVolume: (index1: any, index2: any, dimensions: any) => boolean;
}
export default CircleROITool;
