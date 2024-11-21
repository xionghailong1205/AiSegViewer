// 获取完整的 URL
const baseURL =
  window.location.protocol +
  "//" +
  window.location.hostname +
  ":" +
  window.location.port;

export const config = {
  // dev
  wadoRsRoot: `${baseURL}/localDicomWeb`,
  // produce
  // wadoRsRoot: `${baseURL}/onlineDicomweb`,
  aiSegServiceBaseURL: "https://hz-jcy-1.matpool.com:26335/dicom/data/pronet",
};
