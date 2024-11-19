import type { Types } from '@cornerstonejs/core';
import type { ISynchronizerEventHandler } from '../../types';
type eventSource = 'element' | 'eventTarget';
type auxiliaryEvent = {
    name: string;
    source?: eventSource;
};
export type SynchronizerOptions = {
    auxiliaryEvents?: auxiliaryEvent[];
    eventSource?: eventSource;
    viewPresentation?: Types.ViewPresentation;
};
declare class Synchronizer {
    private _enabled;
    private _eventName;
    private _auxiliaryEvents;
    private _eventHandler;
    private _eventSource;
    private _ignoreFiredEvents;
    private _sourceViewports;
    private _targetViewports;
    private _viewportOptions;
    private _options;
    id: string;
    constructor(synchronizerId: string, eventName: string, eventHandler: ISynchronizerEventHandler, options?: SynchronizerOptions);
    isDisabled(): boolean;
    setOptions(viewportId: string, options?: Record<string, unknown>): void;
    setEnabled(enabled: boolean): void;
    getOptions(viewportId: string): Record<string, unknown> | undefined;
    add(viewportInfo: Types.IViewportId): void;
    addSource(viewportInfo: Types.IViewportId): void;
    addTarget(viewportInfo: Types.IViewportId): void;
    getSourceViewports(): Array<Types.IViewportId>;
    getTargetViewports(): Array<Types.IViewportId>;
    destroy(): void;
    remove(viewportInfo: Types.IViewportId): void;
    removeSource(viewportInfo: Types.IViewportId): void;
    removeTarget(viewportInfo: Types.IViewportId): void;
    hasSourceViewport(renderingEngineId: string, viewportId: string): boolean;
    hasTargetViewport(renderingEngineId: string, viewportId: string): boolean;
    private fireEvent;
    private _onEvent;
    private _hasSourceElements;
    private _updateDisableHandlers;
    private getEventSource;
    private getViewportElement;
}
export default Synchronizer;
