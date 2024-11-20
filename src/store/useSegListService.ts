import { create } from "zustand";
import { produce } from "immer";

export interface SegInfo {
  name: string;
  segId: string;
}

interface state {
  segList: Array<SegInfo>;
}

interface action {
  addNewSeg: (segId: string) => void;
  removeSeg: (segId: string) => void;
}

interface SegListServiceProp extends state, action {}

export const useSegListService = create<SegListServiceProp>((set, get) => ({
  segList: [],
  addNewSeg(segId) {
    const newSegInfo: SegInfo = {
      // 之后可以自定义
      name: `分割`,
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
}));
