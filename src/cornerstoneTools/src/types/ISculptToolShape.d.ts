import type { Types } from '@cornerstonejs/core';
import type { SVGDrawingHelper, EventTypes, ContourAnnotation } from '.';
import type { PushedHandles } from '../tools/SculptorTool/CircleSculptCursor';
import type { SculptData } from '../tools/SculptorTool';
export interface ISculptToolShape {
    renderShape(svgDrawingHelper: SVGDrawingHelper, canvasLocation: Types.Point2, options: any): void;
    pushHandles(viewport: Types.IViewport, sculptData: SculptData): PushedHandles;
    configureToolSize(evt: EventTypes.InteractionEventType): void;
    updateToolSize(canvasCoords: Types.Point2, viewport: Types.IViewport, activeAnnotation: ContourAnnotation): void;
    getMaxSpacing(minSpacing: number): number;
    getInsertPosition(previousIndex: number, nextIndex: number, sculptData: SculptData): Types.Point3;
}
