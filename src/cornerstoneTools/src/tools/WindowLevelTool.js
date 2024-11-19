import { BaseTool } from './base';
import { getEnabledElement, VolumeViewport, cache, utilities, } from '@cornerstonejs/core';
const DEFAULT_MULTIPLIER = 4;
const DEFAULT_IMAGE_DYNAMIC_RANGE = 1024;
const PT = 'PT';
class WindowLevelTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
    }) {
        super(toolProps, defaultToolProps);
        this._getImageDynamicRangeFromMiddleSlice = (scalarData, dimensions) => {
            const middleSliceIndex = Math.floor(dimensions[2] / 2);
            const frameLength = dimensions[0] * dimensions[1];
            let bytesPerVoxel;
            let TypedArrayConstructor;
            if (scalarData instanceof Float32Array) {
                bytesPerVoxel = 4;
                TypedArrayConstructor = Float32Array;
            }
            else if (scalarData instanceof Uint8Array) {
                bytesPerVoxel = 1;
                TypedArrayConstructor = Uint8Array;
            }
            else if (scalarData instanceof Uint16Array) {
                bytesPerVoxel = 2;
                TypedArrayConstructor = Uint16Array;
            }
            else if (scalarData instanceof Int16Array) {
                bytesPerVoxel = 2;
                TypedArrayConstructor = Int16Array;
            }
            const buffer = scalarData.buffer;
            const byteOffset = middleSliceIndex * frameLength * bytesPerVoxel;
            const frame = new TypedArrayConstructor(buffer, byteOffset, frameLength);
            const { max, min } = this._getMinMax(frame, frameLength);
            return max - min;
        };
    }
    touchDragCallback(evt) {
        this.mouseDragCallback(evt);
    }
    mouseDragCallback(evt) {
        const { element, deltaPoints } = evt.detail;
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        let volumeId, lower, upper, modality, newRange, viewportsContainingVolumeUID;
        let isPreScaled = false;
        const properties = viewport.getProperties();
        if (viewport instanceof VolumeViewport) {
            volumeId = viewport.getVolumeId();
            viewportsContainingVolumeUID =
                utilities.getViewportsWithVolumeId(volumeId);
            ({ lower, upper } = properties.voiRange);
            const volume = cache.getVolume(volumeId);
            if (!volume) {
                throw new Error('Volume not found ' + volumeId);
            }
            modality = volume.metadata.Modality;
            isPreScaled = volume.scaling && Object.keys(volume.scaling).length > 0;
        }
        else if (properties.voiRange) {
            modality = viewport.modality;
            ({ lower, upper } = properties.voiRange);
            const { preScale = { scaled: false } } = viewport.getImageData?.() || {};
            isPreScaled =
                preScale.scaled && preScale.scalingParameters?.suvbw !== undefined;
        }
        else {
            throw new Error('Viewport is not a valid type');
        }
        if (modality === PT && isPreScaled) {
            newRange = this.getPTScaledNewRange({
                deltaPointsCanvas: deltaPoints.canvas,
                lower,
                upper,
                clientHeight: element.clientHeight,
                isPreScaled,
                viewport,
                volumeId,
            });
        }
        else {
            newRange = this.getNewRange({
                viewport,
                deltaPointsCanvas: deltaPoints.canvas,
                volumeId,
                lower,
                upper,
            });
        }
        if (newRange.lower >= newRange.upper) {
            return;
        }
        viewport.setProperties({
            voiRange: newRange,
        });
        viewport.render();
        if (viewport instanceof VolumeViewport) {
            viewportsContainingVolumeUID.forEach((vp) => {
                if (viewport !== vp) {
                    vp.render();
                }
            });
            return;
        }
    }
    getPTScaledNewRange({ deltaPointsCanvas, lower, upper, clientHeight, viewport, volumeId, isPreScaled, }) {
        let multiplier = DEFAULT_MULTIPLIER;
        if (isPreScaled) {
            multiplier = 5 / clientHeight;
        }
        else {
            multiplier =
                this._getMultiplierFromDynamicRange(viewport, volumeId) ||
                    DEFAULT_MULTIPLIER;
        }
        const deltaY = deltaPointsCanvas[1];
        const wcDelta = deltaY * multiplier;
        upper -= wcDelta;
        upper = isPreScaled ? Math.max(upper, 0.1) : upper;
        return { lower, upper };
    }
    getNewRange({ viewport, deltaPointsCanvas, volumeId, lower, upper }) {
        const multiplier = this._getMultiplierFromDynamicRange(viewport, volumeId) ||
            DEFAULT_MULTIPLIER;
        const wwDelta = deltaPointsCanvas[0] * multiplier;
        const wcDelta = deltaPointsCanvas[1] * multiplier;
        let { windowWidth, windowCenter } = utilities.windowLevel.toWindowLevel(lower, upper);
        windowWidth += wwDelta;
        windowCenter += wcDelta;
        windowWidth = Math.max(windowWidth, 1);
        return utilities.windowLevel.toLowHighRange(windowWidth, windowCenter);
    }
    _getMultiplierFromDynamicRange(viewport, volumeId) {
        let imageDynamicRange;
        if (volumeId) {
            const imageVolume = cache.getVolume(volumeId);
            const { voxelManager } = viewport.getImageData();
            const middleSlicePixelData = voxelManager.getMiddleSliceData();
            const calculatedDynamicRange = middleSlicePixelData.reduce((acc, pixel) => {
                return [Math.min(acc[0], pixel), Math.max(acc[1], pixel)];
            }, [Infinity, -Infinity]);
            const BitsStored = imageVolume?.metadata?.BitsStored;
            const metadataDynamicRange = BitsStored ? 2 ** BitsStored : Infinity;
            imageDynamicRange = Math.min(calculatedDynamicRange, metadataDynamicRange);
        }
        else {
            imageDynamicRange = this._getImageDynamicRangeFromViewport(viewport);
        }
        const ratio = imageDynamicRange / DEFAULT_IMAGE_DYNAMIC_RANGE;
        return ratio > 1 ? Math.round(ratio) : ratio;
    }
    _getImageDynamicRangeFromViewport(viewport) {
        const { imageData, voxelManager } = viewport.getImageData();
        if (voxelManager?.getRange) {
            const range = voxelManager.getRange();
            return range[1] - range[0];
        }
        const dimensions = imageData.getDimensions();
        if (imageData.getRange) {
            const imageDataRange = imageData.getRange();
            return imageDataRange[1] - imageDataRange[0];
        }
        let scalarData;
        if (imageData.getScalarData) {
            scalarData = imageData.getScalarData();
        }
        else {
            scalarData = imageData.getPointData().getScalars().getData();
        }
        if (dimensions[2] !== 1) {
            return this._getImageDynamicRangeFromMiddleSlice(scalarData, dimensions);
        }
        let range;
        if (scalarData.getRange) {
            range = scalarData.getRange();
        }
        else {
            const { min, max } = this._getMinMax(scalarData, scalarData.length);
            range = [min, max];
        }
        return range[1] - range[0];
    }
    _getMinMax(frame, frameLength) {
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < frameLength; i++) {
            const voxel = frame[i];
            if (voxel < min) {
                min = voxel;
            }
            if (voxel > max) {
                max = voxel;
            }
        }
        return { max, min };
    }
}
WindowLevelTool.toolName = 'WindowLevel';
export default WindowLevelTool;