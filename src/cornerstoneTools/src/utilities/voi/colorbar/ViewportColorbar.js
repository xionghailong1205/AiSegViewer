import { eventTarget, VolumeViewport, StackViewport, Enums, utilities, getEnabledElement, cache, } from '@cornerstonejs/core';
import { Colorbar } from './Colorbar';
import { getVOIMultipliers } from '../../getVOIMultipliers';
const { Events } = Enums;
const defaultImageRange = { lower: -1000, upper: 1000 };
class ViewportColorbar extends Colorbar {
    constructor(props) {
        const { element, volumeId } = props;
        const imageRange = ViewportColorbar._getImageRange(element, volumeId);
        const voiRange = ViewportColorbar._getVOIRange(element, volumeId);
        super({ ...props, imageRange, voiRange });
        this.autoHideTicks = () => {
            if (this._hideTicksTimeoutId) {
                return;
            }
            const timeLeft = this._hideTicksTime - Date.now();
            if (timeLeft <= 0) {
                this.hideTicks();
            }
            else {
                this._hideTicksTimeoutId = window.setTimeout(() => {
                    this._hideTicksTimeoutId = 0;
                    this.autoHideTicks();
                }, timeLeft);
            }
        };
        this._stackNewImageCallback = () => {
            this.imageRange = ViewportColorbar._getImageRange(this._element);
        };
        this._imageVolumeModifiedCallback = (evt) => {
            const { volumeId } = evt.detail;
            if (volumeId !== this._volumeId) {
                return;
            }
            const { _element: element } = this;
            this.imageRange = ViewportColorbar._getImageRange(element, volumeId);
        };
        this._viewportVOIModifiedCallback = (evt) => {
            const { viewportId, volumeId, range: voiRange, colormap } = evt.detail;
            const { viewport } = this.enabledElement;
            if (viewportId !== viewport.id || volumeId !== this._volumeId) {
                return;
            }
            this.voiRange = voiRange;
            if (colormap) {
                this.activeColormapName = colormap.name;
            }
            this.showAndAutoHideTicks();
        };
        this._viewportColormapModifiedCallback = (evt) => {
            const { viewportId, colormap, volumeId } = evt.detail;
            const { viewport } = this.enabledElement;
            if (viewportId !== viewport.id || volumeId !== this._volumeId) {
                return;
            }
            this.activeColormapName = colormap.name;
        };
        this._element = element;
        this._volumeId = volumeId;
        this._addCornerstoneEventListener();
    }
    get element() {
        return this._element;
    }
    get enabledElement() {
        return getEnabledElement(this._element);
    }
    getVOIMultipliers() {
        const { viewport } = this.enabledElement;
        return getVOIMultipliers(viewport, this._volumeId);
    }
    onVoiChange(voiRange) {
        super.onVoiChange(voiRange);
        const { viewport } = this.enabledElement;
        if (viewport instanceof StackViewport) {
            viewport.setProperties({
                voiRange: voiRange,
            });
            viewport.render();
        }
        else if (viewport instanceof VolumeViewport) {
            const { _volumeId: volumeId } = this;
            const viewportsContainingVolumeUID = utilities.getViewportsWithVolumeId(volumeId);
            viewport.setProperties({ voiRange }, volumeId);
            viewportsContainingVolumeUID.forEach((vp) => vp.render());
        }
    }
    static _getImageRange(element, volumeId) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const actor = viewport.getImageActor(volumeId);
        if (!actor) {
            return defaultImageRange;
        }
        const imageData = actor.getMapper().getInputData();
        const scalarData = imageData.getPointData().getScalars();
        let imageRange;
        if (!scalarData) {
            if (!volumeId) {
                throw new Error('volumeId is required when scalarData is not available');
            }
            const volume = cache.getVolume(volumeId);
            const [minValue, maxValue] = volume.voxelManager.getRange();
            imageRange = [minValue, maxValue];
        }
        else {
            imageRange = scalarData.getRange();
        }
        return imageRange[0] === 0 && imageRange[1] === 0
            ? defaultImageRange
            : { lower: imageRange[0], upper: imageRange[1] };
    }
    static _getVOIRange(element, volumeId) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const actor = viewport.getImageActor(volumeId);
        if (!actor) {
            return defaultImageRange;
        }
        const voiRange = actor.getProperty().getRGBTransferFunction(0).getRange();
        return voiRange[0] === 0 && voiRange[1] === 0
            ? defaultImageRange
            : { lower: voiRange[0], upper: voiRange[1] };
    }
    showAndAutoHideTicks(interval = 1000) {
        this._hideTicksTime = Date.now() + interval;
        this.showTicks();
        this.autoHideTicks();
    }
    _addCornerstoneEventListener() {
        const { _element: element } = this;
        eventTarget.addEventListener(Events.IMAGE_VOLUME_MODIFIED, this._imageVolumeModifiedCallback);
        element.addEventListener(Events.STACK_NEW_IMAGE, this._stackNewImageCallback);
        element.addEventListener(Events.VOI_MODIFIED, this._viewportVOIModifiedCallback);
        element.addEventListener(Events.COLORMAP_MODIFIED, this._viewportColormapModifiedCallback);
    }
}
export { ViewportColorbar as default, ViewportColorbar };
