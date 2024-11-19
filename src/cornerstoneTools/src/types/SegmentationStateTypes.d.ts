import type { Types } from '@cornerstonejs/core';
import type * as Enums from '../enums';
import type { ContourSegmentationData } from './ContourTypes';
import type { LabelmapSegmentationData } from './LabelmapTypes';
import type { SurfaceSegmentationData } from './SurfaceTypes';
import type vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import type vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
export type RepresentationsData = {
    [Enums.SegmentationRepresentations.Labelmap]?: LabelmapSegmentationData;
    [Enums.SegmentationRepresentations.Contour]?: ContourSegmentationData;
    [Enums.SegmentationRepresentations.Surface]?: SurfaceSegmentationData;
};
export type RepresentationData = LabelmapSegmentationData | ContourSegmentationData | SurfaceSegmentationData;
export type Segment = {
    segmentIndex: number;
    label: string;
    locked: boolean;
    cachedStats: {
        [key: string]: unknown;
    };
    active: boolean;
};
export type Segmentation = {
    segmentationId: string;
    label: string;
    segments: {
        [segmentIndex: number]: Segment;
    };
    representationData: RepresentationsData;
    cachedStats: {
        [key: string]: unknown;
    };
};
export type LabelmapRenderingConfig = {
    cfun: vtkColorTransferFunction;
    ofun: vtkPiecewiseFunction;
};
export type ContourRenderingConfig = {};
export type SurfaceRenderingConfig = {};
export type RenderingConfig = LabelmapRenderingConfig | ContourRenderingConfig | SurfaceRenderingConfig;
type BaseSegmentationRepresentation = {
    colorLUTIndex: number;
    segmentationId: string;
    type: Enums.SegmentationRepresentations;
    visible: boolean;
    active: boolean;
    segments: {
        [segmentIndex: number]: {
            visible: boolean;
        };
    };
};
export type LabelmapRepresentation = BaseSegmentationRepresentation & {
    config: LabelmapRenderingConfig;
};
export type ContourRepresentation = BaseSegmentationRepresentation & {
    config: ContourRenderingConfig;
};
export type SurfaceRepresentation = BaseSegmentationRepresentation & {
    config: SurfaceRenderingConfig;
};
export type SegmentationRepresentation = LabelmapRepresentation | ContourRepresentation | SurfaceRepresentation;
export type SegmentationState = {
    colorLUT: Types.ColorLUT[];
    segmentations: Segmentation[];
    viewportSegRepresentations: {
        [viewportId: string]: Array<SegmentationRepresentation>;
    };
};
export type SegmentationPublicInput = {
    segmentationId: string;
    representation: {
        type: Enums.SegmentationRepresentations;
        data?: RepresentationData;
    };
    config?: {
        segments?: {
            [segmentIndex: number]: Partial<Segment>;
        };
        label?: string;
        cachedStats?: {
            [key: string]: unknown;
        };
    };
};
export type RepresentationPublicInput = {
    segmentationId: string;
    type?: Enums.SegmentationRepresentations;
    config?: {
        colorLUTOrIndex?: Types.ColorLUT[] | number;
    };
};
export {};
