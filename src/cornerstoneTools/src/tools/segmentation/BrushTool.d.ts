import type { Types } from '@cornerstonejs/core';
import type { PublicToolProps, ToolProps, EventTypes, SVGDrawingHelper } from '../../types';
import { BaseTool } from '../base';
import type vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
export type PreviewData = {
    preview: unknown;
    timer?: number;
    timerStart: number;
    startPoint: Types.Point2;
    element: HTMLDivElement;
    isDrag: boolean;
};
declare class BrushTool extends BaseTool {
    static toolName: any;
    private _editData;
    private _hoverData?;
    private _previewData?;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    onSetToolPassive: (evt: any) => void;
    onSetToolEnabled: () => void;
    onSetToolDisabled: (evt: any) => void;
    private disableCursor;
    createEditData(element: any): {
        volumeId: string;
        referencedVolumeId: any;
        segmentsLocked: number[] | [];
        imageId?: undefined;
        override?: undefined;
    } | {
        imageId: string;
        segmentsLocked: number[] | [];
        override: {
            voxelManager: Types.IVoxelManager<number> | Types.IVoxelManager<Types.RGB>;
            imageData: vtkImageData;
        };
        volumeId?: undefined;
        referencedVolumeId?: undefined;
    } | {
        imageId: string;
        segmentsLocked: number[] | [];
        volumeId?: undefined;
        referencedVolumeId?: undefined;
        override?: undefined;
    };
    preMouseDownCallback: (evt: EventTypes.MouseDownActivateEventType) => boolean;
    mouseMoveCallback: (evt: EventTypes.InteractionEventType) => void;
    previewCallback: () => void;
    private createHoverData;
    private getActiveSegmentationData;
    protected updateCursor(evt: EventTypes.InteractionEventType): void;
    private _dragCallback;
    protected getOperationData(element?: any): {
        points: any;
        segmentIndex: number;
        previewColors: any;
        viewPlaneNormal: any;
        toolGroupId: string;
        segmentationId: string;
        viewUp: any;
        strategySpecificConfiguration: any;
        preview: unknown;
        override: {
            voxelManager: Types.IVoxelManager<number>;
            imageData: vtkImageData;
        };
        segmentsLocked: number[];
        imageId?: string;
        imageIds?: string[];
        volumeId?: string;
        referencedVolumeId?: string;
    } | {
        points: any;
        segmentIndex: number;
        previewColors: any;
        viewPlaneNormal: any;
        toolGroupId: string;
        segmentationId: string;
        viewUp: any;
        strategySpecificConfiguration: any;
        preview: unknown;
        volumeId: string;
        referencedVolumeId: any;
        segmentsLocked: number[] | [];
        imageId?: undefined;
        override?: undefined;
    } | {
        points: any;
        segmentIndex: number;
        previewColors: any;
        viewPlaneNormal: any;
        toolGroupId: string;
        segmentationId: string;
        viewUp: any;
        strategySpecificConfiguration: any;
        preview: unknown;
        imageId: string;
        segmentsLocked: number[] | [];
        override: {
            voxelManager: Types.IVoxelManager<number> | Types.IVoxelManager<Types.RGB>;
            imageData: vtkImageData;
        };
        volumeId?: undefined;
        referencedVolumeId?: undefined;
    } | {
        points: any;
        segmentIndex: number;
        previewColors: any;
        viewPlaneNormal: any;
        toolGroupId: string;
        segmentationId: string;
        viewUp: any;
        strategySpecificConfiguration: any;
        preview: unknown;
        imageId: string;
        segmentsLocked: number[] | [];
        volumeId?: undefined;
        referencedVolumeId?: undefined;
        override?: undefined;
    };
    private _calculateCursor;
    private _endCallback;
    rejectPreview(element?: HTMLDivElement): void;
    acceptPreview(element?: HTMLDivElement): void;
    private _activateDraw;
    private _deactivateDraw;
    invalidateBrushCursor(): void;
    renderAnnotation(enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): void;
}
export default BrushTool;
