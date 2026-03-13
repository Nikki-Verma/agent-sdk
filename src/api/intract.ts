import { AxiosInstance } from "axios";
import { SDKEndpoints } from "../types";

export const initiateConversationApi = (
  httpClient: AxiosInstance,
  endpoints: SDKEndpoints,
  { payload = {}, headers = {}, signal }: any,
) => {
  return httpClient.post(endpoints.intract.initiateConversation, payload, {
    headers,
    signal,
  });
};

export const stopConversationApi = (
  httpClient: AxiosInstance,
  endpoints: SDKEndpoints,
  { messageId, payload = {}, headers = {} }: any,
) => {
  return httpClient.put(
    `${endpoints.intract.stopConversation}/${messageId}`,
    payload,
    { headers },
  );
};

export const submitUserMessageFeedbackApi = (
  httpClient: AxiosInstance,
  endpoints: SDKEndpoints,
  { payload = {}, headers = {}, signal }: any,
) => {
  return httpClient.post(endpoints.chatFeedback.submitFeedback, payload, {
    headers,
    signal,
  });
};
