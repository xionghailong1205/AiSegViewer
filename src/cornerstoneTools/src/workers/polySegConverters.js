import { expose } from "comlink";
import { utilities } from "@cornerstonejs/core";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkPlane from "@kitware/vtk.js/Common/DataModel/Plane";
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkContourLoopExtraction from "@kitware/vtk.js/Filters/General/ContourLoopExtraction";
import vtkCutter from "@kitware/vtk.js/Filters/Core/Cutter";
import { getBoundingBoxAroundShapeWorld } from "../utilities/boundingBox";
import {
  containsPoint,
  getAABB,
  projectTo2D,
} from "../utilities/math/polyline";
import { isPlaneIntersectingAABB } from "../utilities/planar";
import ICRPolySeg from "../icrPolySeg";

const polySegConverters = {
  polySeg: null,
  polySegInitializing: false,
  polySegInitializingPromise: null,
  async initializePolySeg(progressCallback) {
    if (this.polySegInitializing) {
      await this.polySegInitializingPromise;
      return;
    }
    if (this.polySeg?.instance) {
      return;
    }
    this.polySegInitializing = true;
    this.polySegInitializingPromise = new Promise((resolve) => {
      this.polySeg = new ICRPolySeg();
      this.polySeg
        .initialize({
          updateProgress: progressCallback,
        })
        .then(() => {
          this.polySegInitializing = false;
          resolve();
        });
    });
    await this.polySegInitializingPromise;
  },
  async convertContourToSurface(args, ...callbacks) {
    const { polylines, numPointsArray } = args;
    const [progressCallback] = callbacks;
    await this.initializePolySeg(progressCallback);
    const results = await this.polySeg.instance.convertContourRoiToSurface(
      polylines,
      numPointsArray
    );
    return results;
  },
  async convertLabelmapToSurface(args, ...callbacks) {
    const [progressCallback] = callbacks;
    await this.initializePolySeg(progressCallback);
    const results = this.polySeg.instance.convertLabelmapToSurface(
      args.scalarData,
      args.dimensions,
      args.spacing,
      args.direction,
      args.origin,
      [args.segmentIndex]
    );
    return results;
  },
  async convertContourToVolumeLabelmap(args, ...callbacks) {
    const [progressCallback] = callbacks;
    const polySeg = await new ICRPolySeg();
    await polySeg.initialize({
      updateProgress: progressCallback,
    });
    const {
      segmentIndices,
      scalarData,
      annotationUIDsInSegmentMap,
      dimensions,
      origin,
      direction,
      spacing,
    } = args;
    const segmentationVoxelManager =
      utilities.VoxelManager.createScalarVolumeVoxelManager({
        dimensions,
        scalarData,
      });
    const imageData = vtkImageData.newInstance();
    imageData.setDimensions(dimensions);
    imageData.setOrigin(origin);
    imageData.setDirection(direction);
    imageData.setSpacing(spacing);
    const scalarArray = vtkDataArray.newInstance({
      name: "Pixels",
      numberOfComponents: 1,
      values: scalarData,
    });
    imageData.getPointData().setScalars(scalarArray);
    imageData.modified();
    for (const index of segmentIndices) {
      const annotations = annotationUIDsInSegmentMap.get(index);
      for (const annotation of annotations) {
        if (!annotation.polyline) {
          continue;
        }
        const { polyline, holesPolyline } = annotation;
        const bounds = getBoundingBoxAroundShapeWorld(polyline);
        const [iMin, jMin, kMin] = utilities.transformWorldToIndex(imageData, [
          bounds[0][0],
          bounds[1][0],
          bounds[2][0],
        ]);
        const [iMax, jMax, kMax] = utilities.transformWorldToIndex(imageData, [
          bounds[0][1],
          bounds[1][1],
          bounds[2][1],
        ]);
        const { projectedPolyline, sharedDimensionIndex } =
          projectTo2D(polyline);
        const holes = holesPolyline?.map((hole) => {
          const { projectedPolyline: projectedHole } = projectTo2D(hole);
          return projectedHole;
        });
        const firstDim = (sharedDimensionIndex + 1) % 3;
        const secondDim = (sharedDimensionIndex + 2) % 3;
        const voxels = utilities.VoxelManager.createScalarVolumeVoxelManager({
          dimensions,
          scalarData,
        });
        voxels.forEach(
          ({ pointIJK }) => {
            segmentationVoxelManager.setAtIJKPoint(pointIJK, index);
          },
          {
            imageData,
            isInObject: (pointLPS) => {
              const point2D = [pointLPS[firstDim], pointLPS[secondDim]];
              const isInside = containsPoint(projectedPolyline, point2D, {
                holes,
              });
              return isInside;
            },
            boundsIJK: [
              [iMin, iMax],
              [jMin, jMax],
              [kMin, kMax],
            ],
          }
        );
      }
    }
    return segmentationVoxelManager.scalarData;
  },
  async convertContourToStackLabelmap(args, ...callbacks) {
    const [progressCallback] = callbacks;
    const polySeg = await new ICRPolySeg();
    await polySeg.initialize({
      updateProgress: progressCallback,
    });
    const { segmentationsInfo, annotationUIDsInSegmentMap, segmentIndices } =
      args;
    const segmentationVoxelManagers = new Map();
    segmentationsInfo.forEach((segmentationInfo, referencedImageId) => {
      const { dimensions, scalarData, direction, spacing, origin } =
        segmentationInfo;
      const manager = utilities.VoxelManager.createScalarVolumeVoxelManager({
        dimensions,
        scalarData,
      });
      const imageData = vtkImageData.newInstance();
      imageData.setDimensions(dimensions);
      imageData.setOrigin(origin);
      imageData.setDirection(direction);
      imageData.setSpacing(spacing);
      const scalarArray = vtkDataArray.newInstance({
        name: "Pixels",
        numberOfComponents: 1,
        values: scalarData,
      });
      imageData.getPointData().setScalars(scalarArray);
      imageData.modified();
      segmentationVoxelManagers.set(referencedImageId, { manager, imageData });
    });
    for (const index of segmentIndices) {
      const annotations = annotationUIDsInSegmentMap.get(index);
      for (const annotation of annotations) {
        if (!annotation.polyline) {
          continue;
        }
        const { polyline, holesPolyline, referencedImageId } = annotation;
        const bounds = getBoundingBoxAroundShapeWorld(polyline);
        const { manager: segmentationVoxelManager, imageData } =
          segmentationVoxelManagers.get(referencedImageId);
        const [iMin, jMin, kMin] = utilities.transformWorldToIndex(imageData, [
          bounds[0][0],
          bounds[1][0],
          bounds[2][0],
        ]);
        const [iMax, jMax, kMax] = utilities.transformWorldToIndex(imageData, [
          bounds[0][1],
          bounds[1][1],
          bounds[2][1],
        ]);
        const { projectedPolyline, sharedDimensionIndex } =
          projectTo2D(polyline);
        const holes = holesPolyline?.map((hole) => {
          const { projectedPolyline: projectedHole } = projectTo2D(hole);
          return projectedHole;
        });
        const firstDim = (sharedDimensionIndex + 1) % 3;
        const secondDim = (sharedDimensionIndex + 2) % 3;
        const voxels = utilities.VoxelManager.createImageVoxelManager({
          width: imageData.getDimensions()[0],
          height: imageData.getDimensions()[1],
          scalarData: imageData.getPointData().getScalars().getData(),
        });
        voxels.forEach(
          ({ pointIJK }) => {
            segmentationVoxelManager.setAtIJKPoint(pointIJK, index);
          },
          {
            imageData,
            isInObject: (pointLPS) => {
              const point2D = [pointLPS[firstDim], pointLPS[secondDim]];
              const isInside = containsPoint(projectedPolyline, point2D, {
                holes,
              });
              return isInside;
            },
            boundsIJK: [
              [iMin, iMax],
              [jMin, jMax],
              [kMin, kMax],
            ],
          }
        );
      }
    }
    segmentationsInfo.forEach((segmentationInfo, referencedImageId) => {
      const { manager: segmentationVoxelManager } =
        segmentationVoxelManagers.get(referencedImageId);
      segmentationInfo.scalarData = segmentationVoxelManager.scalarData;
    });
    return segmentationsInfo;
  },
  async convertSurfaceToVolumeLabelmap(args, ...callbacks) {
    const [progressCallback] = callbacks;
    await this.initializePolySeg(progressCallback);
    const results = this.polySeg.instance.convertSurfaceToLabelmap(
      args.points,
      args.polys,
      args.dimensions,
      args.spacing,
      args.direction,
      args.origin
    );
    return results;
  },
  async convertSurfacesToVolumeLabelmap(args, ...callbacks) {
    const [progressCallback] = callbacks;
    await this.initializePolySeg(progressCallback);
    const { segmentsInfo } = args;
    const promises = Array.from(segmentsInfo.keys()).map((segmentIndex) => {
      const { points, polys } = segmentsInfo.get(segmentIndex);
      const result = this.polySeg.instance.convertSurfaceToLabelmap(
        points,
        polys,
        args.dimensions,
        args.spacing,
        args.direction,
        args.origin
      );
      return {
        ...result,
        segmentIndex,
      };
    });
    const results = await Promise.all(promises);
    const targetImageData = vtkImageData.newInstance();
    targetImageData.setDimensions(args.dimensions);
    targetImageData.setOrigin(args.origin);
    targetImageData.setSpacing(args.spacing);
    targetImageData.setDirection(args.direction);
    const totalSize =
      args.dimensions[0] * args.dimensions[1] * args.dimensions[2];
    const scalarArray = vtkDataArray.newInstance({
      name: "Pixels",
      numberOfComponents: 1,
      values: new Uint8Array(totalSize),
    });
    targetImageData.getPointData().setScalars(scalarArray);
    targetImageData.modified();
    const { dimensions } = args;
    const scalarData = targetImageData.getPointData().getScalars().getData();
    const segmentationVoxelManager =
      utilities.VoxelManager.createScalarVolumeVoxelManager({
        dimensions,
        scalarData,
      });
    const outputVolumesInfo = results.map((result) => {
      const { data, dimensions, direction, origin, spacing } = result;
      const volume = vtkImageData.newInstance();
      volume.setDimensions(dimensions);
      volume.setOrigin(origin);
      volume.setSpacing(spacing);
      volume.setDirection(direction);
      const scalarArray = vtkDataArray.newInstance({
        name: "Pixels",
        numberOfComponents: 1,
        values: data,
      });
      volume.getPointData().setScalars(scalarArray);
      volume.modified();
      const voxelManager =
        utilities.VoxelManager.createScalarVolumeVoxelManager({
          dimensions,
          scalarData: data,
        });
      const extent = volume.getExtent();
      return {
        volume,
        voxelManager,
        extent,
        scalarData: data,
        segmentIndex: result.segmentIndex,
      };
    });
    const voxels = utilities.VoxelManager.createScalarVolumeVoxelManager({
      dimensions: targetImageData.getDimensions(),
      scalarData: targetImageData.getPointData().getScalars().getData(),
    });
    voxels.forEach(
      ({ pointIJK, pointLPS }) => {
        try {
          for (const volumeInfo of outputVolumesInfo) {
            const { volume, extent, voxelManager, segmentIndex } = volumeInfo;
            const index = volume.worldToIndex(pointLPS);
            if (
              index[0] < extent[0] ||
              index[0] > extent[1] ||
              index[1] < extent[2] ||
              index[1] > extent[3] ||
              index[2] < extent[4] ||
              index[2] > extent[5]
            ) {
              continue;
            }
            const roundedIndex = index.map(Math.round);
            const value = voxelManager.getAtIJK(...roundedIndex);
            if (value > 0) {
              segmentationVoxelManager.setAtIJKPoint(pointIJK, segmentIndex);
              break;
            }
          }
        } catch (error) {}
      },
      { imageData: targetImageData }
    );
    return segmentationVoxelManager.scalarData;
  },
  getSurfacesAABBs({ surfacesInfo }) {
    const aabbs = new Map();
    for (const { points, id } of surfacesInfo) {
      const aabb = getAABB(points, { numDimensions: 3 });
      aabbs.set(id, aabb);
    }
    return aabbs;
  },
  cutSurfacesIntoPlanes(
    { planesInfo, surfacesInfo, surfacesAABB = new Map() },
    progressCallback,
    updateCacheCallback
  ) {
    const numberOfPlanes = planesInfo.length;
    const cutter = vtkCutter.newInstance();
    const plane1 = vtkPlane.newInstance();
    cutter.setCutFunction(plane1);
    const surfacePolyData = vtkPolyData.newInstance();
    try {
      for (const [index, planeInfo] of planesInfo.entries()) {
        const { sliceIndex, planes } = planeInfo;
        const polyDataResults = new Map();
        for (const polyDataInfo of surfacesInfo) {
          const { points, polys, id, segmentIndex } = polyDataInfo;
          const aabb3 =
            surfacesAABB.get(id) || getAABB(points, { numDimensions: 3 });
          if (!surfacesAABB.has(id)) {
            surfacesAABB.set(id, aabb3);
          }
          const { minX, minY, minZ, maxX, maxY, maxZ } = aabb3;
          const { origin, normal } = planes[0];
          if (
            !isPlaneIntersectingAABB(
              origin,
              normal,
              minX,
              minY,
              minZ,
              maxX,
              maxY,
              maxZ
            )
          ) {
            continue;
          }
          surfacePolyData.getPoints().setData(points, 3);
          surfacePolyData.getPolys().setData(polys, 3);
          surfacePolyData.modified();
          cutter.setInputData(surfacePolyData);
          plane1.setOrigin(origin);
          plane1.setNormal(normal);
          try {
            cutter.update();
          } catch (e) {
            console.warn("Error during clipping", e);
            continue;
          }
          const polyData = cutter.getOutputData();
          const cutterOutput = polyData;
          cutterOutput.buildLinks();
          const loopExtraction = vtkContourLoopExtraction.newInstance();
          loopExtraction.setInputData(cutterOutput);
          const loopOutput = loopExtraction.getOutputData();
          if (polyData) {
            polyDataResults.set(segmentIndex, {
              points: loopOutput.getPoints().getData(),
              lines: loopOutput.getLines().getData(),
              numberOfCells: loopOutput.getLines().getNumberOfCells(),
              segmentIndex,
            });
          }
        }
        progressCallback({ progress: (index + 1) / numberOfPlanes });
        updateCacheCallback({ sliceIndex, polyDataResults });
      }
    } catch (e) {
      console.warn("Error during processing", e);
    } finally {
      surfacesInfo = null;
      plane1.delete();
    }
  },
};
expose(polySegConverters);
