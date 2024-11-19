import type { Types } from '@cornerstonejs/core';
import type { LabelmapSegmentationDataStack, LabelmapSegmentationDataVolume } from './LabelmapTypes';
import type vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
type LabelmapToolOperationData = {
    segmentationId: string;
    segmentIndex: number;
    previewColors?: Record<number, [number, number, number, number]>;
    segmentsLocked: number[];
    viewPlaneNormal: number[];
    viewUp: number[];
    strategySpecificConfiguration: any;
    points: Types.Point3[];
    voxelManager: any;
    override: {
        voxelManager: Types.IVoxelManager<number>;
        imageData: vtkImageData;
    };
    preview: any;
    toolGroupId: string;
};
type LabelmapToolOperationDataStack = LabelmapToolOperationData & LabelmapSegmentationDataStack;
type LabelmapToolOperationDataVolume = LabelmapToolOperationData & LabelmapSegmentationDataVolume;
type LabelmapToolOperationDataAny = LabelmapToolOperationDataVolume | LabelmapToolOperationDataStack;
export type { LabelmapToolOperationData, LabelmapToolOperationDataAny, LabelmapToolOperationDataStack, LabelmapToolOperationDataVolume, };
