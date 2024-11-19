import { getEnabledElementByViewportId, VolumeViewport, } from '@cornerstonejs/core';
import addLabelmapToElement from './addLabelmapToElement';
import removeLabelmapFromElement from './removeLabelmapFromElement';
import { getActiveSegmentation } from '../../../stateManagement/segmentation/activeSegmentation';
import { getColorLUT } from '../../../stateManagement/segmentation/getColorLUT';
import { getCurrentLabelmapImageIdForViewport } from '../../../stateManagement/segmentation/getCurrentLabelmapImageIdForViewport';
import { getSegmentation } from '../../../stateManagement/segmentation/getSegmentation';
import { canComputeRequestedRepresentation } from '../../../stateManagement/segmentation/polySeg/canComputeRequestedRepresentation';
import { computeAndAddLabelmapRepresentation } from '../../../stateManagement/segmentation/polySeg/Labelmap/computeAndAddLabelmapRepresentation';
import { segmentationStyle } from '../../../stateManagement/segmentation/SegmentationStyle';
import SegmentationRepresentations from '../../../enums/SegmentationRepresentations';
import { internalGetHiddenSegmentIndices } from '../../../stateManagement/segmentation/helpers/internalGetHiddenSegmentIndices';
import { getActiveSegmentIndex } from '../../../stateManagement/segmentation/getActiveSegmentIndex';
import { getLabelmapActorEntry } from '../../../stateManagement/segmentation/helpers/getSegmentationActor';
const MAX_NUMBER_COLORS = 255;
const labelMapConfigCache = new Map();
let polySegConversionInProgress = false;
function removeRepresentation(viewportId, segmentationId, renderImmediate = false) {
    const enabledElement = getEnabledElementByViewportId(viewportId);
    labelMapConfigCache.forEach((value, key) => {
        if (key.includes(segmentationId)) {
            labelMapConfigCache.delete(key);
        }
    });
    if (!enabledElement) {
        return;
    }
    const { viewport } = enabledElement;
    removeLabelmapFromElement(viewport.element, segmentationId);
    if (!renderImmediate) {
        return;
    }
    viewport.render();
}
async function render(viewport, representation) {
    const { segmentationId } = representation;
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        console.warn('No segmentation found for segmentationId: ', segmentationId);
        return;
    }
    let labelmapData = segmentation.representationData[SegmentationRepresentations.Labelmap];
    let labelmapActorEntry = getLabelmapActorEntry(viewport.id, segmentationId);
    if (!labelmapData &&
        canComputeRequestedRepresentation(segmentationId, SegmentationRepresentations.Labelmap) &&
        !polySegConversionInProgress) {
        polySegConversionInProgress = true;
        labelmapData = await computeAndAddLabelmapRepresentation(segmentationId, {
            viewport,
        });
        if (!labelmapData) {
            throw new Error(`No labelmap data found for segmentationId ${segmentationId}.`);
        }
        polySegConversionInProgress = false;
    }
    if (!labelmapData) {
        return;
    }
    if (viewport instanceof VolumeViewport) {
        if (!labelmapActorEntry) {
            await _addLabelmapToViewport(viewport, labelmapData, segmentationId);
        }
        labelmapActorEntry = getLabelmapActorEntry(viewport.id, segmentationId);
    }
    else {
        const labelmapImageId = getCurrentLabelmapImageIdForViewport(viewport.id, segmentationId);
        if (!labelmapImageId) {
            return;
        }
        if (!labelmapActorEntry) {
            await _addLabelmapToViewport(viewport, labelmapData, segmentationId);
        }
        labelmapActorEntry = getLabelmapActorEntry(viewport.id, segmentationId);
    }
    if (!labelmapActorEntry) {
        return;
    }
    _setLabelmapColorAndOpacity(viewport.id, labelmapActorEntry, representation);
}
function _setLabelmapColorAndOpacity(viewportId, labelmapActorEntry, segmentationRepresentation) {
    const { segmentationId } = segmentationRepresentation;
    const { cfun, ofun } = segmentationRepresentation.config;
    const { colorLUTIndex } = segmentationRepresentation;
    const activeSegmentation = getActiveSegmentation(viewportId);
    const isActiveLabelmap = activeSegmentation?.segmentationId === segmentationId;
    const labelmapStyle = segmentationStyle.getStyle({
        viewportId,
        type: SegmentationRepresentations.Labelmap,
        segmentationId,
    });
    const renderInactiveSegmentations = segmentationStyle.getRenderInactiveSegmentations(viewportId);
    const colorLUT = getColorLUT(colorLUTIndex);
    const numColors = Math.min(256, colorLUT.length);
    const { outlineWidth, renderOutline, outlineOpacity, activeSegmentOutlineWidthDelta, } = _getLabelmapConfig(labelmapStyle, isActiveLabelmap);
    const segmentsHidden = internalGetHiddenSegmentIndices(viewportId, {
        segmentationId,
        type: SegmentationRepresentations.Labelmap,
    });
    for (let i = 0; i < numColors; i++) {
        const segmentIndex = i;
        const segmentColor = colorLUT[segmentIndex];
        const perSegmentStyle = segmentationStyle.getStyle({
            viewportId,
            type: SegmentationRepresentations.Labelmap,
            segmentationId,
            segmentIndex,
        });
        const segmentSpecificLabelmapConfig = perSegmentStyle;
        const { fillAlpha, outlineWidth, renderFill, renderOutline } = _getLabelmapConfig(labelmapStyle, isActiveLabelmap, segmentSpecificLabelmapConfig);
        const { forceOpacityUpdate, forceColorUpdate } = _needsTransferFunctionUpdate(viewportId, segmentationId, segmentIndex, {
            fillAlpha,
            renderFill,
            renderOutline,
            segmentColor,
            outlineWidth,
            segmentsHidden: segmentsHidden,
            cfun,
            ofun,
        });
        if (forceColorUpdate) {
            cfun.addRGBPoint(segmentIndex, segmentColor[0] / MAX_NUMBER_COLORS, segmentColor[1] / MAX_NUMBER_COLORS, segmentColor[2] / MAX_NUMBER_COLORS);
        }
        if (forceOpacityUpdate) {
            if (renderFill) {
                const segmentOpacity = segmentsHidden.has(segmentIndex)
                    ? 0
                    : (segmentColor[3] / 255) * fillAlpha;
                ofun.removePoint(segmentIndex);
                ofun.addPointLong(segmentIndex, segmentOpacity, 0.5, 1.0);
            }
            else {
                ofun.addPointLong(segmentIndex, 0.01, 0.5, 1.0);
            }
        }
    }
    const labelmapActor = labelmapActorEntry.actor;
    labelmapActor.getProperty().setRGBTransferFunction(0, cfun);
    ofun.setClamping(false);
    labelmapActor.getProperty().setScalarOpacity(0, ofun);
    labelmapActor.getProperty().setInterpolationTypeToNearest();
    if (renderOutline) {
        labelmapActor.getProperty().setUseLabelOutline(renderOutline);
        labelmapActor.getProperty().setLabelOutlineOpacity(outlineOpacity);
        const activeSegmentIndex = getActiveSegmentIndex(segmentationRepresentation.segmentationId);
        const outlineWidths = new Array(numColors - 1);
        for (let i = 1; i < numColors; i++) {
            const isHidden = segmentsHidden.has(i);
            if (isHidden) {
                outlineWidths[i - 1] = 0;
                continue;
            }
            outlineWidths[i - 1] =
                i === activeSegmentIndex
                    ? outlineWidth + activeSegmentOutlineWidthDelta
                    : outlineWidth;
        }
        labelmapActor.getProperty().setLabelOutlineThickness(outlineWidths);
    }
    else {
        labelmapActor
            .getProperty()
            .setLabelOutlineThickness(new Array(numColors - 1).fill(0));
    }
    const visible = isActiveLabelmap || renderInactiveSegmentations;
    labelmapActor.setVisibility(visible);
}
function _getLabelmapConfig(labelmapConfig, isActiveLabelmap, segmentsLabelmapConfig) {
    const segmentLabelmapConfig = segmentsLabelmapConfig || {};
    const configToUse = {
        ...labelmapConfig,
        ...segmentLabelmapConfig,
    };
    const fillAlpha = isActiveLabelmap
        ? configToUse.fillAlpha
        : configToUse.fillAlphaInactive;
    const outlineWidth = isActiveLabelmap
        ? configToUse.outlineWidth
        : configToUse.outlineWidthInactive;
    const renderFill = isActiveLabelmap
        ? configToUse.renderFill
        : configToUse.renderFillInactive;
    const renderOutline = isActiveLabelmap
        ? configToUse.renderOutline
        : configToUse.renderOutlineInactive;
    const outlineOpacity = isActiveLabelmap
        ? configToUse.outlineOpacity
        : configToUse.outlineOpacityInactive;
    const activeSegmentOutlineWidthDelta = configToUse.activeSegmentOutlineWidthDelta;
    return {
        fillAlpha,
        outlineWidth,
        renderFill,
        renderOutline,
        outlineOpacity,
        activeSegmentOutlineWidthDelta,
    };
}
function _needsTransferFunctionUpdate(viewportId, segmentationId, segmentIndex, { fillAlpha, renderFill, renderOutline, segmentColor, outlineWidth, segmentsHidden, cfun, ofun, }) {
    const cacheUID = `${viewportId}-${segmentationId}-${segmentIndex}`;
    const oldConfig = labelMapConfigCache.get(cacheUID);
    if (!oldConfig) {
        labelMapConfigCache.set(cacheUID, {
            fillAlpha,
            renderFill,
            renderOutline,
            outlineWidth,
            segmentColor: segmentColor.slice(),
            segmentsHidden: new Set(segmentsHidden),
            cfunMTime: cfun.getMTime(),
            ofunMTime: ofun.getMTime(),
        });
        return {
            forceOpacityUpdate: true,
            forceColorUpdate: true,
        };
    }
    const { fillAlpha: oldFillAlpha, renderFill: oldRenderFill, renderOutline: oldRenderOutline, outlineWidth: oldOutlineWidth, segmentColor: oldSegmentColor, segmentsHidden: oldSegmentsHidden, cfunMTime: oldCfunMTime, ofunMTime: oldOfunMTime, } = oldConfig;
    const forceColorUpdate = oldSegmentColor[0] !== segmentColor[0] ||
        oldSegmentColor[1] !== segmentColor[1] ||
        oldSegmentColor[2] !== segmentColor[2];
    const forceOpacityUpdate = oldSegmentColor[3] !== segmentColor[3] ||
        oldFillAlpha !== fillAlpha ||
        oldRenderFill !== renderFill ||
        oldRenderOutline !== renderOutline ||
        oldOutlineWidth !== outlineWidth ||
        oldSegmentsHidden !== segmentsHidden;
    if (forceOpacityUpdate || forceColorUpdate) {
        labelMapConfigCache.set(cacheUID, {
            fillAlpha,
            renderFill,
            renderOutline,
            outlineWidth,
            segmentColor: segmentColor.slice(),
            segmentsHidden: new Set(segmentsHidden),
            cfunMTime: cfun.getMTime(),
            ofunMTime: ofun.getMTime(),
        });
    }
    return {
        forceOpacityUpdate,
        forceColorUpdate,
    };
}
async function _addLabelmapToViewport(viewport, labelmapData, segmentationId) {
    await addLabelmapToElement(viewport.element, labelmapData, segmentationId);
}
export default {
    render,
    removeRepresentation,
};
export { render, removeRepresentation };
