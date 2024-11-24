import { create } from "zustand";
import { produce } from "immer";
import { Network } from "@/service/network";
import { getMockSegList } from "@/api/mock";
import { getSEGService, SegInfoForAddSeg } from "@/service/segService";

interface SegInfoFromServer {
  id: string;
  parentPatient: string;
  parentSeries: string;
  parentStudy: string;
}

export interface SegInfo {
  status: "compelete" | "processing";
  segId: string;
}

interface state {
  segList: Array<SegInfo>;
  taskIndex: number;
}

interface action {
  addNewSeg: (segId: string) => void;
  removeSeg: (segId: string) => void;
  updateSegList: () => void;
  addNewTask: () => void;
}

interface SegListServiceProp extends state, action {}

export const useSegListService = create<SegListServiceProp>((set, get) => ({
  segList: [],
  taskIndex: 0,
  addNewTask() {
    const newSegInfo: SegInfo = {
      status: "processing",
      segId: `Task-${get().taskIndex}`,
    };

    set(
      produce((state: state) => {
        state.segList.push(newSegInfo);
        state.taskIndex++;
      })
    );
  },
  addNewSeg(segId) {
    const newSegInfo: SegInfo = {
      // 之后可以自定义
      status: "compelete",
      segId,
    };

    set(
      produce((state: state) => {
        state.segList.push(newSegInfo);
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

    console.log(segList);

    // const segList = getMockSegList();

    async function* addSeg() {
      for (const segInfo of segList) {
        const result = await segService.addSeg(segInfo);
        yield result;
      }
    }

    for await (const result of addSeg()) {
      console.log(result);
    }
  },
}));
