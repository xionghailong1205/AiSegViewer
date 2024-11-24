import { config } from "@/config/config";
import { DataForSegAI } from "@/mock/doSegAndGetResult";

export namespace Network {
  export const getSegListOfStudy = async () => {
    let headersList = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };

    // 这里我们硬编码了, 之后我们要做修改
    let bodyContent = JSON.stringify({
      groupId: "a69c11a8-44a41043-bce22781-172adef2-e51df883",
    });

    let response = await fetch(
      `${config.aiSegServiceBaseURL}/medical/image/split/list`,
      {
        method: "POST",
        body: bodyContent,
        headers: headersList,
      }
    );

    const responseJSON = await response.json();
    return responseJSON.data;
  };

  export const createSegTask = async (segInfo: DataForSegAI) => {
    let headersList = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };

    let bodyContent = JSON.stringify(segInfo);

    let response = await fetch(
      `${config.aiSegServiceBaseURL}/dicom/data/pronet`,
      {
        method: "POST",
        body: bodyContent,
        headers: headersList,
      }
    );

    let result = await response.json();
    console.log(result);
  };
}
