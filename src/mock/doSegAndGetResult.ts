// 我们目前假设项目的 wadoRSRoot 没变
interface SEGResult {
  StudyInstanceUID: string;
  SeriesInstanceUID: string;
}

export interface DataForSegAI {
  referenceStudyUID: string;
  sliceIndx: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

export const doSegAndGetResult = (
  dataForSegAI: DataForSegAI
): Promise<SEGResult> => {
  console.log(dataForSegAI);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        StudyInstanceUID: "2.25.192000203449462464300556352146497553955",
        SeriesInstanceUID: "2.25.211740913197583156653763061616189163646",
      });
    }, 1000);
  });
};
