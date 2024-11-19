import { getEnabledElement } from '@cornerstonejs/core';
import { distancePointToContour } from '../distancePointToContour';
import { drawCircle as drawCircleSvg } from '../../drawingSvg';
import { point } from '../../utilities/math';
class CircleSculptCursor {
    constructor() {
        this.toolInfo = {
            toolSize: null,
            maxToolSize: null,
        };
    }
    static { this.shapeName = 'Circle'; }
    renderShape(svgDrawingHelper, canvasLocation, options) {
        const circleUID = '0';
        drawCircleSvg(svgDrawingHelper, 'SculptorTool', circleUID, canvasLocation, this.toolInfo.toolSize, options);
    }
    pushHandles(viewport, sculptData) {
        const { points, mouseCanvasPoint } = sculptData;
        const pushedHandles = { first: undefined, last: undefined };
        for (let i = 0; i < points.length; i++) {
            const handleCanvasPoint = viewport.worldToCanvas(points[i]);
            const distanceToHandle = point.distanceToPoint(handleCanvasPoint, mouseCanvasPoint);
            if (distanceToHandle > this.toolInfo.toolSize) {
                continue;
            }
            this.pushOneHandle(i, distanceToHandle, sculptData);
            if (pushedHandles.first === undefined) {
                pushedHandles.first = i;
                pushedHandles.last = i;
            }
            else {
                pushedHandles.last = i;
            }
        }
        return pushedHandles;
    }
    configureToolSize(evt) {
        const toolInfo = this.toolInfo;
        if (toolInfo.toolSize && toolInfo.maxToolSize) {
            return;
        }
        const eventData = evt.detail;
        const element = eventData.element;
        const minDim = Math.min(element.clientWidth, element.clientHeight);
        const maxRadius = minDim / 12;
        toolInfo.toolSize = maxRadius;
        toolInfo.maxToolSize = maxRadius;
    }
    updateToolSize(canvasCoords, viewport, activeAnnotation) {
        const toolInfo = this.toolInfo;
        const radius = distancePointToContour(viewport, activeAnnotation, canvasCoords);
        if (radius > 0) {
            toolInfo.toolSize = Math.min(toolInfo.maxToolSize, radius);
        }
    }
    getMaxSpacing(minSpacing) {
        return Math.max(this.toolInfo.toolSize / 4, minSpacing);
    }
    getInsertPosition(previousIndex, nextIndex, sculptData) {
        let insertPosition;
        const { points, element, mouseCanvasPoint } = sculptData;
        const toolSize = this.toolInfo.toolSize;
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const previousCanvasPoint = viewport.worldToCanvas(points[previousIndex]);
        const nextCanvasPoint = viewport.worldToCanvas(points[nextIndex]);
        const midPoint = [
            (previousCanvasPoint[0] + nextCanvasPoint[0]) / 2.0,
            (previousCanvasPoint[1] + nextCanvasPoint[1]) / 2.0,
        ];
        const distanceToMidPoint = point.distanceToPoint(mouseCanvasPoint, midPoint);
        if (distanceToMidPoint < toolSize) {
            const directionUnitVector = {
                x: (midPoint[0] - mouseCanvasPoint[0]) / distanceToMidPoint,
                y: (midPoint[1] - mouseCanvasPoint[1]) / distanceToMidPoint,
            };
            insertPosition = [
                mouseCanvasPoint[0] + toolSize * directionUnitVector.x,
                mouseCanvasPoint[1] + toolSize * directionUnitVector.y,
            ];
        }
        else {
            insertPosition = midPoint;
        }
        const worldPosition = viewport.canvasToWorld(insertPosition);
        return worldPosition;
    }
    pushOneHandle(i, distanceToHandle, sculptData) {
        const { points, mousePoint } = sculptData;
        const toolSize = this.toolInfo.toolSize;
        const handle = points[i];
        const directionUnitVector = {
            x: (handle[0] - mousePoint[0]) / distanceToHandle,
            y: (handle[1] - mousePoint[1]) / distanceToHandle,
            z: (handle[2] - mousePoint[2]) / distanceToHandle,
        };
        const position = {
            x: mousePoint[0] + toolSize * directionUnitVector.x,
            y: mousePoint[1] + toolSize * directionUnitVector.y,
            z: mousePoint[2] + toolSize * directionUnitVector.z,
        };
        handle[0] = position.x;
        handle[1] = position.y;
        handle[2] = position.z;
    }
}
export default CircleSculptCursor;
