import {
  Enums,
  RenderingEngine,
  setVolumesForViewports,
  Types,
  volumeLoader,
  cache,
} from "@cornerstonejs/core";
import createImageIdsAndCacheMetaData from "../lib/createImageIdsAndCacheMetaData";

import * as cornerstoneTools from "@cornerstonejs/tools";
import { ToolGroupManager } from "@cornerstonejs/tools";
import RectangleToolForAISeg from "@/cornerstoneTools/RectangleToolForAISeg";

// 导入我们的 mock 接口
import { DataForSegAI, doSegAndGetResult } from "@/mock/doSegAndGetResult";

const { RectangleROITool, ZoomTool, StackScrollTool, PanTool } =
  cornerstoneTools;

const { ViewportType } = Enums;

const StudyInstanceUID = "1.2.840.31314.14143234.20160621082358.3303189";
const SeriesInstanceUID = "1.3.46.670589.11.42556.5.0.5368.2016062111130713198";
const wadoRsRoot = "http://localhost:5985";

const { MouseBindings } = cornerstoneTools.Enums;

let SEGServiceSingleton: SEGService | undefined;

export const getSEGService = () => {
  if (!SEGServiceSingleton) {
    SEGServiceSingleton = new SEGService(StudyInstanceUID, SeriesInstanceUID);
  }

  return SEGServiceSingleton;
};

const viewportIds = {
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
  segmentationId: string = "SEGMENTATION_VOLUME";
  toolGroupId: string = "SEG_VIEW_TOOLGROUPID";
  renderingEngineId: string = "myRenderingEngine";
  renderingEngine: RenderingEngine;
  toolGroup: cornerstoneTools.Types.IToolGroup;
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
    this.toolGroup = ToolGroupManager.createToolGroup(this.toolGroupId);

    const StudyInstanceUID = this.StudyInstanceUID;
    const SeriesInstanceUID = this.SeriesInstanceUID;
    const MPRVolumeID = this.MPRVolumeID;

    // 加载 Volume
    createImageIdsAndCacheMetaData({
      StudyInstanceUID,
      SeriesInstanceUID,
      wadoRsRoot,
    }).then((imageIds) => {
      volumeLoader
        .createAndCacheVolume(MPRVolumeID, {
          imageIds,
        })
        .then(() => {
          // 我们在这里初始化我们的 seg volume
          volumeLoader.createAndCacheDerivedLabelmapVolume(this.MPRVolumeID, {
            volumeId: this.segmentationId,
          });
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
          orientation: Enums.OrientationAxis.CORONAL,
        },
      },
    ];

    renderingEngine.setViewports(viewportInputArray);
  }

  private async loadVolume() {
    const StudyInstanceUID = this.StudyInstanceUID;
    const SeriesInstanceUID = this.SeriesInstanceUID;
    const MPRVolumeID = this.MPRVolumeID;
    const renderingEngine = this.renderingEngine;

    // // 加载 Volume
    // const imageIds = await createImageIdsAndCacheMetaData({
    //   StudyInstanceUID,
    //   SeriesInstanceUID,
    //   wadoRsRoot,
    // });

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

    const toolGroup = this.toolGroup;

    toolGroup.addTool(PanTool.toolName);
    toolGroup.addTool(ZoomTool.toolName);
    toolGroup.addTool(StackScrollTool.toolName);
    toolGroup.addTool(RectangleToolForAISeg.toolName);
    toolGroup.addTool(RectangleROITool.toolName);

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

    toolGroup.setToolActive(StackScrollTool.toolName, {
      bindings: [
        // {
        //   mouseButton: MouseBindings.Primary,
        // },
        {
          mouseButton: MouseBindings.Wheel,
        },
      ],
    });

    toolGroup.setToolActive(RectangleToolForAISeg.toolName, {
      bindings: [
        {
          mouseButton: MouseBindings.Primary,
        },
      ],
    });

    const viewportIdList = Object.values(viewportIds.MPR);

    viewportIdList.forEach((viewportId) => {
      toolGroup.addViewport(viewportId);
      console.log(viewportId);
    });
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

  addSegData(dataForSegAI: DataForSegAI) {
    const segmentationVolume = cache.getVolume(
      this.segmentationId
    ) as ImageVolume;
  }
}
