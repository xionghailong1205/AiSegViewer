type pixelUnitsOptions = {
    isPreScaled: boolean;
    isSuvScaled: boolean;
};
declare function getPixelValueUnits(modality: string, imageId: string, options: pixelUnitsOptions): string;
export type { pixelUnitsOptions };
export { getPixelValueUnits };
