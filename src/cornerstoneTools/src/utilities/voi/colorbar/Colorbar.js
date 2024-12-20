import { vec2 } from 'gl-matrix';
import { utilities as csUtils } from '@cornerstonejs/core';
import { isRangeValid, areColorbarRangesEqual } from './common';
import { ColorbarRangeTextPosition } from './enums/ColorbarRangeTextPosition';
import { ColorbarCanvas } from './ColorbarCanvas';
import { ColorbarTicks } from './ColorbarTicks';
import isRangeTextPositionValid from './common/isRangeTextPositionValid';
import Widget from '../../../widgets/Widget';
const DEFAULTS = {
    MULTIPLIER: 1,
    RANGE_TEXT_POSITION: ColorbarRangeTextPosition.Right,
    TICKS_BAR_SIZE: 50,
};
class Colorbar extends Widget {
    constructor(props) {
        super(props);
        this._isMouseOver = false;
        this._isInteracting = false;
        this._mouseOverCallback = (evt) => {
            this._isMouseOver = true;
            this.showTicks();
            evt.stopPropagation();
        };
        this._mouseOutCallback = (evt) => {
            this._isMouseOver = false;
            this.hideTicks();
            evt.stopPropagation();
        };
        this._mouseDownCallback = (evt) => {
            this._isInteracting = true;
            this.showTicks();
            this._addVOIEventListeners(evt);
            evt.stopPropagation();
        };
        this._mouseDragCallback = (evt, initialState) => {
            const multipliers = this.getVOIMultipliers();
            const currentPoints = this._getPointsFromMouseEvent(evt);
            const { points: startPoints, voiRange: startVOIRange } = initialState;
            const canvasDelta = vec2.sub(vec2.create(), currentPoints.local, startPoints.local);
            const wwDelta = canvasDelta[0] * multipliers[0];
            const wcDelta = canvasDelta[1] * multipliers[1];
            if (!wwDelta && !wcDelta) {
                return;
            }
            const { lower: voiLower, upper: voiUpper } = startVOIRange;
            let { windowWidth, windowCenter } = csUtils.windowLevel.toWindowLevel(voiLower, voiUpper);
            windowWidth = Math.max(windowWidth + wwDelta, 1);
            windowCenter += wcDelta;
            const newVoiRange = csUtils.windowLevel.toLowHighRange(windowWidth, windowCenter);
            this.voiRange = newVoiRange;
            evt.stopPropagation();
            evt.preventDefault();
        };
        this._mouseUpCallback = (evt) => {
            this._isInteracting = false;
            this.hideTicks();
            this._removeVOIEventListeners();
            evt.stopPropagation();
        };
        this._eventListenersManager =
            new csUtils.eventListener.MultiTargetEventListenerManager();
        this._colormaps = Colorbar.getColormapsMap(props);
        this._activeColormapName = Colorbar.getInitialColormapName(props);
        this._canvas = this._createCanvas(props);
        this._ticksBar = this._createTicksBar(props);
        this._rangeTextPosition =
            props.ticks?.position ?? DEFAULTS.RANGE_TEXT_POSITION;
        this._canvas.appendTo(this.rootElement);
        this._ticksBar.appendTo(this.rootElement);
        this._addRootElementEventListeners();
    }
    get activeColormapName() {
        return this._activeColormapName;
    }
    set activeColormapName(colormapName) {
        if (colormapName === this._activeColormapName) {
            return;
        }
        const colormap = this._colormaps.get(colormapName);
        if (!colormap) {
            console.warn(`Invalid colormap name (${colormapName})`);
            return;
        }
        this._activeColormapName = colormapName;
        this._canvas.colormap = colormap;
    }
    get imageRange() {
        return this._canvas.imageRange;
    }
    set imageRange(imageRange) {
        this._canvas.imageRange = imageRange;
        this._ticksBar.imageRange = imageRange;
    }
    get voiRange() {
        return this._canvas.voiRange;
    }
    set voiRange(voiRange) {
        const { voiRange: currentVoiRange } = this._canvas;
        if (!isRangeValid(voiRange) ||
            areColorbarRangesEqual(voiRange, currentVoiRange)) {
            return;
        }
        this._canvas.voiRange = voiRange;
        this._ticksBar.voiRange = voiRange;
        this.onVoiChange(voiRange);
    }
    get showFullImageRange() {
        return this._canvas.showFullImageRange;
    }
    set showFullImageRange(value) {
        this._canvas.showFullImageRange = value;
        this._ticksBar.showFullPixelValueRange = value;
    }
    destroy() {
        super.destroy();
        this._eventListenersManager.reset();
    }
    createRootElement() {
        const rootElement = document.createElement('div');
        Object.assign(rootElement.style, {
            position: 'relative',
            fontSize: '0',
            width: '100%',
            height: '100%',
        });
        return rootElement;
    }
    onContainerResize() {
        super.onContainerResize();
        this.updateTicksBar();
        this._canvas.size = this.containerSize;
    }
    getVOIMultipliers() {
        return [DEFAULTS.MULTIPLIER, DEFAULTS.MULTIPLIER];
    }
    onVoiChange(voiRange) {
    }
    showTicks() {
        this.updateTicksBar();
        this._ticksBar.visible = true;
    }
    hideTicks() {
        if (this._isInteracting || this._isMouseOver) {
            return;
        }
        this._ticksBar.visible = false;
    }
    static getColormapsMap(props) {
        const { colormaps } = props;
        return colormaps.reduce((items, item) => items.set(item.Name, item), new Map());
    }
    static getInitialColormapName(props) {
        const { activeColormapName, colormaps } = props;
        const colormapExists = !!activeColormapName &&
            colormaps.some((cm) => cm.Name === activeColormapName);
        return colormapExists ? activeColormapName : colormaps[0].Name;
    }
    _createCanvas(props) {
        const { imageRange, voiRange, showFullPixelValueRange } = props;
        const colormap = this._colormaps.get(this._activeColormapName);
        return new ColorbarCanvas({
            colormap,
            imageRange,
            voiRange: voiRange,
            showFullPixelValueRange,
        });
    }
    _createTicksBar(props) {
        const ticksProps = props.ticks;
        return new ColorbarTicks({
            imageRange: props.imageRange,
            voiRange: props.voiRange,
            ticks: ticksProps,
            showFullPixelValueRange: props.showFullPixelValueRange,
        });
    }
    _getPointsFromMouseEvent(evt) {
        const { rootElement: element } = this;
        const clientPoint = [evt.clientX, evt.clientY];
        const pagePoint = [evt.pageX, evt.pageY];
        const rect = element.getBoundingClientRect();
        const localPoints = [
            pagePoint[0] - rect.left - window.pageXOffset,
            pagePoint[1] - rect.top - window.pageYOffset,
        ];
        return { client: clientPoint, page: pagePoint, local: localPoints };
    }
    updateTicksBar() {
        const { width: containerWidth, height: containerHeight } = this.containerSize;
        if (containerWidth === 0 && containerHeight === 0) {
            return;
        }
        const { _ticksBar: ticksBar, _rangeTextPosition: rangeTextPosition } = this;
        const isHorizontal = containerWidth >= containerHeight;
        const width = isHorizontal ? containerWidth : DEFAULTS.TICKS_BAR_SIZE;
        const height = isHorizontal ? DEFAULTS.TICKS_BAR_SIZE : containerHeight;
        if (!isRangeTextPositionValid(containerWidth, containerHeight, rangeTextPosition)) {
            throw new Error('Invalid rangeTextPosition value for the current colobar orientation');
        }
        let ticksBarTop;
        let ticksBarLeft;
        ticksBar.size = { width, height };
        if (isHorizontal) {
            ticksBarLeft = 0;
            ticksBarTop =
                rangeTextPosition === ColorbarRangeTextPosition.Top
                    ? -height
                    : containerHeight;
        }
        else {
            ticksBarTop = 0;
            ticksBarLeft =
                rangeTextPosition === ColorbarRangeTextPosition.Left
                    ? -width
                    : containerWidth;
        }
        ticksBar.top = ticksBarTop;
        ticksBar.left = ticksBarLeft;
    }
    _addRootElementEventListeners() {
        const { _eventListenersManager: manager } = this;
        const { rootElement: element } = this;
        manager.addEventListener(element, 'mouseover', this._mouseOverCallback);
        manager.addEventListener(element, 'mouseout', this._mouseOutCallback);
        manager.addEventListener(element, 'mousedown', this._mouseDownCallback);
    }
    _addVOIEventListeners(evt) {
        const { _eventListenersManager: manager } = this;
        const points = this._getPointsFromMouseEvent(evt);
        const voiRange = { ...this._canvas.voiRange };
        const initialDragState = { points, voiRange };
        this._removeVOIEventListeners();
        manager.addEventListener(document, 'voi.mouseup', this._mouseUpCallback);
        manager.addEventListener(document, 'voi.mousemove', (evt) => this._mouseDragCallback(evt, initialDragState));
    }
    _removeVOIEventListeners() {
        const { _eventListenersManager: manager } = this;
        manager.removeEventListener(document, 'voi.mouseup');
        manager.removeEventListener(document, 'voi.mousemove');
    }
}
export { Colorbar as default, Colorbar };
