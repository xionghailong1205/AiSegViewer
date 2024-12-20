import { vec3 } from 'gl-matrix';
import StrategyCallbacks from '../../../../enums/StrategyCallbacks';
export default {
    [StrategyCallbacks.Initialize]: (operationData) => {
        const { operationName, centerIJK, strategySpecificConfiguration, segmentationVoxelManager, imageVoxelManager, segmentIndex, } = operationData;
        const { THRESHOLD } = strategySpecificConfiguration;
        if (!THRESHOLD?.isDynamic || !centerIJK || !segmentIndex) {
            return;
        }
        if (operationName === StrategyCallbacks.RejectPreview ||
            operationName === StrategyCallbacks.OnInteractionEnd) {
            return;
        }
        const boundsIJK = segmentationVoxelManager.getBoundsIJK();
        const { threshold: oldThreshold, dynamicRadius = 0 } = THRESHOLD;
        const useDelta = oldThreshold ? 0 : dynamicRadius;
        const nestedBounds = boundsIJK.map((ijk, idx) => {
            const [min, max] = ijk;
            return [
                Math.max(min, centerIJK[idx] - useDelta),
                Math.min(max, centerIJK[idx] + useDelta),
            ];
        });
        const threshold = oldThreshold || [Infinity, -Infinity];
        const callback = ({ value }) => {
            const gray = Array.isArray(value) ? vec3.len(value) : value;
            threshold[0] = Math.min(gray, threshold[0]);
            threshold[1] = Math.max(gray, threshold[1]);
        };
        imageVoxelManager.forEach(callback, { boundsIJK: nestedBounds });
        operationData.strategySpecificConfiguration.THRESHOLD.threshold = threshold;
    },
    [StrategyCallbacks.OnInteractionStart]: (operationData) => {
        const { strategySpecificConfiguration, preview } = operationData;
        if (!strategySpecificConfiguration?.THRESHOLD?.isDynamic && !preview) {
            return;
        }
        strategySpecificConfiguration.THRESHOLD.threshold = null;
    },
    [StrategyCallbacks.ComputeInnerCircleRadius]: (operationData) => {
        const { configuration, viewport } = operationData;
        const { THRESHOLD: { dynamicRadius = 0 } = {} } = configuration.strategySpecificConfiguration || {};
        if (dynamicRadius === 0) {
            return;
        }
        const imageData = viewport.getImageData();
        if (!imageData) {
            return;
        }
        const { spacing } = imageData;
        const centerCanvas = [
            viewport.element.clientWidth / 2,
            viewport.element.clientHeight / 2,
        ];
        const radiusInWorld = dynamicRadius * spacing[0];
        const centerCursorInWorld = viewport.canvasToWorld(centerCanvas);
        const offSetCenterInWorld = centerCursorInWorld.map((coord) => coord + radiusInWorld);
        const offSetCenterCanvas = viewport.worldToCanvas(offSetCenterInWorld);
        const dynamicRadiusInCanvas = Math.abs(centerCanvas[0] - offSetCenterCanvas[0]);
        const { strategySpecificConfiguration, activeStrategy } = configuration;
        if (!strategySpecificConfiguration[activeStrategy]) {
            strategySpecificConfiguration[activeStrategy] = {};
        }
        strategySpecificConfiguration[activeStrategy].dynamicRadiusInCanvas =
            dynamicRadiusInCanvas;
    },
};
