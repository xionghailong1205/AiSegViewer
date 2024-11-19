import { BaseTool } from './base';
import { getAnnotations, removeAnnotation, } from '../stateManagement/annotation/annotationState';
import { setAnnotationSelected } from '../stateManagement/annotation/annotationSelection';
import { getToolGroupForViewport } from '../store/ToolGroupManager';
class AnnotationEraserTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
    }) {
        super(toolProps, defaultToolProps);
        this.preMouseDownCallback = (evt) => {
            return this._deleteNearbyAnnotations(evt, 'mouse');
        };
        this.preTouchStartCallback = (evt) => {
            return this._deleteNearbyAnnotations(evt, 'touch');
        };
    }
    _deleteNearbyAnnotations(evt, interactionType) {
        const { renderingEngineId, viewportId, element, currentPoints } = evt.detail;
        const toolGroup = getToolGroupForViewport(viewportId, renderingEngineId);
        if (!toolGroup) {
            return false;
        }
        const tools = toolGroup._toolInstances;
        const annotationsToRemove = [];
        for (const toolName in tools) {
            const toolInstance = tools[toolName];
            if (typeof toolInstance.isPointNearTool !== 'function' ||
                typeof toolInstance.filterInteractableAnnotationsForElement !==
                    'function') {
                continue;
            }
            const annotations = getAnnotations(toolName, element);
            if (!annotations.length) {
                continue;
            }
            const interactableAnnotations = toolInstance.filterInteractableAnnotationsForElement(element, annotations) || [];
            for (const annotation of interactableAnnotations) {
                if (toolInstance.isPointNearTool(element, annotation, currentPoints.canvas, 10, interactionType)) {
                    annotationsToRemove.push(annotation.annotationUID);
                }
            }
        }
        for (const annotationUID of annotationsToRemove) {
            setAnnotationSelected(annotationUID);
            removeAnnotation(annotationUID);
        }
        evt.preventDefault();
        return true;
    }
}
AnnotationEraserTool.toolName = 'Eraser';
export default AnnotationEraserTool;
