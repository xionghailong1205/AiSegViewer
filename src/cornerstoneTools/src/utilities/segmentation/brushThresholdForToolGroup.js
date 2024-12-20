import { getToolGroup } from '../../store/ToolGroupManager';
import triggerAnnotationRenderForViewportIds from '../triggerAnnotationRenderForViewportIds';
import { getRenderingEngine } from '@cornerstonejs/core';
import { getBrushToolInstances } from './getBrushToolInstances';
export function setBrushThresholdForToolGroup(toolGroupId, threshold, otherArgs = { isDynamic: false }) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const brushBasedToolInstances = getBrushToolInstances(toolGroupId);
    const configuration = {
        ...otherArgs,
        ...(threshold !== undefined && { threshold }),
    };
    brushBasedToolInstances.forEach((tool) => {
        tool.configuration.strategySpecificConfiguration.THRESHOLD = {
            ...tool.configuration.strategySpecificConfiguration.THRESHOLD,
            ...configuration,
        };
    });
    const viewportsInfo = toolGroup.getViewportsInfo();
    if (!viewportsInfo.length) {
        return;
    }
    const { renderingEngineId } = viewportsInfo[0];
    const viewportIds = toolGroup.getViewportIds();
    const renderingEngine = getRenderingEngine(renderingEngineId);
    triggerAnnotationRenderForViewportIds(viewportIds);
}
export function getBrushThresholdForToolGroup(toolGroupId) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const toolInstances = toolGroup._toolInstances;
    if (!Object.keys(toolInstances).length) {
        return;
    }
    const brushBasedToolInstances = getBrushToolInstances(toolGroupId);
    const brushToolInstance = brushBasedToolInstances[0];
    if (!brushToolInstance) {
        return;
    }
    return brushToolInstance.configuration.strategySpecificConfiguration.THRESHOLD
        .threshold;
}
