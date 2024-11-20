import {
  Enums,
  RenderingEngine,
  setVolumesForViewports,
  Types,
  volumeLoader,
  cache,
  CONSTANTS,
} from "@cornerstonejs/core";
import createImageIdsAndCacheMetaData from "../lib/createImageIdsAndCacheMetaData";

import * as cornerstoneTools from "@cornerstonejs/tools";
import {
  segmentation,
  ToolGroupManager,
  Enums as toolEnums,
  TrackballRotateTool,
  annotation,
} from "@cornerstonejs/tools";
import RectangleToolForAISeg from "@/cornerstoneTools/RectangleToolForAISeg";

// 导入我们的 mock 接口
import { DataForSegAI, doSegAndGetResult } from "@/mock/doSegAndGetResult";
import { config } from "@/config/config";
import { TemporaryVolumeManager } from "./temporaryVolume";
import { useSegListService } from "@/store/useSegListService";

const { triggerSegmentationDataModified } =
  segmentation.triggerSegmentationEvents;

const { RectangleROITool, ZoomTool, StackScrollTool, PanTool } =
  cornerstoneTools;

const { ViewportType } = Enums;
const { SegmentationRepresentations } = toolEnums;

// local
const wadoRsRoot = config.wadoRsRoot;

// service
// const StudyInstanceUID = "2.25.204011655578844946459122251061839053883";
// const SeriesInstanceUID = "2.25.252553488120607950750024680258926791038";
// const wadoRsRoot = "http://localhost:8848/dicomweb";

const { MouseBindings } = cornerstoneTools.Enums;

let SEGServiceSingleton: SEGService | undefined;

export const getSEGService = () => {
  if (!SEGServiceSingleton) {
    SEGServiceSingleton = new SEGService(StudyInstanceUID, SeriesInstanceUID);
  }

  return SEGServiceSingleton;
};

export const viewportIds = {
  MPR: { AXIAL: "v5001", SAGITTAL: "v5002", CORONAL: "v5003" },
  SURFACE: {
    CORONAL: "v5004",
  },
};

class SEGService {
  private StudyInstanceUID: string;
  private SeriesInstanceUID: string;
  private MPRVolumeID: string = "MPRVolumeID";
  private segList: Array<string> = [];
  segmentationId: string = "SEGMENTATION_ID";
  segmentationVolumeId: string = "SEGMENTATION_VOLUME";
  viewToolGroupId: string = "VIEW_TOOLGROUPID";
  segToolGroupId: string = "SEG_TOOLGROUPID";
  ToolGroup3DId: string = "3D_TOOLGROUPID";
  viewToolGroup: cornerstoneTools.Types.IToolGroup;
  segToolGroup: cornerstoneTools.Types.IToolGroup;
  ToolGroup3D: cornerstoneTools.Types.IToolGroup;
  renderingEngineId: string = "myRenderingEngine";
  renderingEngine: RenderingEngine;
  isResizing: boolean = false;
  resizeObserver: ResizeObserver = new ResizeObserver(() => {
    if (this.isResizing) {
      return;
    }
    this.isResizing = !!setTimeout(() => {
      this.resize();
    }, 200);
    // this.resize();
    // console.log("代码执行");
  });

  constructor(studyInstanceUID: string, seriesInstanceUID: string) {
    this.StudyInstanceUID = studyInstanceUID;
    this.SeriesInstanceUID = seriesInstanceUID;

    this.renderingEngine = new RenderingEngine(this.renderingEngineId);

    this.viewToolGroup = ToolGroupManager.createToolGroup(this.viewToolGroupId);
    this.segToolGroup = ToolGroupManager.createToolGroup(this.segToolGroupId);
    this.ToolGroup3D = ToolGroupManager.createToolGroup(this.ToolGroup3DId);

    const StudyInstanceUID = this.StudyInstanceUID;
    const SeriesInstanceUID = this.SeriesInstanceUID;
    const MPRVolumeID = this.MPRVolumeID;

    // 加载 Volume
    createImageIdsAndCacheMetaData({
      StudyInstanceUID,
      SeriesInstanceUID,
      wadoRsRoot,
    }).then((imageIds) => {
      volumeLoader.createAndCacheVolume(MPRVolumeID, {
        imageIds,
      });
    });
  }

  async initSegMode() {
    this.registerResizeObserver();
    this.initViewport();
    this.createToolGroupAndAddViewport();
    this.loadVolume();
  }

  addEventListener() {}

  private initViewport() {
    const renderingEngine = this.renderingEngine;

    // 窗口是预布局的
    const axialViewport = document.getElementById("v5001") as HTMLDivElement;
    const sagittalViewport = document.getElementById("v5002") as HTMLDivElement;
    const cornalViewport = document.getElementById("v5003") as HTMLDivElement;
    const surfaceViewport = document.getElementById("v5004") as HTMLDivElement;

    const viewportInputArray = [
      {
        viewportId: viewportIds.MPR.AXIAL,
        type: ViewportType.ORTHOGRAPHIC,
        element: axialViewport,
        defaultOptions: {
          orientation: Enums.OrientationAxis.AXIAL,
        },
      },
      {
        viewportId: viewportIds.MPR.SAGITTAL,
        type: ViewportType.ORTHOGRAPHIC,
        element: sagittalViewport,
        defaultOptions: {
          orientation: Enums.OrientationAxis.SAGITTAL,
        },
      },
      {
        viewportId: viewportIds.MPR.CORONAL,
        type: ViewportType.ORTHOGRAPHIC,
        element: cornalViewport,
        defaultOptions: {
          orientation: Enums.OrientationAxis.CORONAL,
        },
      },
      {
        viewportId: viewportIds.SURFACE.CORONAL,
        type: ViewportType.VOLUME_3D,
        element: surfaceViewport,
        defaultOptions: {
          background: CONSTANTS.BACKGROUND_COLORS.slicer3D,
        },
      },
    ];

    renderingEngine.setViewports(viewportInputArray);
  }

  private async loadVolume() {
    const MPRVolumeID = this.MPRVolumeID;
    const renderingEngine = this.renderingEngine;

    const volume = cache.getVolume(this.MPRVolumeID);

    volume.load();

    await setVolumesForViewports(
      renderingEngine,
      [
        {
          volumeId: MPRVolumeID,
        },
      ],
      [viewportIds.MPR.AXIAL, viewportIds.MPR.SAGITTAL, viewportIds.MPR.CORONAL]
    );

    renderingEngine.render();
  }

  private createToolGroupAndAddViewport() {
    cornerstoneTools.addTool(ZoomTool);
    cornerstoneTools.addTool(PanTool);
    cornerstoneTools.addTool(RectangleROITool);
    cornerstoneTools.addTool(StackScrollTool);
    cornerstoneTools.addTool(RectangleToolForAISeg);
    cornerstoneTools.addTool(TrackballRotateTool);

    const toolGroupList = [this.viewToolGroup, this.segToolGroup];

    toolGroupList.forEach((toolGroup) => {
      toolGroup.addTool(PanTool.toolName);
      toolGroup.addTool(ZoomTool.toolName);
      toolGroup.addTool(StackScrollTool.toolName);

      toolGroup.setToolActive(ZoomTool.toolName, {
        bindings: [
          {
            mouseButton: MouseBindings.Secondary,
          },
        ],
      });

      toolGroup.setToolActive(PanTool.toolName, {
        bindings: [
          {
            mouseButton: MouseBindings.Auxiliary,
          },
        ],
      });

      if (toolGroup.id === this.segToolGroupId) {
        toolGroup.addTool(RectangleToolForAISeg.toolName);

        toolGroup.setToolActive(RectangleToolForAISeg.toolName, {
          bindings: [
            {
              mouseButton: MouseBindings.Primary,
            },
          ],
        });

        toolGroup.setToolActive(StackScrollTool.toolName, {
          bindings: [
            {
              mouseButton: MouseBindings.Wheel,
            },
          ],
        });
      } else {
        toolGroup.setToolActive(StackScrollTool.toolName, {
          bindings: [
            {
              mouseButton: MouseBindings.Primary,
            },
            {
              mouseButton: MouseBindings.Wheel,
            },
          ],
        });
      }
    });

    [viewportIds.MPR.CORONAL, viewportIds.MPR.SAGITTAL].forEach(
      (viewportId) => {
        this.viewToolGroup.addViewport(viewportId);
      }
    );

    this.ToolGroup3D.addTool(TrackballRotateTool.toolName);

    this.ToolGroup3D.setToolActive(TrackballRotateTool.toolName, {
      bindings: [
        {
          mouseButton: MouseBindings.Primary,
        },
      ],
    });

    this.segToolGroup.addViewport(viewportIds.MPR.AXIAL);

    this.ToolGroup3D.addViewport(viewportIds.SURFACE.CORONAL);
  }

  registerResizeObserver() {
    const viewportLayouter = document.getElementById("viewportLayouter");
    console.log(viewportLayouter);
    const resizeObserver = this.resizeObserver;

    console.log("注册操作执行.");
    resizeObserver.observe(viewportLayouter);
  }

  resize() {
    this.isResizing = false;

    const renderingEngine = this.renderingEngine;
    const viewportList =
      renderingEngine.getViewports() as Array<Types.IStackViewport>;

    console.log(viewportList);

    const viewportPresentationList = viewportList.map((viewport) => {
      return viewport.getViewPresentation();
    });

    renderingEngine.resize(true, false);

    viewportList.forEach((viewport, i) => {
      viewport.setViewPresentation(viewportPresentationList[i]);
    });
  }

  registerEventListener() {
    const mprViewportIdList = Object.values(viewportIds.MPR);

    mprViewportIdList.forEach((viewportId) => {
      document.getElementById(viewportId) as HTMLDivElement;
    });
  }

  private _generateRandomScalar() {
    return Math.floor(Math.random() * 255);
  }

  getSegmentationId(index) {
    return `SEG_${index}`;
  }

  // dataForSegAI: DataForSegAI 暂时不需要
  async addSegData(segData: DataForSegAI, idOfSelectedAnnotation: string) {
    const segmentationId = crypto.randomUUID();

    console.log(segData);

    // // 我们在这里初始化我们的 seg volume
    // const segmentationVolume = volumeLoader.createAndCacheDerivedLabelmapVolume(
    //   this.MPRVolumeID,
    //   {
    //     volumeId: segmentationId,
    //   }
    // );

    // const segVoxelManager = segmentationVolume.voxelManager;

    // let temporaryVolumeManger = new TemporaryVolumeManager({
    //   StudyInstanceUID: "2.25.192000203449462464300556352146497553955",
    //   SeriesInstanceUID: "2.25.211740913197583156653763061616189163646",
    // });

    // const temporaryVolume = await temporaryVolumeManger.getVolume();

    // segmentation.addSegmentations([
    //   {
    //     segmentationId,
    //     representation: {
    //       type: SegmentationRepresentations.Labelmap,
    //       data: {
    //         volumeId: segmentationId,
    //       },
    //     },
    //   },
    // ]);

    // const segmentationRepresentation = {
    //   segmentationId,
    // };

    // segmentation.addLabelmapRepresentationToViewportMap({
    //   [viewportIds.MPR.AXIAL]: [segmentationRepresentation],
    //   [viewportIds.MPR.SAGITTAL]: [segmentationRepresentation],
    //   [viewportIds.MPR.CORONAL]: [segmentationRepresentation],
    // });

    // temporaryVolume.load(() => {
    //   setTimeout(() => {
    //     const segData =
    //       temporaryVolume.voxelManager.getCompleteScalarDataArray();

    //     const randomScalar = this._generateRandomScalar();

    //     segData.forEach((value, index) => {
    //       if (value === 1) {
    //         segVoxelManager.setAtIndex(index, randomScalar);
    //       }
    //     });

    //     temporaryVolumeManger.destoryVolume();

    //     // 我们在这个位置去调用 UI 中的
    //     useSegListService.getState().addNewSeg(segmentationId);
    //     alert("分割成功");
    //     // 删除所有的 分割矩形
    //     annotation.state.removeAnnotation(idOfSelectedAnnotation);
    //     segmentation.addSegmentationRepresentations(
    //       viewportIds.SURFACE.CORONAL,
    //       [
    //         {
    //           segmentationId: segmentationId,
    //           type: SegmentationRepresentations.Surface,
    //           options: {
    //             polySeg: {
    //               enabled: true,
    //             },
    //           },
    //         },
    //       ]
    //     );

    //     triggerSegmentationDataModified(segmentationId);
    //   }, 1000);
    // });
  }

  generateSurface() {
    segmentation.addSegmentationRepresentations(viewportIds.SURFACE.CORONAL, [
      {
        segmentationId: this.segmentationId,
        type: SegmentationRepresentations.Surface,
        options: {
          polySeg: {
            enabled: true,
          },
        },
      },
    ]);
  }

  removeSeg(segmentationId) {
    segmentation.removeSegmentation(segmentationId);

    segmentation.removeSurfaceRepresentation(
      viewportIds.SURFACE.CORONAL,
      segmentationId
    );

    cache.removeVolumeLoadObject(segmentationId);

    this.renderingEngine
      .getViewport(viewportIds.SURFACE.CORONAL)
      .removeAllActors();
  }
}
