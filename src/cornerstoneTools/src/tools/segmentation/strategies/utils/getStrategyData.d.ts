declare function getStrategyData({ operationData, viewport }: {
    operationData: any;
    viewport: any;
}): {
    segmentationImageData: any;
    segmentationScalarData: any;
    imageScalarData: any;
    segmentationVoxelManager: any;
    imageVoxelManager: any;
};
export { getStrategyData };
