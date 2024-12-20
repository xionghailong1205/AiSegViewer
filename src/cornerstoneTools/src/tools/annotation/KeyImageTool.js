import { Events } from '../../enums';
import { getEnabledElement, utilities as csUtils } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import { addAnnotation, getAnnotations, removeAnnotation, } from '../../stateManagement/annotation/annotationState';
import { triggerAnnotationCompleted, triggerAnnotationModified, } from '../../stateManagement/annotation/helpers/state';
import { drawArrow as drawArrowSvg } from '../../drawingSvg';
import { state } from '../../store/state';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { resetElementCursor } from '../../cursors/elementCursor';
class KeyImageTool extends AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            getTextCallback,
            changeTextCallback,
            canvasPosition: [10, 10],
            canvasSize: 10,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.addNewAnnotation = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = getEnabledElement(element);
            const { viewport, renderingEngine } = enabledElement;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const referencedImageId = this.getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp);
            const annotation = KeyImageTool.createAnnotation({
                metadata: { ...viewport.getViewReference(), referencedImageId },
            });
            addAnnotation(annotation, element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            this.configuration.getTextCallback((text) => {
                if (!text) {
                    removeAnnotation(annotation.annotationUID);
                    triggerAnnotationRenderForViewportIds(viewportIdsToRender);
                    this.isDrawing = false;
                    return;
                }
                annotation.data.text = text;
                triggerAnnotationCompleted(annotation);
                triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            });
            return annotation;
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            const { data } = annotation;
            const { canvasPosition, canvasSize } = this.configuration;
            if (!canvasPosition?.length) {
                return false;
            }
            if (Math.abs(canvasCoords[0] - canvasPosition[0] + canvasSize / 2) <=
                canvasSize / 2 &&
                Math.abs(canvasCoords[1] - canvasPosition[1] + canvasSize / 2) <=
                    canvasSize / 2) {
                return true;
            }
            return false;
        };
        this.toolSelectedCallback = (evt, annotation) => {
            annotation.highlighted = true;
            evt.preventDefault();
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            this._deactivateModify(element);
            resetElementCursor(element);
        };
        this.doubleClickCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            let annotations = getAnnotations(this.getToolName(), element);
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!annotations?.length) {
                return;
            }
            const clickedAnnotation = annotations.find((annotation) => this.isPointNearTool(element, annotation, eventDetail.currentPoints.canvas, 6));
            if (!clickedAnnotation) {
                return;
            }
            const annotation = clickedAnnotation;
            this.configuration.changeTextCallback(clickedAnnotation, evt.detail, this._doneChangingTextCallback.bind(this, element, annotation));
            this.isDrawing = false;
            evt.stopImmediatePropagation();
            evt.preventDefault();
        };
        this._activateModify = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
        };
        this._deactivateModify = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport } = enabledElement;
            const { element } = viewport;
            let annotations = getAnnotations(this.getToolName(), element);
            if (!annotations?.length) {
                return renderStatus;
            }
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!annotations?.length) {
                return renderStatus;
            }
            const styleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
            };
            for (let i = 0; i < annotations.length; i++) {
                const annotation = annotations[i];
                const { annotationUID } = annotation;
                styleSpecifier.annotationUID = annotationUID;
                const { color } = this.getAnnotationStyle({
                    annotation,
                    styleSpecifier,
                });
                const { canvasPosition, canvasSize } = this.configuration;
                if (canvasPosition?.length) {
                    const arrowUID = '1';
                    drawArrowSvg(svgDrawingHelper, annotationUID, arrowUID, canvasPosition.map((it) => it + canvasSize), canvasPosition, {
                        color,
                        width: 1,
                    });
                }
                renderStatus = true;
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return renderStatus;
                }
            }
            return renderStatus;
        };
    }
    cancel() {
    }
    handleSelectedCallback(evt, annotation, handle) {
    }
    _doneChangingTextCallback(element, annotation, updatedText) {
        annotation.data.text = updatedText;
        const enabledElement = getEnabledElement(element);
        const { renderingEngine } = enabledElement;
        const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
        triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        triggerAnnotationModified(annotation, element);
    }
    _isInsideVolume(index1, index2, dimensions) {
        return (csUtils.indexWithinDimensions(index1, dimensions) &&
            csUtils.indexWithinDimensions(index2, dimensions));
    }
}
function getTextCallback(doneChangingTextCallback) {
    return doneChangingTextCallback(prompt('Enter your annotation:'));
}
function changeTextCallback(data, eventData, doneChangingTextCallback) {
    return doneChangingTextCallback(prompt('Enter your annotation:'));
}
KeyImageTool.toolName = 'KeyImage';
export default KeyImageTool;
