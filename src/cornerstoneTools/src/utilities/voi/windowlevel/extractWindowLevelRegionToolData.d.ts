declare function extractWindowLevelRegionToolData(viewport: any): {
    scalarData: import("packages/core/dist/esm/types").PixelDataTypedArray;
    minPixelValue: number;
    maxPixelValue: number;
    width: number;
    height: number;
    rows: number;
    columns: number;
} | {
    scalarData: any;
    width: any;
    height: any;
    minPixelValue: number;
    maxPixelValue: number;
    rows: any;
    columns: any;
    color: any;
};
export { extractWindowLevelRegionToolData };
