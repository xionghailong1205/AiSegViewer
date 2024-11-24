import { SegInfoForAddSeg } from "@/service/segService";

export const getMockSegList = (): Array<SegInfoForAddSeg> => {
  return [
    {
      serieId: "2.25.261936377641658559782837906601953779344",
      studyId: "2.25.98602829611283476058306768830325938884",
      segId: "094c2f2e-12359bf7-5ec3884a-2b72ee29-c710bf54",
    },
    {
      serieId: "2.25.247059792783263843575318653147291668668",
      studyId: "2.25.4773110629651245465906749874387070403",
      segId: "315f0d35-09cd3eda-084a82d2-96acf67e-6437f977",
    },
  ];
};
