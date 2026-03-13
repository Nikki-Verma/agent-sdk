import { AxiosInstance } from "axios";
import { SDKEndpoints } from "../types";

export const livekitTokenApi = (
  httpClient: AxiosInstance,
  endpoints: SDKEndpoints,
  { payload = {}, headers = {} }: any,
) => {
  return httpClient.post(endpoints.agents.livekitToken, payload, {
    headers,
  });
};
