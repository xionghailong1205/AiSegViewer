import { getEnabledElement, cache, StackViewport, utilities as csUtils, } from '@cornerstonejs/core';
import { getCalibratedLengthUnitsAndScale } from '../../utilities/getCalibratedUnits';
import { vec3 } from 'gl-matrix';
import { addAnnotation, getAnnotations, removeAnnotation, } from '../../stateManagement';
import { isAnnotationLocked } from '../../stateManagement/annotation/annotationLocking';
import { drawHandles as drawHandlesSvg, drawRect as drawRectSvg, drawLinkedTextBox as drawLinkedTextBoxSvg, } from '../../drawingSvg';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import throttle from '../../utilities/throttle';
import { getTextBoxCoordsCanvas } from '../../utilities/drawing';
import getWorldWidthAndHeightFromCorners from '../../utilities/planar/getWorldWidthAndHeightFromCorners';
import { isAnnotationVisible } from '../../stateManagement/annotation/annotationVisibility';
import { hideElementCursor, resetElementCursor, } from '../../cursors/elementCursor';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { triggerAnnotationCompleted, triggerAnnotationModified, } from '../../stateManagement/annotation/helpers/state';
import RectangleROITool from '../annotation/RectangleROITool';
import { isViewportPreScaled } from '../../utilities/viewport/isViewportPreScaled';
import { BasicStatsCalculator } from '../../utilities/math/basic';
import { filterAnnotationsWithinSamePlane } from '../../utilities/planar';
import { getPixelValueUnits } from '../../utilities/getPixelValueUnits';
const { transformWorldToIndex } = csUtils;
class RectangleROIStartEndThresholdTool extends RectangleROITool {
    constructor(toolProps = {}, defaultToolProps = {
        configuration: {
            storePointData: false,
            numSlicesToPropagate: 10,
            computePointsInsideVolume: false,
            getTextLines: defaultGetTextLines,
            statsCalculator: BasicStatsCalculator,
            showTextBox: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.addNewAnnotation = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = getEnabledElement(element);
            const { viewport, renderingEngine } = enabledElement;
            this.isDrawing = true;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            let referencedImageId, imageVolume, volumeId;
            if (viewport instanceof StackViewport) {
                throw new Error('Stack Viewport Not implemented');
            }
            else {
                const targetId = this.getTargetId(viewport);
                volumeId = csUtils.getVolumeId(targetId);
                imageVolume = cache.getVolume(volumeId);
                referencedImageId = csUtils.getClosestImageId(imageVolume, worldPos, viewPlaneNormal);
            }
            const spacingInNormal = csUtils.getSpacingInNormalDirection(imageVolume, viewPlaneNormal);
            const startCoord = this._getStartCoordinate(worldPos, viewPlaneNormal);
            const endCoord = this._getEndCoordinate(worldPos, spacingInNormal, viewPlaneNormal);
            const FrameOfReferenceUID = viewport.getFrameOfReferenceUID();
            const annotation = {
                highlighted: true,
                invalidated: true,
                metadata: {
                    viewPlaneNormal: [...viewPlaneNormal],
                    enabledElement,
                    viewUp: [...viewUp],
                    FrameOfReferenceUID,
                    referencedImageId,
                    toolName: this.getToolName(),
                    volumeId,
                    spacingInNormal,
                },
                data: {
                    label: '',
                    startCoordinate: startCoord,
                    endCoordinate: endCoord,
                    cachedStats: {
                        pointsInVolume: [],
                        projectionPoints: [],
                        projectionPointsImageIds: [referencedImageId],
                        statistics: [],
                    },
                    handles: {
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
                        points: [
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                        ],
                        activeHandleIndex: null,
                    },
                    labelmapUID: null,
                },
            };
            this._computeProjectionPoints(annotation, imageVolume);
            addAnnotation(annotation, element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                handleIndex: 3,
                newAnnotation: true,
                hasMoved: false,
            };
            this._activateDraw(element);
            hideElementCursor(element);
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            return annotation;
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation, hasMoved } = this.editData;
            const { data } = annotation;
            if (newAnnotation && !hasMoved) {
                return;
            }
            data.handles.activeHandleIndex = null;
            this._deactivateModify(element);
            this._deactivateDraw(element);
            resetElementCursor(element);
            const enabledElement = getEnabledElement(element);
            this.editData = null;
            this.isDrawing = false;
            if (this.isHandleOutsideImage &&
                this.configuration.preventHandleOutsideImage) {
                removeAnnotation(annotation.annotationUID);
            }
            const targetId = this.getTargetId(enabledElement.viewport);
            const imageVolume = cache.getVolume(targetId.split(/volumeId:|\?/)[1]);
            if (this.configuration.calculatePointsInsideVolume) {
                this._computePointsInsideVolume(annotation, targetId, imageVolume, enabledElement);
            }
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
            if (newAnnotation) {
                triggerAnnotationCompleted(annotation);
            }
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport } = enabledElement;
            let annotations = getAnnotations(this.getToolName(), viewport.element);
            if (!annotations?.length) {
                return renderStatus;
            }
            annotations = filterAnnotationsWithinSamePlane(annotations, viewport.getCamera());
            const styleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
            };
            for (let i = 0; i < annotations.length; i++) {
                const annotation = annotations[i];
                const { annotationUID, data } = annotation;
                const { startCoordinate, endCoordinate } = data;
                const { points, activeHandleIndex } = data.handles;
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                styleSpecifier.annotationUID = annotationUID;
                const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
                const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
                const color = this.getStyle('color', styleSpecifier, annotation);
                const focalPoint = viewport.getCamera().focalPoint;
                const viewplaneNormal = viewport.getCamera().viewPlaneNormal;
                let startCoord = startCoordinate;
                let endCoord = endCoordinate;
                if (Array.isArray(startCoordinate)) {
                    startCoord = this._getCoordinateForViewplaneNormal(startCoord, viewplaneNormal);
                    data.startCoordinate = startCoord;
                    data.handles.points[0][this._getIndexOfCoordinatesForViewplaneNormal(viewplaneNormal)] = startCoord;
                    data.startCoordinate = startCoord;
                    data.handles.points[0][this._getIndexOfCoordinatesForViewplaneNormal(viewplaneNormal)] = startCoord;
                }
                if (Array.isArray(endCoordinate)) {
                    endCoord = this._getCoordinateForViewplaneNormal(endCoord, viewplaneNormal);
                    data.endCoordinate = endCoord;
                    data.endCoordinate = endCoord;
                }
                const roundedStartCoord = csUtils.roundToPrecision(startCoord);
                const roundedEndCoord = csUtils.roundToPrecision(endCoord);
                const coord = this._getCoordinateForViewplaneNormal(focalPoint, viewplaneNormal);
                const roundedCoord = csUtils.roundToPrecision(coord);
                if (roundedCoord < Math.min(roundedStartCoord, roundedEndCoord) ||
                    roundedCoord > Math.max(roundedStartCoord, roundedEndCoord)) {
                    continue;
                }
                if (annotation.invalidated) {
                    this._throttledCalculateCachedStats(annotation, enabledElement);
                }
                let firstOrLastSlice = false;
                if (roundedCoord === roundedStartCoord ||
                    roundedCoord === roundedEndCoord) {
                    firstOrLastSlice = true;
                }
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return renderStatus;
                }
                let activeHandleCanvasCoords;
                if (!isAnnotationVisible(annotationUID)) {
                    continue;
                }
                if (!isAnnotationLocked(annotationUID) &&
                    !this.editData &&
                    activeHandleIndex !== null &&
                    firstOrLastSlice) {
                    activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
                }
                if (activeHandleCanvasCoords) {
                    const handleGroupUID = '0';
                    drawHandlesSvg(svgDrawingHelper, annotationUID, handleGroupUID, activeHandleCanvasCoords, {
                        color,
                    });
                }
                let lineDashToUse = lineDash;
                if (!firstOrLastSlice) {
                    lineDashToUse = 2;
                }
                const rectangleUID = '0';
                drawRectSvg(svgDrawingHelper, annotationUID, rectangleUID, canvasCoordinates[0], canvasCoordinates[3], {
                    color,
                    lineDash: lineDashToUse,
                    lineWidth,
                });
                renderStatus = true;
                if (this.configuration.showTextBox &&
                    this.configuration.calculatePointsInsideVolume) {
                    const options = this.getLinkedTextBoxStyle(styleSpecifier, annotation);
                    if (!options.visibility) {
                        data.handles.textBox = {
                            hasMoved: false,
                            worldPosition: [0, 0, 0],
                            worldBoundingBox: {
                                topLeft: [0, 0, 0],
                                topRight: [0, 0, 0],
                                bottomLeft: [0, 0, 0],
                                bottomRight: [0, 0, 0],
                            },
                        };
                        continue;
                    }
                    const textLines = this.configuration.getTextLines(data);
                    if (!textLines || textLines.length === 0) {
                        continue;
                    }
                    if (!data.handles.textBox.hasMoved) {
                        const canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);
                        data.handles.textBox.worldPosition =
                            viewport.canvasToWorld(canvasTextBoxCoords);
                    }
                    const textBoxPosition = viewport.worldToCanvas(data.handles.textBox.worldPosition);
                    const textBoxUID = '1';
                    const boundingBox = drawLinkedTextBoxSvg(svgDrawingHelper, annotationUID, textBoxUID, textLines, textBoxPosition, canvasCoordinates, {}, options);
                    const { x: left, y: top, width, height } = boundingBox;
                    data.handles.textBox.worldBoundingBox = {
                        topLeft: viewport.canvasToWorld([left, top]),
                        topRight: viewport.canvasToWorld([left + width, top]),
                        bottomLeft: viewport.canvasToWorld([left, top + height]),
                        bottomRight: viewport.canvasToWorld([left + width, top + height]),
                    };
                }
            }
            return renderStatus;
        };
        this._throttledCalculateCachedStats = throttle(this._calculateCachedStatsTool, 100, { trailing: true });
    }
    _computeProjectionPoints(annotation, imageVolume) {
        const { data, metadata } = annotation;
        const { viewPlaneNormal, spacingInNormal } = metadata;
        const { imageData } = imageVolume;
        const { startCoordinate, endCoordinate } = data;
        const { points } = data.handles;
        const startIJK = transformWorldToIndex(imageData, points[0]);
        const endIJK = transformWorldToIndex(imageData, points[0]);
        const startWorld = vec3.create();
        imageData.indexToWorldVec3(startIJK, startWorld);
        const endWorld = vec3.create();
        imageData.indexToWorldVec3(endIJK, endWorld);
        if (this._getIndexOfCoordinatesForViewplaneNormal(viewPlaneNormal) == 2) {
            startWorld[2] = startCoordinate;
            endWorld[2] = endCoordinate;
        }
        else if (this._getIndexOfCoordinatesForViewplaneNormal(viewPlaneNormal) == 0) {
            startWorld[0] = startCoordinate;
            endWorld[0] = endCoordinate;
        }
        else if (this._getIndexOfCoordinatesForViewplaneNormal(viewPlaneNormal) == 1) {
            startWorld[1] = startCoordinate;
            endWorld[1] = endCoordinate;
        }
        const distance = vec3.distance(startWorld, endWorld);
        const newProjectionPoints = [];
        for (let dist = 0; dist < distance; dist += spacingInNormal) {
            newProjectionPoints.push(points.map((point) => {
                const newPoint = vec3.create();
                vec3.scaleAndAdd(newPoint, point, viewPlaneNormal, dist);
                return Array.from(newPoint);
            }));
        }
        data.cachedStats.projectionPoints = newProjectionPoints;
    }
    _computePointsInsideVolume(annotation, targetId, imageVolume, enabledElement) {
        const { data, metadata } = annotation;
        const { viewPlaneNormal, viewUp } = metadata;
        const { viewport } = enabledElement;
        const projectionPoints = data.cachedStats.projectionPoints;
        const pointsInsideVolume = [[]];
        const image = this.getTargetImageData(targetId);
        const worldPos1 = data.handles.points[0];
        const worldPos2 = data.handles.points[3];
        const { worldWidth, worldHeight } = getWorldWidthAndHeightFromCorners(viewPlaneNormal, viewUp, worldPos1, worldPos2);
        const measureInfo = getCalibratedLengthUnitsAndScale(image, data.habdles);
        const area = Math.abs(worldWidth * worldHeight) /
            (measureInfo.scale * measureInfo.scale);
        const modalityUnitOptions = {
            isPreScaled: isViewportPreScaled(viewport, targetId),
            isSuvScaled: this.isSuvScaled(viewport, targetId, annotation.metadata.referencedImageId),
        };
        const modalityUnit = getPixelValueUnits(metadata.Modality, annotation.metadata.referencedImageId, modalityUnitOptions);
        for (let i = 0; i < projectionPoints.length; i++) {
            if (!imageVolume) {
                continue;
            }
            const projectionPoint = projectionPoints[i][0];
            const { dimensions, imageData, voxelManager } = imageVolume;
            const worldPos1Index = transformWorldToIndex(imageData, worldPos1);
            const worldProjectionPointIndex = transformWorldToIndex(imageData, projectionPoint);
            const indexOfProjection = this._getIndexOfCoordinatesForViewplaneNormal(viewPlaneNormal);
            worldPos1Index[0] = Math.floor(worldPos1Index[0]);
            worldPos1Index[1] = Math.floor(worldPos1Index[1]);
            worldPos1Index[2] = Math.floor(worldPos1Index[2]);
            worldPos1Index[indexOfProjection] =
                worldProjectionPointIndex[indexOfProjection];
            const worldPos2Index = transformWorldToIndex(imageData, worldPos2);
            worldPos2Index[0] = Math.floor(worldPos2Index[0]);
            worldPos2Index[1] = Math.floor(worldPos2Index[1]);
            worldPos2Index[2] = Math.floor(worldPos2Index[2]);
            worldPos2Index[indexOfProjection] =
                worldProjectionPointIndex[indexOfProjection];
            if (this._isInsideVolume(worldPos1Index, worldPos2Index, dimensions)) {
                this.isHandleOutsideImage = false;
                const iMin = Math.min(worldPos1Index[0], worldPos2Index[0]);
                const iMax = Math.max(worldPos1Index[0], worldPos2Index[0]);
                const jMin = Math.min(worldPos1Index[1], worldPos2Index[1]);
                const jMax = Math.max(worldPos1Index[1], worldPos2Index[1]);
                const kMin = Math.min(worldPos1Index[2], worldPos2Index[2]);
                const kMax = Math.max(worldPos1Index[2], worldPos2Index[2]);
                const boundsIJK = [
                    [iMin, iMax],
                    [jMin, jMax],
                    [kMin, kMax],
                ];
                const pointsInShape = voxelManager.forEach(this.configuration.statsCalculator.statsCallback, {
                    boundsIJK,
                    imageData,
                    returnPoints: this.configuration.storePointData,
                });
                pointsInsideVolume.push(pointsInShape);
            }
        }
        const stats = this.configuration.statsCalculator.getStatistics();
        data.cachedStats.pointsInVolume = pointsInsideVolume;
        data.cachedStats.statistics = {
            Modality: metadata.Modality,
            area,
            mean: stats.mean?.value,
            stdDev: stats.stdDev?.value,
            max: stats.max?.value,
            statsArray: stats.array,
            areaUnit: measureInfo.areaUnit,
            modalityUnit,
        };
    }
    _calculateCachedStatsTool(annotation, enabledElement) {
        const data = annotation.data;
        const { viewport } = enabledElement;
        const { cachedStats } = data;
        const targetId = this.getTargetId(viewport);
        const imageVolume = cache.getVolume(targetId.split(/volumeId:|\?/)[1]);
        this._computeProjectionPoints(annotation, imageVolume);
        if (this.configuration.calculatePointsInsideVolume) {
            this._computePointsInsideVolume(annotation, targetId, imageVolume, enabledElement);
        }
        if (this.configuration.calculatePointsInsideVolume) {
            this._computePointsInsideVolume(annotation, targetId, imageVolume, enabledElement);
        }
        annotation.invalidated = false;
        triggerAnnotationModified(annotation, viewport.element);
        return cachedStats;
    }
    _getStartCoordinate(worldPos, viewPlaneNormal) {
        const startPos = worldPos;
        const startCoord = this._getCoordinateForViewplaneNormal(startPos, viewPlaneNormal);
        return startCoord;
    }
    _getEndCoordinate(worldPos, spacingInNormal, viewPlaneNormal) {
        const numSlicesToPropagate = this.configuration.numSlicesToPropagate;
        const endPos = vec3.create();
        vec3.scaleAndAdd(endPos, worldPos, viewPlaneNormal, numSlicesToPropagate * spacingInNormal);
        const endCoord = this._getCoordinateForViewplaneNormal(endPos, viewPlaneNormal);
        return endCoord;
    }
    _getIndexOfCoordinatesForViewplaneNormal(viewPlaneNormal) {
        const viewplaneNormalAbs = [
            Math.abs(viewPlaneNormal[0]),
            Math.abs(viewPlaneNormal[1]),
            Math.abs(viewPlaneNormal[2]),
        ];
        const indexOfDirection = viewplaneNormalAbs.indexOf(Math.max(...viewplaneNormalAbs));
        return indexOfDirection;
    }
    _getCoordinateForViewplaneNormal(pos, viewPlaneNormal) {
        const indexOfDirection = this._getIndexOfCoordinatesForViewplaneNormal(viewPlaneNormal);
        return pos[indexOfDirection];
    }
}
function defaultGetTextLines(data) {
    const cachedVolumeStats = data.cachedStats.statistics;
    const { area, mean, max, stdDev, areaUnit, modalityUnit } = cachedVolumeStats;
    if (mean === undefined) {
        return;
    }
    const textLines = [];
    textLines.push(`Area: ${csUtils.roundNumber(area)} ${areaUnit}`);
    textLines.push(`Mean: ${csUtils.roundNumber(mean)} ${modalityUnit}`);
    textLines.push(`Max: ${csUtils.roundNumber(max)} ${modalityUnit}`);
    textLines.push(`Std Dev: ${csUtils.roundNumber(stdDev)} ${modalityUnit}`);
    return textLines;
}
RectangleROIStartEndThresholdTool.toolName = 'RectangleROIStartEndThreshold';
export default RectangleROIStartEndThresholdTool;
