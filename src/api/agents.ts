import { AxiosInstance } from "axios";
import { SDKEndpoints, UnknownObject } from "../types";

export const fetchAgentDetailsApi = (
  httpClient: AxiosInstance,
  endpoints: SDKEndpoints,
  { agentId, headers = {} }: { agentId: string; headers?: UnknownObject },
) => {
  return httpClient.get(`${endpoints.agents.details}/${agentId}`, { headers });
};

export const updateArtifactApi = (
  httpClient: AxiosInstance,
  endpoints: SDKEndpoints,
  {
    artifactId,
    payload = {},
    headers = {},
  }: {
    artifactId?: string;
    payload?: UnknownObject;
    headers?: UnknownObject;
  },
) => {
  return httpClient.put(
    `${endpoints.agents.updateArtifact}/${artifactId}`,
    payload,
    { headers },
  );
};
