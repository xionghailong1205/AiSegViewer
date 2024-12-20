import { Enums, utilities } from '@cornerstonejs/core';
const { CalibrationTypes } = Enums;
const PIXEL_UNITS = 'px';
const SUPPORTED_REGION_DATA_TYPES = [
    1,
];
const SUPPORTED_LENGTH_VARIANT = [
    '3,3',
];
const SUPPORTED_PROBE_VARIANT = [
    '4,3',
];
const UNIT_MAPPING = {
    0: 'px',
    1: 'percent',
    2: 'dB',
    3: 'cm',
    4: 'seconds',
    5: 'hertz',
    6: 'dB/seconds',
    7: 'cm/sec',
    8: 'cm\xb2',
    9: 'cm\xb2/s',
    0xc: 'degrees',
};
const EPS = 1e-3;
const SQUARE = '\xb2';
const getCalibratedLengthUnitsAndScale = (image, handles) => {
    const { calibration, hasPixelSpacing } = image;
    let unit = hasPixelSpacing ? 'mm' : PIXEL_UNITS;
    let areaUnit = unit + SQUARE;
    let scale = 1;
    let calibrationType = '';
    if (!calibration ||
        (!calibration.type && !calibration.sequenceOfUltrasoundRegions)) {
        return { unit, areaUnit, scale };
    }
    if (calibration.type === CalibrationTypes.UNCALIBRATED) {
        return { unit: PIXEL_UNITS, areaUnit: PIXEL_UNITS + SQUARE, scale };
    }
    if (calibration.sequenceOfUltrasoundRegions) {
        let imageIndex1, imageIndex2;
        if (Array.isArray(handles) && handles.length === 2) {
            [imageIndex1, imageIndex2] = handles;
        }
        else if (typeof handles === 'function') {
            const points = handles();
            imageIndex1 = points[0];
            imageIndex2 = points[1];
        }
        let regions = calibration.sequenceOfUltrasoundRegions.filter((region) => imageIndex1[0] >= region.regionLocationMinX0 &&
            imageIndex1[0] <= region.regionLocationMaxX1 &&
            imageIndex1[1] >= region.regionLocationMinY0 &&
            imageIndex1[1] <= region.regionLocationMaxY1 &&
            imageIndex2[0] >= region.regionLocationMinX0 &&
            imageIndex2[0] <= region.regionLocationMaxX1 &&
            imageIndex2[1] >= region.regionLocationMinY0 &&
            imageIndex2[1] <= region.regionLocationMaxY1);
        if (!regions?.length) {
            return { unit, areaUnit, scale };
        }
        regions = regions.filter((region) => SUPPORTED_REGION_DATA_TYPES.includes(region.regionDataType) &&
            SUPPORTED_LENGTH_VARIANT.includes(`${region.physicalUnitsXDirection},${region.physicalUnitsYDirection}`));
        if (!regions.length) {
            return {
                unit: PIXEL_UNITS,
                areaUnit: PIXEL_UNITS + SQUARE,
                scale,
            };
        }
        const region = regions[0];
        const physicalDeltaX = Math.abs(region.physicalDeltaX);
        const physicalDeltaY = Math.abs(region.physicalDeltaY);
        const isSamePhysicalDelta = utilities.isEqual(physicalDeltaX, physicalDeltaY, EPS);
        if (isSamePhysicalDelta) {
            scale = 1 / physicalDeltaX;
            calibrationType = 'US Region';
            unit = UNIT_MAPPING[region.physicalUnitsXDirection] || 'unknown';
            areaUnit = unit + SQUARE;
        }
        else {
            return {
                unit: PIXEL_UNITS,
                areaUnit: PIXEL_UNITS + SQUARE,
                scale,
            };
        }
    }
    else if (calibration.scale) {
        scale = calibration.scale;
    }
    const types = [
        CalibrationTypes.ERMF,
        CalibrationTypes.USER,
        CalibrationTypes.ERROR,
        CalibrationTypes.PROJECTION,
    ];
    if (types.includes(calibration?.type)) {
        calibrationType = calibration.type;
    }
    return {
        unit: unit + (calibrationType ? ` ${calibrationType}` : ''),
        areaUnit: areaUnit + (calibrationType ? ` ${calibrationType}` : ''),
        scale,
    };
};
const getCalibratedProbeUnitsAndValue = (image, handles) => {
    const [imageIndex] = handles;
    const { calibration } = image;
    let units = ['raw'];
    let values = [null];
    let calibrationType = '';
    if (!calibration ||
        (!calibration.type && !calibration.sequenceOfUltrasoundRegions)) {
        return { units, values };
    }
    if (calibration.sequenceOfUltrasoundRegions) {
        const supportedRegionsMetadata = calibration.sequenceOfUltrasoundRegions.filter((region) => SUPPORTED_REGION_DATA_TYPES.includes(region.regionDataType) &&
            SUPPORTED_PROBE_VARIANT.includes(`${region.physicalUnitsXDirection},${region.physicalUnitsYDirection}`));
        if (!supportedRegionsMetadata?.length) {
            return { units, values };
        }
        const region = supportedRegionsMetadata.find((region) => imageIndex[0] >= region.regionLocationMinX0 &&
            imageIndex[0] <= region.regionLocationMaxX1 &&
            imageIndex[1] >= region.regionLocationMinY0 &&
            imageIndex[1] <= region.regionLocationMaxY1);
        if (!region) {
            return { units, values };
        }
        const { referencePixelX0 = 0, referencePixelY0 = 0 } = region;
        const { physicalDeltaX, physicalDeltaY } = region;
        const yValue = (imageIndex[1] - region.regionLocationMinY0 - referencePixelY0) *
            physicalDeltaY;
        const xValue = (imageIndex[0] - region.regionLocationMinX0 - referencePixelX0) *
            physicalDeltaX;
        calibrationType = 'US Region';
        values = [xValue, yValue];
        units = [
            UNIT_MAPPING[region.physicalUnitsXDirection],
            UNIT_MAPPING[region.physicalUnitsYDirection],
        ];
    }
    return {
        units,
        values,
        calibrationType,
    };
};
const getCalibratedAspect = (image) => image.calibration?.aspect || 1;
export { getCalibratedLengthUnitsAndScale, getCalibratedAspect, getCalibratedProbeUnitsAndValue, };
