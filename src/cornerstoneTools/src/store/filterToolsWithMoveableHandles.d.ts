import type { Types } from '@cornerstonejs/core';
import type { ToolAnnotationsPair, ToolsWithMoveableHandles } from '../types/InternalToolTypes';
export default function filterToolsWithMoveableHandles(element: HTMLDivElement, ToolAndAnnotations: ToolAnnotationsPair[], canvasCoords: Types.Point2, interactionType?: string): ToolsWithMoveableHandles[];
