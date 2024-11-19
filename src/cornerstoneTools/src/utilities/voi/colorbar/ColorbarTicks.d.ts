import type { ColorbarVOIRange, ColorbarSize, ColorbarTicksProps } from './types';
declare class ColorbarTicks {
    private _canvas;
    private _imageRange;
    private _voiRange;
    private _color;
    private _tickSize;
    private _tickWidth;
    private _labelMargin;
    private _maxNumTicks;
    private _rangeTextPosition;
    private _showFullPixelValueRange;
    private _font;
    constructor(props: ColorbarTicksProps);
    get size(): ColorbarSize;
    set size(size: ColorbarSize);
    get top(): number;
    set top(top: number);
    get left(): number;
    set left(left: number);
    get imageRange(): ColorbarVOIRange;
    set imageRange(imageRange: ColorbarVOIRange);
    get voiRange(): ColorbarVOIRange;
    set voiRange(voiRange: ColorbarVOIRange);
    get tickSize(): number;
    set tickSize(tickSize: number);
    get tickWidth(): number;
    set tickWidth(tickWidth: number);
    get color(): string;
    set color(color: string);
    get showFullPixelValueRange(): boolean;
    set showFullPixelValueRange(showFullRange: boolean);
    get visible(): boolean;
    set visible(visible: boolean);
    appendTo(container: HTMLElement): void;
    private static validateProps;
    private _setCanvasSize;
    private _createCanvasElement;
    private _getTicks;
    private _getLeftTickInfo;
    private _getRightTickInfo;
    private _getTopTickInfo;
    private _getBottomTickInfo;
    private render;
}
export { ColorbarTicks as default, ColorbarTicks };