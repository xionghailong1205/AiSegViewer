import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import type { EventTypes, ToolHandle, PublicToolProps, ToolProps, SVGDrawingHelper, Annotation } from '../../types';
import type { ProbeAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class ProbeTool extends AnnotationTool {
    static toolName: any;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: string[];
        newAnnotation?: boolean;
    } | null;
    eventDispatchDetail: {
        viewportId: string;
        renderingEngineId: string;
    };
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    isPointNearTool(): boolean;
    toolSelectedCallback(): void;
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => ProbeAnnotation;
    getHandleNearImagePoint(element: HTMLDivElement, annotation: ProbeAnnotation, canvasCoords: Types.Point2, proximity: number): ToolHandle | undefined;
    handleSelectedCallback(evt: EventTypes.InteractionEventType, annotation: ProbeAnnotation): void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragCallback: (evt: any) => void;
    cancel: (element: HTMLDivElement) => string;
    _activateModify: (element: any) => void;
    _deactivateModify: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _calculateCachedStats(annotation: any, renderingEngine: any, enabledElement: any): any;
}
export default ProbeTool;
