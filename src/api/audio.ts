import { AxiosInstance } from "axios";
import { SDKEndpoints } from "../types";

export const audioTokenApi = (
  httpClient: AxiosInstance,
  endpoints: SDKEndpoints,
  { payload = {}, headers = {} }: any,
) => {
  return httpClient.post(endpoints.agents.AudioToken, payload, {
    headers,
  });
};
