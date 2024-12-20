export default function createBidirectionalToolData(bidirectionalData, viewport) {
    const { majorAxis, minorAxis, label = '', sliceIndex } = bidirectionalData;
    const [major0, major1] = majorAxis;
    const [minor0, minor1] = minorAxis;
    const points = [major0, major1, minor0, minor1];
    const bidirectionalToolData = {
        highlighted: true,
        invalidated: true,
        metadata: {
            toolName: 'Bidirectional',
            ...viewport.getViewReference({ sliceIndex }),
        },
        data: {
            handles: {
                points,
                textBox: {
                    hasMoved: false,
                    worldPosition: [0, 0, 0],
                    worldBoundingBox: {
                        topLeft: [0, 0, 0],
                        topRight: [0, 0, 0],
                        bottomLeft: [0, 0, 0],
                        bottomRight: [0, 0, 0],
                    },
                },
                activeHandleIndex: null,
            },
            label,
            cachedStats: {},
        },
        isLocked: false,
        isVisible: true,
    };
    return bidirectionalToolData;
}
