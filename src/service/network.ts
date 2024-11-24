import { config } from "@/config/config";
import { DataForSegAI } from "@/mock/doSegAndGetResult";

export namespace Network {
  export const getSegListOfStudy = async () => {
    let headersList = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };

    let bodyContent = JSON.stringify({
      groupId,
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
    return result;
  };

  export const deleteSegResultOnServer = async (segId) => {
    let headersList = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };

    let bodyContent = JSON.stringify({
      id: segId,
    });

    let response = await fetch(
      `${config.aiSegServiceBaseURL}/medical/image/split/delete`,
      {
        method: "POST",
        body: bodyContent,
        headers: headersList,
      }
    );

    const result = await response.json();

    console.log(result);

    return result;
  };
}
