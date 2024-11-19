import type { Segmentation } from '../../types/SegmentationStateTypes';
declare function getActiveSegmentation(viewportId: string): Segmentation;
declare function setActiveSegmentation(viewportId: string, segmentationId: string, suppressEvent?: boolean): void;
export { getActiveSegmentation, setActiveSegmentation, };
