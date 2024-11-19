import { triggerEvent, eventTarget, Enums, getRenderingEngines, getEnabledElementByViewportId, } from '@cornerstonejs/core';
import { SegmentationRepresentations, Events as csToolsEvents, } from '../../enums';
import Representations from '../../enums/SegmentationRepresentations';
import { getSegmentationRepresentations } from './getSegmentationRepresentation';
import surfaceDisplay from '../../tools/displayTools/Surface/surfaceDisplay';
import contourDisplay from '../../tools/displayTools/Contour/contourDisplay';
import labelmapDisplay from '../../tools/displayTools/Labelmap/labelmapDisplay';
import { addTool } from '../../store/addTool';
import { state } from '../../store/state';
import PlanarFreehandContourSegmentationTool from '../../tools/annotation/PlanarFreehandContourSegmentationTool';
import { getToolGroupForViewport } from '../../store/ToolGroupManager';
const renderers = {
    [Representations.Labelmap]: labelmapDisplay,
    [Representations.Contour]: contourDisplay,
    [Representations.Surface]: surfaceDisplay,
};
const planarContourToolName = PlanarFreehandContourSegmentationTool.toolName;
class SegmentationRenderingEngine {
    constructor() {
        this._needsRender = new Set();
        this._animationFrameSet = false;
        this._animationFrameHandle = null;
        this._getAllViewports = () => {
            const renderingEngine = getRenderingEngines();
            return renderingEngine.flatMap((renderingEngine) => renderingEngine.getViewports());
        };
        this._renderFlaggedSegmentations = () => {
            this._throwIfDestroyed();
            const viewportIds = Array.from(this._needsRender);
            viewportIds.forEach((viewportId) => {
                this._triggerRender(viewportId);
            });
            this._needsRender.clear();
            this._animationFrameSet = false;
            this._animationFrameHandle = null;
        };
    }
    renderSegmentationsForViewport(viewportId) {
        const viewportIds = viewportId
            ? [viewportId]
            : this._getViewportIdsForSegmentation();
        this._setViewportsToBeRenderedNextFrame(viewportIds);
    }
    renderSegmentation(segmentationId) {
        const viewportIds = this._getViewportIdsForSegmentation(segmentationId);
        this._setViewportsToBeRenderedNextFrame(viewportIds);
    }
    _getViewportIdsForSegmentation(segmentationId) {
        const viewports = this._getAllViewports();
        const viewportIds = [];
        for (const viewport of viewports) {
            const viewportId = viewport.id;
            if (segmentationId) {
                const segmentationRepresentations = getSegmentationRepresentations(viewportId, { segmentationId });
                if (segmentationRepresentations?.length > 0) {
                    viewportIds.push(viewportId);
                }
            }
            else {
                const segmentationRepresentations = getSegmentationRepresentations(viewportId);
                if (segmentationRepresentations?.length > 0) {
                    viewportIds.push(viewportId);
                }
            }
        }
        return viewportIds;
    }
    _throwIfDestroyed() {
        if (this.hasBeenDestroyed) {
            throw new Error('this.destroy() has been manually called to free up memory, can not longer use this instance. Instead make a new one.');
        }
    }
    _setViewportsToBeRenderedNextFrame(viewportIds) {
        viewportIds.forEach((viewportId) => {
            this._needsRender.add(viewportId);
        });
        this._render();
    }
    _render() {
        if (this._needsRender.size > 0 && this._animationFrameSet === false) {
            this._animationFrameHandle = window.requestAnimationFrame(this._renderFlaggedSegmentations);
            this._animationFrameSet = true;
        }
    }
    _triggerRender(viewportId) {
        const segmentationRepresentations = getSegmentationRepresentations(viewportId);
        if (!segmentationRepresentations?.length) {
            return;
        }
        const { viewport } = getEnabledElementByViewportId(viewportId) || {};
        if (!viewport) {
            return;
        }
        const viewportRenderList = [];
        const segmentationRenderList = segmentationRepresentations.map((representation) => {
            if (representation.type === SegmentationRepresentations.Contour) {
                this._addPlanarFreeHandToolIfAbsent(viewport);
            }
            const display = renderers[representation.type];
            try {
                const viewportId = display.render(viewport, representation);
                viewportRenderList.push(viewportId);
            }
            catch (error) {
                console.error(error);
            }
            return Promise.resolve({
                segmentationId: representation.segmentationId,
                type: representation.type,
            });
        });
        Promise.allSettled(segmentationRenderList).then((results) => {
            const segmentationDetails = results
                .filter((r) => r.status === 'fulfilled')
                .map((r) => r.value);
            function onSegmentationRender(evt) {
                const { element, viewportId } = evt.detail;
                element.removeEventListener(Enums.Events.IMAGE_RENDERED, onSegmentationRender);
                segmentationDetails.forEach((detail) => {
                    const eventDetail = {
                        viewportId,
                        segmentationId: detail.segmentationId,
                        type: detail.type,
                    };
                    triggerEvent(eventTarget, csToolsEvents.SEGMENTATION_RENDERED, {
                        ...eventDetail,
                    });
                });
            }
            const element = viewport.element;
            element.addEventListener(Enums.Events.IMAGE_RENDERED, onSegmentationRender);
            viewport.render();
        });
    }
    _addPlanarFreeHandToolIfAbsent(viewport) {
        if (!(planarContourToolName in state.tools)) {
            addTool(PlanarFreehandContourSegmentationTool);
        }
        const toolGroup = getToolGroupForViewport(viewport.id);
        if (!toolGroup.hasTool(planarContourToolName)) {
            toolGroup.addTool(planarContourToolName);
            toolGroup.setToolPassive(planarContourToolName);
        }
    }
}
function triggerSegmentationRender(viewportId) {
    segmentationRenderingEngine.renderSegmentationsForViewport(viewportId);
}
function triggerSegmentationRenderBySegmentationId(segmentationId) {
    segmentationRenderingEngine.renderSegmentation(segmentationId);
}
const segmentationRenderingEngine = new SegmentationRenderingEngine();
export { triggerSegmentationRender, triggerSegmentationRenderBySegmentationId, segmentationRenderingEngine, };
