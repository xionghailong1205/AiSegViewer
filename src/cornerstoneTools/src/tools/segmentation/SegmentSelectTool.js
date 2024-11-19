import { getEnabledElement } from '@cornerstonejs/core';
import { BaseTool } from '../base';
import { triggerSegmentationModified } from '../../stateManagement/segmentation/triggerSegmentationEvents';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { getActiveSegmentation } from '../../stateManagement/segmentation/activeSegmentation';
import RepresentationTypes from '../../enums/SegmentationRepresentations';
import { setActiveSegmentIndex } from '../../stateManagement/segmentation/segmentIndex';
import { getHoveredContourSegmentationAnnotation, getSegmentIndexAtLabelmapBorder, getSegmentIndexAtWorldPoint, } from '../../utilities/segmentation';
import { state } from '../../store/state';
import SegmentationRepresentations from '../../enums/SegmentationRepresentations';
class SegmentSelectTool extends BaseTool {
    static { this.SelectMode = {
        Inside: 'Inside',
        Border: 'Border',
    }; }
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            hoverTimeout: 100,
            mode: SegmentSelectTool.SelectMode.Border,
            searchRadius: 6,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.mouseMoveCallback = (evt) => {
            if (this.hoverTimer) {
                clearTimeout(this.hoverTimer);
            }
            this.hoverTimer = setTimeout(() => {
                this._setActiveSegment(evt);
                this.hoverTimer = null;
            }, this.configuration.hoverTimeout);
            return true;
        };
        this.onSetToolEnabled = () => {
            this.onSetToolActive();
        };
        this.onSetToolActive = () => {
            this.hoverTimer = null;
        };
        this.onSetToolDisabled = () => {
            this.hoverTimer = null;
        };
        this.hoverTimer = null;
    }
    _setActiveSegment(evt = {}) {
        if (state.isInteractingWithTool) {
            return;
        }
        const { element, currentPoints } = evt.detail;
        const worldPoint = currentPoints.world;
        const enabledElement = getEnabledElement(element);
        if (!enabledElement) {
            return;
        }
        const { viewport } = enabledElement;
        const activeSegmentation = getActiveSegmentation(viewport.id);
        if (!activeSegmentation) {
            return;
        }
        this._setActiveSegmentForType(activeSegmentation, worldPoint, viewport);
    }
    _setActiveSegmentForType(activeSegmentation, worldPoint, viewport) {
        const imageDataInfo = viewport.getImageData();
        if (!imageDataInfo) {
            return;
        }
        const { segmentationId, representationData } = activeSegmentation;
        let hoveredSegmentIndex;
        if (this.configuration.mode === SegmentSelectTool.SelectMode.Inside) {
            hoveredSegmentIndex = getSegmentIndexAtWorldPoint(segmentationId, worldPoint, {
                viewport,
            });
        }
        else {
            if (representationData.Labelmap) {
                hoveredSegmentIndex = getSegmentIndexAtLabelmapBorder(segmentationId, worldPoint, {
                    viewport,
                    searchRadius: this.configuration.searchRadius,
                });
            }
            else if (representationData.Contour) {
                hoveredSegmentIndex =
                    getHoveredContourSegmentationAnnotation(segmentationId);
            }
            else if (representationData.Surface) {
            }
        }
        if (!hoveredSegmentIndex || hoveredSegmentIndex === 0) {
            return;
        }
        setActiveSegmentIndex(segmentationId, hoveredSegmentIndex);
        const renderingEngine = viewport.getRenderingEngine();
        const viewportIds = renderingEngine.getViewports().map((v) => v.id);
        triggerSegmentationModified(segmentationId);
        triggerAnnotationRenderForViewportIds(viewportIds);
    }
}
SegmentSelectTool.toolName = 'SegmentSelectTool';
export default SegmentSelectTool;
