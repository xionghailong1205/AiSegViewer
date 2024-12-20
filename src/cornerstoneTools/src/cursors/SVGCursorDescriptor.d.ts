import type { SVGCursorDescriptor } from '../types';
declare const CursorSVG: Record<string, SVGCursorDescriptor>;
declare function registerCursor(toolName: string, iconContent: string, viewBox: {
    x: number;
    y: number;
}): void;
declare function getDefinedSVGCursorDescriptor(name: string): SVGCursorDescriptor | undefined;
declare const svgCursorNames: string[];
export { getDefinedSVGCursorDescriptor, registerCursor, svgCursorNames, CursorSVG, };
