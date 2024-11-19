import type { Types } from '@cornerstonejs/core';
import type { LabelmapToolOperationData } from '../../../types';
type OperationData = LabelmapToolOperationData & {
    points: [Types.Point3, Types.Point3, Types.Point3, Types.Point3];
};
export declare function fillInsideRectangle(enabledElement: Types.IEnabledElement, operationData: OperationData): void;
export declare function fillOutsideRectangle(enabledElement: Types.IEnabledElement, operationData: OperationData): void;
export {};