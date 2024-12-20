import { cache as cornerstoneCache } from '@cornerstonejs/core';
import vtkImageMarchingSquares from '@kitware/vtk.js/Filters/General/ImageMarchingSquares';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import { getDeduplicatedVTKPolyDataPoints } from './getDeduplicatedVTKPolyDataPoints';
import { findContoursFromReducedSet } from './contourFinder';
import SegmentationRepresentations from '../../enums/SegmentationRepresentations';
const { Labelmap } = SegmentationRepresentations;
function generateContourSetsFromLabelmap({ segmentations }) {
    const { representationData, segments = [0, 1] } = segmentations;
    const { volumeId: segVolumeId } = representationData[Labelmap];
    const vol = cornerstoneCache.getVolume(segVolumeId);
    if (!vol) {
        console.warn(`No volume found for ${segVolumeId}`);
        return;
    }
    const numSlices = vol.dimensions[2];
    const voxelManager = vol.voxelManager;
    const pixelsPerSlice = vol.dimensions[0] * vol.dimensions[1];
    for (let z = 0; z < numSlices; z++) {
        for (let y = 0; y < vol.dimensions[1]; y++) {
            const index = y * vol.dimensions[0] + z * pixelsPerSlice;
            voxelManager.setAtIndex(index, 0);
            voxelManager.setAtIndex(index + vol.dimensions[0] - 1, 0);
        }
    }
    const ContourSets = [];
    const { FrameOfReferenceUID } = vol.metadata;
    const numSegments = segments.length;
    for (let segIndex = 0; segIndex < numSegments; segIndex++) {
        const segment = segments[segIndex];
        if (!segment) {
            continue;
        }
        const sliceContours = [];
        const scalars = vtkDataArray.newInstance({
            name: 'Scalars',
            numberOfComponents: 1,
            size: pixelsPerSlice * numSlices,
            dataType: 'Uint8Array',
        });
        const { containedSegmentIndices } = segment;
        for (let sliceIndex = 0; sliceIndex < numSlices; sliceIndex++) {
            if (isSliceEmptyForSegment(sliceIndex, voxelManager, pixelsPerSlice, segIndex)) {
                continue;
            }
            const frameStart = sliceIndex * pixelsPerSlice;
            try {
                for (let i = 0; i < pixelsPerSlice; i++) {
                    const value = voxelManager.getAtIndex(i + frameStart);
                    if (value === segIndex || containedSegmentIndices?.has(value)) {
                        scalars.setValue(i + frameStart, 1);
                    }
                    else {
                        scalars.setValue(i, 0);
                    }
                }
                const mSquares = vtkImageMarchingSquares.newInstance({
                    slice: sliceIndex,
                });
                const imageDataCopy = vtkImageData.newInstance();
                imageDataCopy.shallowCopy(vol.imageData);
                imageDataCopy.getPointData().setScalars(scalars);
                mSquares.setInputData(imageDataCopy);
                const cValues = [1];
                mSquares.setContourValues(cValues);
                mSquares.setMergePoints(false);
                const msOutput = mSquares.getOutputData();
                const reducedSet = getDeduplicatedVTKPolyDataPoints(msOutput);
                if (reducedSet.points?.length) {
                    const contours = findContoursFromReducedSet(reducedSet.lines);
                    sliceContours.push({
                        contours,
                        polyData: reducedSet,
                        FrameNumber: sliceIndex + 1,
                        sliceIndex,
                        FrameOfReferenceUID,
                    });
                }
            }
            catch (e) {
                console.warn(sliceIndex);
                console.warn(e);
            }
        }
        const metadata = {
            FrameOfReferenceUID,
        };
        const ContourSet = {
            label: segment.label,
            color: segment.color,
            metadata,
            sliceContours,
        };
        ContourSets.push(ContourSet);
    }
    return ContourSets;
}
function isSliceEmptyForSegment(sliceIndex, voxelManager, pixelsPerSlice, segIndex) {
    const startIdx = sliceIndex * pixelsPerSlice;
    const endIdx = startIdx + pixelsPerSlice;
    for (let i = startIdx; i < endIdx; i++) {
        if (voxelManager.getAtIndex(i) === segIndex) {
            return false;
        }
    }
    return true;
}
export { generateContourSetsFromLabelmap };
