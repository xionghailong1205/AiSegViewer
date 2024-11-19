import type { Types } from '@cornerstonejs/core';
import { BaseTool } from '../base';
import type { PublicToolProps, ToolProps, EventTypes, SVGDrawingHelper, Annotation } from '../../types';
declare class CircleScissorsTool extends BaseTool {
    static toolName: any;
    editData: {
        annotation: Annotation;
        segmentIndex: number;
        segmentationId: string;
        volumeId: string;
        referencedVolumeId: string;
        segmentsLocked: number[];
        segmentColor: [number, number, number, number];
        viewportIdsToRender: string[];
        handleIndex?: number;
        movingTextBox: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
        imageId: string;
        centerCanvas?: Array<number>;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    preMouseDownCallback: (evt: EventTypes.InteractionEventType) => boolean;
    _dragCallback: (evt: EventTypes.InteractionEventType) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _activateDraw: (element: any) => void;
    _deactivateDraw: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
}
export default CircleScissorsTool;
