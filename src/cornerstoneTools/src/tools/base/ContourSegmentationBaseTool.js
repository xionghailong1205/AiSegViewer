import { getEnabledElement, utilities } from '@cornerstonejs/core';
import { getSegmentation } from '../../stateManagement/segmentation/getSegmentation';
import { SegmentationRepresentations } from '../../enums';
import ContourBaseTool from './ContourBaseTool';
import { triggerSegmentationDataModified } from '../../stateManagement/segmentation/triggerSegmentationEvents';
import InterpolationManager from '../../utilities/segmentation/InterpolationManager/InterpolationManager';
import { addContourSegmentationAnnotation, removeContourSegmentationAnnotation, } from '../../utilities/contourSegmentation';
import { triggerAnnotationRenderForToolGroupIds } from '../../utilities/triggerAnnotationRenderForToolGroupIds';
import { getToolGroupForViewport } from '../../store/ToolGroupManager';
import { getSegmentIndexColor } from '../../stateManagement/segmentation/config/segmentationColor';
import { getSegmentationRepresentations } from '../../stateManagement/segmentation/getSegmentationRepresentation';
import { getActiveSegmentation } from '../../stateManagement/segmentation/getActiveSegmentation';
import { getSegmentationRepresentationVisibility } from '../../stateManagement/segmentation/getSegmentationRepresentationVisibility';
import { getViewportIdsWithSegmentation } from '../../stateManagement/segmentation/getViewportIdsWithSegmentation';
import { getActiveSegmentIndex } from '../../stateManagement/segmentation/getActiveSegmentIndex';
import { getLockedSegmentIndices } from '../../stateManagement/segmentation/segmentLocking';
import { segmentationStyle } from '../../stateManagement/segmentation/SegmentationStyle';
import { internalGetHiddenSegmentIndices } from '../../stateManagement/segmentation/helpers/internalGetHiddenSegmentIndices';
class ContourSegmentationBaseTool extends ContourBaseTool {
    constructor(toolProps, defaultToolProps) {
        super(toolProps, defaultToolProps);
        if (this.configuration.interpolation?.enabled) {
            InterpolationManager.addTool(this.getToolName());
        }
    }
    isContourSegmentationTool() {
        return true;
    }
    createAnnotation(evt) {
        const eventDetail = evt.detail;
        const { element } = eventDetail;
        const enabledElement = getEnabledElement(element);
        if (!enabledElement) {
            return;
        }
        const { viewport } = enabledElement;
        const contourAnnotation = super.createAnnotation(evt);
        if (!this.isContourSegmentationTool()) {
            return contourAnnotation;
        }
        const activeSeg = getActiveSegmentation(viewport.id);
        if (!activeSeg) {
            throw new Error('No active segmentation detected, create one before using scissors tool');
        }
        if (!activeSeg.representationData.Contour) {
            throw new Error(`A contour segmentation must be active`);
        }
        const { segmentationId } = activeSeg;
        const segmentIndex = getActiveSegmentIndex(segmentationId);
        return utilities.deepMerge(contourAnnotation, {
            data: {
                segmentation: {
                    segmentationId,
                    segmentIndex,
                },
            },
        });
    }
    addAnnotation(annotation, element) {
        const annotationUID = super.addAnnotation(annotation, element);
        if (this.isContourSegmentationTool()) {
            const contourSegAnnotation = annotation;
            addContourSegmentationAnnotation(contourSegAnnotation);
        }
        return annotationUID;
    }
    cancelAnnotation(annotation) {
        if (this.isContourSegmentationTool()) {
            removeContourSegmentationAnnotation(annotation);
        }
        super.cancelAnnotation(annotation);
    }
    getAnnotationStyle(context) {
        const annotationStyle = super.getAnnotationStyle(context);
        if (!this.isContourSegmentationTool()) {
            return annotationStyle;
        }
        const contourSegmentationStyle = this._getContourSegmentationStyle(context);
        return utilities.deepMerge(annotationStyle, contourSegmentationStyle);
    }
    renderAnnotationInstance(renderContext) {
        const { annotation } = renderContext;
        const { invalidated } = annotation;
        const renderResult = super.renderAnnotationInstance(renderContext);
        if (invalidated && this.isContourSegmentationTool()) {
            const { segmentationId } = (annotation).data.segmentation;
            triggerSegmentationDataModified(segmentationId);
            const viewportIds = getViewportIdsWithSegmentation(segmentationId);
            const toolGroupIds = viewportIds.map((viewportId) => {
                const toolGroup = getToolGroupForViewport(viewportId);
                return toolGroup.id;
            });
            triggerAnnotationRenderForToolGroupIds(toolGroupIds);
        }
        return renderResult;
    }
    _getContourSegmentationStyle(context) {
        const annotation = context.annotation;
        const { segmentationId, segmentIndex } = annotation.data.segmentation;
        const { viewportId } = context.styleSpecifier;
        const segmentationRepresentations = getSegmentationRepresentations(viewportId, { segmentationId });
        if (!segmentationRepresentations?.length) {
            return {};
        }
        let segmentationRepresentation;
        if (segmentationRepresentations.length > 1) {
            segmentationRepresentation = segmentationRepresentations.find((rep) => rep.segmentationId === segmentationId &&
                rep.type === SegmentationRepresentations.Contour);
        }
        else {
            segmentationRepresentation = segmentationRepresentations[0];
        }
        const { autoGenerated } = annotation;
        const segmentsLocked = getLockedSegmentIndices(segmentationId);
        const annotationLocked = segmentsLocked.includes(segmentIndex);
        const segmentColor = getSegmentIndexColor(context.styleSpecifier.viewportId, segmentationId, segmentIndex);
        const segmentationVisible = getSegmentationRepresentationVisibility(viewportId, {
            segmentationId,
            type: SegmentationRepresentations.Contour,
        });
        const activeSegmentation = getActiveSegmentation(viewportId);
        const isActive = activeSegmentation?.segmentationId === segmentationId;
        const style = segmentationStyle.getStyle({
            viewportId,
            segmentationId,
            type: SegmentationRepresentations.Contour,
            segmentIndex,
        });
        const mergedConfig = style;
        let lineWidth = 1;
        let lineDash = undefined;
        let lineOpacity = 1;
        let fillOpacity = 0;
        if (autoGenerated) {
            lineWidth = mergedConfig.outlineWidthAutoGenerated ?? lineWidth;
            lineDash = mergedConfig.outlineDashAutoGenerated ?? lineDash;
            lineOpacity = mergedConfig.outlineOpacity ?? lineOpacity;
            fillOpacity = mergedConfig.fillAlphaAutoGenerated ?? fillOpacity;
        }
        else if (isActive) {
            lineWidth = mergedConfig.outlineWidth ?? lineWidth;
            lineDash = mergedConfig.outlineDash ?? lineDash;
            lineOpacity = mergedConfig.outlineOpacity ?? lineOpacity;
            fillOpacity = mergedConfig.fillAlpha ?? fillOpacity;
        }
        else {
            lineWidth = mergedConfig.outlineWidthInactive ?? lineWidth;
            lineDash = mergedConfig.outlineDashInactive ?? lineDash;
            lineOpacity = mergedConfig.outlineOpacityInactive ?? lineOpacity;
            fillOpacity = mergedConfig.fillAlphaInactive ?? fillOpacity;
        }
        if (getActiveSegmentIndex(segmentationId) === segmentIndex) {
            lineWidth += mergedConfig.activeSegmentOutlineWidthDelta;
        }
        lineWidth = mergedConfig.renderOutline ? lineWidth : 0;
        fillOpacity = mergedConfig.renderFill ? fillOpacity : 0;
        const color = `rgba(${segmentColor[0]}, ${segmentColor[1]}, ${segmentColor[2]}, ${lineOpacity})`;
        const fillColor = `rgb(${segmentColor[0]}, ${segmentColor[1]}, ${segmentColor[2]})`;
        const hiddenSegments = internalGetHiddenSegmentIndices(viewportId, {
            segmentationId,
            type: SegmentationRepresentations.Contour,
        });
        const isVisible = !hiddenSegments.has(segmentIndex);
        return {
            color,
            fillColor,
            lineWidth,
            fillOpacity,
            lineDash,
            textbox: {
                color,
            },
            visibility: segmentationVisible && isVisible,
            locked: annotationLocked,
        };
    }
}
export { ContourSegmentationBaseTool as default, ContourSegmentationBaseTool };
