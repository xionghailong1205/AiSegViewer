import { create } from "zustand";
import { produce } from "immer";
import { Network } from "@/service/network";
import { getMockSegList } from "@/api/mock";
import { getSEGService, SegInfoForAddSeg } from "@/service/segService";

export interface SegInfoFromServer {
  id: string;
  parentPatient: string;
  parentSeries: string;
  parentStudy: string;
}

export interface SegInfo {
  status: "compelete" | "processing" | "loading";
  segId: string;
}

interface state {
  segList: Array<SegInfo>;
  taskIndex: number;
}

interface action {
  addNewSegAfterLoading: (loadingId: string, segId: string) => void;
  removeSeg: (segId: string) => void;
  updateSegList: () => void;
  addNewTask: () => string;
  addNewLoading: () => string;
  // clearTaskAfterRequest: (taskId: string) => void
}

interface SegListServiceProp extends state, action {}

export const useSegListService = create<SegListServiceProp>((set, get) => ({
  segList: [],
  taskIndex: 0,
  addNewTask() {
    const segId = `Task-${get().taskIndex}`;

    const newSegInfo: SegInfo = {
      status: "processing",
      segId,
    };

    set(
      produce((state: state) => {
        state.segList.push(newSegInfo);
        state.taskIndex++;
      })
    );

    return segId;
  },
  addNewLoading() {
    const segId = `Load-${get().taskIndex}`;

    const newSegInfo: SegInfo = {
      status: "loading",
      segId,
    };

    set(
      produce((state: state) => {
        state.segList.push(newSegInfo);
        state.taskIndex++;
      })
    );

    return segId;
  },
  addNewSegAfterLoading(loadingId, segId) {
    set(
      produce((state: state) => {
        state.segList = state.segList.map((segInfo) => {
          if (segInfo.segId === loadingId) {
            return {
              status: "compelete",
              segId,
            };
          } else {
            return segInfo;
          }
        });
      })
    );
  },
  removeSeg(segId) {
    set(
      produce((state: state) => {
        state.segList = state.segList.filter((segInfo) => {
          return segInfo.segId !== segId;
        });
      })
    );
  },
  // TODO: 这里之后做一个简单的修改
  async updateSegList() {
    const result = await Network.getSegListOfStudy();
    const segService = getSEGService();

    console.log(result);

    const segList: Array<SegInfoForAddSeg> = result.map(
      (segInfo: SegInfoFromServer) => {
        return {
          studyId: segInfo.parentStudy,
          serieId: segInfo.parentSeries,
          segId: segInfo.id,
        };
      }
    );

    async function* addSeg() {
      const dataListForAddSegIntoViewport = segList.map((segInfo) => {
        const dataForAddSegIntoViewport = segService.requestSegImage(segInfo);

        return dataForAddSegIntoViewport;
      });

      for (const dataForAddSegIntoViewport of dataListForAddSegIntoViewport) {
        const { segInfo, loadingId } = dataForAddSegIntoViewport;

        await segService.addSegIntoViewport(segInfo, loadingId);
        yield result;
      }
    }

    for await (const result of addSeg()) {
      console.log(result);
    }
  },
}));
