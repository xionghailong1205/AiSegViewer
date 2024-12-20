import { MouseBindings, ToolModes, Events } from '../../enums';
import get from 'lodash.get';
import { triggerEvent, eventTarget, getRenderingEngine, getRenderingEngines, getEnabledElementByIds, Settings, } from '@cornerstonejs/core';
import { utilities } from '@cornerstonejs/core';
import { state } from '../state';
import { MouseCursor, SVGMouseCursor } from '../../cursors';
import { initElementCursor } from '../../cursors/elementCursor';
import getToolGroup from './getToolGroup';
const { Active, Passive, Enabled, Disabled } = ToolModes;
const PRIMARY_BINDINGS = [{ mouseButton: MouseBindings.Primary }];
export default class ToolGroup {
    constructor(id) {
        this.viewportsInfo = [];
        this.toolOptions = {};
        this.currentActivePrimaryToolName = null;
        this.prevActivePrimaryToolName = null;
        this.restoreToolOptions = {};
        this._toolInstances = {};
        this.id = id;
    }
    getViewportIds() {
        return this.viewportsInfo.map(({ viewportId }) => viewportId);
    }
    getViewportsInfo() {
        return this.viewportsInfo.slice();
    }
    getToolInstance(toolInstanceName) {
        const toolInstance = this._toolInstances[toolInstanceName];
        if (!toolInstance) {
            console.warn(`'${toolInstanceName}' is not registered with this toolGroup (${this.id}).`);
            return;
        }
        return toolInstance;
    }
    getToolInstances() {
        return this._toolInstances;
    }
    hasTool(toolName) {
        return !!this._toolInstances[toolName];
    }
    addTool(toolName, configuration = {}) {
        const toolDefinition = state.tools[toolName];
        const hasToolName = typeof toolName !== 'undefined' && toolName !== '';
        const localToolInstance = this.toolOptions[toolName];
        if (!hasToolName) {
            console.warn('Tool with configuration did not produce a toolName: ', configuration);
            return;
        }
        if (!toolDefinition) {
            console.warn(`'${toolName}' is not registered with the library. You need to use cornerstoneTools.addTool to register it.`);
            return;
        }
        if (localToolInstance) {
            console.warn(`'${toolName}' is already registered for ToolGroup ${this.id}.`);
            return;
        }
        const { toolClass: ToolClass } = toolDefinition;
        const toolProps = {
            name: toolName,
            toolGroupId: this.id,
            configuration,
        };
        const instantiatedTool = new ToolClass(toolProps);
        this._toolInstances[toolName] = instantiatedTool;
    }
    addToolInstance(toolName, parentClassName, configuration = {}) {
        let ToolClassToUse = state.tools[toolName]
            ?.toolClass;
        if (!ToolClassToUse) {
            const ParentClass = state.tools[parentClassName]
                .toolClass;
            class ToolInstance extends ParentClass {
            }
            ToolInstance.toolName = toolName;
            ToolClassToUse = ToolInstance;
            state.tools[toolName] = {
                toolClass: ToolInstance,
            };
        }
        this.addTool(ToolClassToUse.toolName, configuration);
    }
    addViewport(viewportId, renderingEngineId) {
        if (typeof viewportId !== 'string') {
            throw new Error('viewportId must be defined and be a string');
        }
        const renderingEngineUIDToUse = this._findRenderingEngine(viewportId, renderingEngineId);
        if (!this.viewportsInfo.some(({ viewportId: vpId }) => vpId === viewportId)) {
            this.viewportsInfo.push({
                viewportId,
                renderingEngineId: renderingEngineUIDToUse,
            });
        }
        const toolName = this.getActivePrimaryMouseButtonTool();
        const runtimeSettings = Settings.getRuntimeSettings();
        if (runtimeSettings.get('useCursors')) {
            this.setViewportsCursorByToolName(toolName);
        }
        const eventDetail = {
            toolGroupId: this.id,
            viewportId,
            renderingEngineId: renderingEngineUIDToUse,
        };
        triggerEvent(eventTarget, Events.TOOLGROUP_VIEWPORT_ADDED, eventDetail);
    }
    removeViewports(renderingEngineId, viewportId) {
        const indices = [];
        this.viewportsInfo.forEach((vpInfo, index) => {
            let match = false;
            if (vpInfo.renderingEngineId === renderingEngineId) {
                match = true;
                if (viewportId && vpInfo.viewportId !== viewportId) {
                    match = false;
                }
            }
            if (match) {
                indices.push(index);
            }
        });
        if (indices.length) {
            for (let i = indices.length - 1; i >= 0; i--) {
                this.viewportsInfo.splice(indices[i], 1);
            }
        }
        const eventDetail = {
            toolGroupId: this.id,
            viewportId,
            renderingEngineId,
        };
        triggerEvent(eventTarget, Events.TOOLGROUP_VIEWPORT_REMOVED, eventDetail);
    }
    setActiveStrategy(toolName, strategyName) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool configuration.`);
            return;
        }
        toolInstance.setActiveStrategy(strategyName);
    }
    setToolMode(toolName, mode, options = {}) {
        if (!toolName) {
            console.warn('setToolMode: toolName must be defined');
            return;
        }
        if (mode === ToolModes.Active) {
            this.setToolActive(toolName, options || this.restoreToolOptions[toolName]);
            return;
        }
        if (mode === ToolModes.Passive) {
            this.setToolPassive(toolName);
            return;
        }
        if (mode === ToolModes.Enabled) {
            this.setToolEnabled(toolName);
            return;
        }
        if (mode === ToolModes.Disabled) {
            this.setToolDisabled(toolName);
            return;
        }
        console.warn('setToolMode: mode must be defined');
    }
    setToolActive(toolName, toolBindingsOptions = {}) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool mode.`);
            return;
        }
        if (!toolInstance) {
            console.warn(`'${toolName}' instance ${toolInstance} is not registered with this toolGroup, can't set tool mode.`);
            return;
        }
        const prevBindings = this.toolOptions[toolName]
            ? this.toolOptions[toolName].bindings
            : [];
        const newBindings = toolBindingsOptions.bindings
            ? toolBindingsOptions.bindings
            : [];
        const bindingsToUse = [...prevBindings, ...newBindings].reduce((unique, binding) => {
            const TouchBinding = binding.numTouchPoints !== undefined;
            const MouseBinding = binding.mouseButton !== undefined;
            if (!unique.some((obj) => hasSameBinding(obj, binding)) &&
                (TouchBinding || MouseBinding)) {
                unique.push(binding);
            }
            return unique;
        }, []);
        const toolOptions = {
            bindings: bindingsToUse,
            mode: Active,
        };
        this.toolOptions[toolName] = toolOptions;
        this._toolInstances[toolName].mode = Active;
        const runtimeSettings = Settings.getRuntimeSettings();
        const useCursor = runtimeSettings.get('useCursors');
        if (this._hasMousePrimaryButtonBinding(toolBindingsOptions) && useCursor) {
            this.setViewportsCursorByToolName(toolName);
        }
        else {
            const activeToolIdentifier = this.getActivePrimaryMouseButtonTool();
            if (!activeToolIdentifier && useCursor) {
                const cursor = MouseCursor.getDefinedCursor('default');
                this._setCursorForViewports(cursor);
            }
        }
        if (this._hasMousePrimaryButtonBinding(toolBindingsOptions)) {
            if (this.prevActivePrimaryToolName === null) {
                this.prevActivePrimaryToolName = toolName;
            }
            else {
                this.prevActivePrimaryToolName = this.currentActivePrimaryToolName;
            }
            this.currentActivePrimaryToolName = toolName;
        }
        if (typeof toolInstance.onSetToolActive === 'function') {
            toolInstance.onSetToolActive();
        }
        this._renderViewports();
        const eventDetail = {
            toolGroupId: this.id,
            toolName,
            toolBindingsOptions,
        };
        triggerEvent(eventTarget, Events.TOOL_ACTIVATED, eventDetail);
        this._triggerToolModeChangedEvent(toolName, Active, toolBindingsOptions);
    }
    setToolPassive(toolName, options) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool mode.`);
            return;
        }
        const prevToolOptions = this.getToolOptions(toolName);
        const toolOptions = Object.assign({
            bindings: prevToolOptions ? prevToolOptions.bindings : [],
        }, prevToolOptions, {
            mode: Passive,
        });
        const matchBindings = Array.isArray(options?.removeAllBindings)
            ? options.removeAllBindings
            : this.getDefaultPrimaryBindings();
        toolOptions.bindings = toolOptions.bindings.filter((binding) => options?.removeAllBindings !== true &&
            !matchBindings.some((matchBinding) => hasSameBinding(binding, matchBinding)));
        let mode = Passive;
        if (toolOptions.bindings.length !== 0) {
            mode = Active;
            toolOptions.mode = mode;
        }
        this.toolOptions[toolName] = toolOptions;
        toolInstance.mode = mode;
        if (typeof toolInstance.onSetToolPassive === 'function') {
            toolInstance.onSetToolPassive();
        }
        this._renderViewports();
        this._triggerToolModeChangedEvent(toolName, Passive);
    }
    setToolEnabled(toolName) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool mode.`);
            return;
        }
        const toolOptions = {
            bindings: [],
            mode: Enabled,
        };
        this.toolOptions[toolName] = toolOptions;
        toolInstance.mode = Enabled;
        if (typeof toolInstance.onSetToolEnabled === 'function') {
            toolInstance.onSetToolEnabled();
        }
        this._renderViewports();
        this._triggerToolModeChangedEvent(toolName, Enabled);
    }
    setToolDisabled(toolName) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool mode.`);
            return;
        }
        const toolOptions = {
            bindings: [],
            mode: Disabled,
        };
        this.restoreToolOptions[toolName] = this.toolOptions[toolName];
        this.toolOptions[toolName] = toolOptions;
        toolInstance.mode = Disabled;
        if (typeof toolInstance.onSetToolDisabled === 'function') {
            toolInstance.onSetToolDisabled();
        }
        this._renderViewports();
        this._triggerToolModeChangedEvent(toolName, Disabled);
    }
    getToolOptions(toolName) {
        const toolOptionsForTool = this.toolOptions[toolName];
        if (toolOptionsForTool === undefined) {
            return;
        }
        return toolOptionsForTool;
    }
    getActivePrimaryMouseButtonTool() {
        return Object.keys(this.toolOptions).find((toolName) => {
            const toolOptions = this.toolOptions[toolName];
            return (toolOptions.mode === Active &&
                this._hasMousePrimaryButtonBinding(toolOptions));
        });
    }
    setViewportsCursorByToolName(toolName, strategyName) {
        const cursor = this._getCursor(toolName, strategyName);
        this._setCursorForViewports(cursor);
    }
    _getCursor(toolName, strategyName) {
        let cursorName;
        let cursor;
        if (strategyName) {
            cursorName = `${toolName}.${strategyName}`;
            cursor = SVGMouseCursor.getDefinedCursor(cursorName, true);
            if (cursor) {
                return cursor;
            }
        }
        cursorName = `${toolName}`;
        cursor = SVGMouseCursor.getDefinedCursor(cursorName, true);
        if (cursor) {
            return cursor;
        }
        cursorName = toolName;
        cursor = SVGMouseCursor.getDefinedCursor(cursorName, true);
        if (cursor) {
            return cursor;
        }
        return MouseCursor.getDefinedCursor('default');
    }
    _setCursorForViewports(cursor) {
        this.viewportsInfo.forEach(({ renderingEngineId, viewportId }) => {
            const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
            if (!enabledElement) {
                return;
            }
            const { viewport } = enabledElement;
            initElementCursor(viewport.element, cursor);
        });
    }
    setToolConfiguration(toolName, configuration, overwrite) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not present, can't set tool configuration.`);
            return false;
        }
        let _configuration;
        if (overwrite) {
            _configuration = configuration;
        }
        else {
            _configuration = Object.assign(toolInstance.configuration, configuration);
        }
        toolInstance.configuration = _configuration;
        if (typeof toolInstance.onSetToolConfiguration === 'function') {
            toolInstance.onSetToolConfiguration();
        }
        this._renderViewports();
        return true;
    }
    getDefaultMousePrimary() {
        return MouseBindings.Primary;
    }
    getDefaultPrimaryBindings() {
        return PRIMARY_BINDINGS;
    }
    getToolConfiguration(toolName, configurationPath) {
        if (this._toolInstances[toolName] === undefined) {
            console.warn(`Tool ${toolName} not present, can't set tool configuration.`);
            return;
        }
        const _configuration = get(this._toolInstances[toolName].configuration, configurationPath) ||
            this._toolInstances[toolName].configuration;
        return utilities.deepClone(_configuration);
    }
    getPrevActivePrimaryToolName() {
        return this.prevActivePrimaryToolName;
    }
    setActivePrimaryTool(toolName) {
        const activeToolName = this.getCurrentActivePrimaryToolName();
        this.setToolDisabled(activeToolName);
        this.setToolActive(toolName, {
            bindings: [{ mouseButton: MouseBindings.Primary }],
        });
    }
    getCurrentActivePrimaryToolName() {
        return this.currentActivePrimaryToolName;
    }
    clone(newToolGroupId, fnToolFilter = null) {
        let toolGroup = getToolGroup(newToolGroupId);
        if (toolGroup) {
            console.debug(`ToolGroup ${newToolGroupId} already exists`);
            return toolGroup;
        }
        toolGroup = new ToolGroup(newToolGroupId);
        state.toolGroups.push(toolGroup);
        fnToolFilter = fnToolFilter ?? (() => true);
        Object.keys(this._toolInstances)
            .filter(fnToolFilter)
            .forEach((toolName) => {
            const sourceToolInstance = this._toolInstances[toolName];
            const sourceToolOptions = this.toolOptions[toolName];
            const sourceToolMode = sourceToolInstance.mode;
            toolGroup.addTool(toolName);
            toolGroup.setToolMode(toolName, sourceToolMode, {
                bindings: sourceToolOptions.bindings ?? [],
            });
        });
        return toolGroup;
    }
    _hasMousePrimaryButtonBinding(toolOptions) {
        const primaryBindings = this.getDefaultPrimaryBindings();
        return toolOptions?.bindings?.some((binding) => primaryBindings.some((primary) => hasSameBinding(binding, primary)));
    }
    _renderViewports() {
        this.viewportsInfo.forEach(({ renderingEngineId, viewportId }) => {
            getRenderingEngine(renderingEngineId).renderViewport(viewportId);
        });
    }
    _triggerToolModeChangedEvent(toolName, mode, toolBindingsOptions) {
        const eventDetail = {
            toolGroupId: this.id,
            toolName,
            mode,
            toolBindingsOptions,
        };
        triggerEvent(eventTarget, Events.TOOL_MODE_CHANGED, eventDetail);
    }
    _findRenderingEngine(viewportId, renderingEngineId) {
        const renderingEngines = getRenderingEngines();
        if (renderingEngines?.length === 0) {
            throw new Error('No rendering engines found.');
        }
        if (renderingEngineId) {
            return renderingEngineId;
        }
        const matchingEngines = renderingEngines.filter((engine) => engine.getViewport(viewportId));
        if (matchingEngines.length === 0) {
            if (renderingEngines.length === 1) {
                return renderingEngines[0].id;
            }
            throw new Error('No rendering engines found that contain the viewport with the same viewportId, you must specify a renderingEngineId.');
        }
        if (matchingEngines.length > 1) {
            throw new Error('Multiple rendering engines found that contain the viewport with the same viewportId, you must specify a renderingEngineId.');
        }
        return matchingEngines[0].id;
    }
}
function hasSameBinding(binding1, binding2) {
    if (binding1.mouseButton !== binding2.mouseButton) {
        return false;
    }
    if (binding1.numTouchPoints !== binding2.numTouchPoints) {
        return false;
    }
    return binding1.modifierKey === binding2.modifierKey;
}
