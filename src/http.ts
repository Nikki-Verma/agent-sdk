import axios, { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import { SimplAISDKConfig } from "./types";
import {
  X_USER_ID,
  X_TENANT_ID,
  X_CLIENT_ID,
  X_SELLER_ID,
  X_SELLER_PROFILE_ID,
  X_PROJECT_ID,
  X_DEVICE_ID,
  PIM_SID,
  DEFAULT_DEVICE_ID,
} from "./constants";

const delay = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

interface AdaptAxiosRequestConfig extends AxiosRequestConfig {
  headers: AxiosRequestHeaders;
  __retryCount?: number;
}

/**
 * Creates an Axios instance pre-configured with SimplAI auth headers.
 *
 * The request interceptor injects `X-USER-ID`, `X-TENANT-ID`, `PIM-SID`,
 * `X-DEVICE-ID`, `X-CLIENT-ID`, `X-SELLER-ID`, `X-SELLER-PROFILE-ID`,
 * and `X-PROJECT-ID` on every outgoing request.
 *
 * The response interceptor handles the SimplAI `ok` flag convention and
 * retries up to 3 times on HTTP 511 with a 2-second delay.
 *
 * @param config - The SDK configuration with auth credentials.
 * @returns A configured Axios instance.
 */
export function createHttpClient(config: SimplAISDKConfig): AxiosInstance {
  const instance = axios.create();

  // Request interceptor — inject auth headers from SDK config
  instance.interceptors.request.use(
    async (request): Promise<AdaptAxiosRequestConfig> => {
      const defaultHeaders: Record<string, string> = {
        [X_USER_ID]: config.userId,
        [X_TENANT_ID]: config.tenantId,
        [PIM_SID]: config.apiKey,
        [X_DEVICE_ID]: config.deviceId || DEFAULT_DEVICE_ID,
        [X_CLIENT_ID]: config.userId,
        [X_SELLER_ID]: config.userId,
        [X_SELLER_PROFILE_ID]: config.userId,
        [X_PROJECT_ID]:
          (request?.headers?.[X_PROJECT_ID] as string) ?? config.projectId,
      };

      request.headers = {
        ...(request.headers || {}),
        ...defaultHeaders,
      } as AxiosRequestHeaders;

      return request as AdaptAxiosRequestConfig;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor — handle ok flag + 511 retry
  instance.interceptors.response.use(
    (response) => {
      if (typeof response?.data?.ok === "boolean") {
        if (response.data?.ok) {
          return response;
        } else {
          return Promise.reject(response);
        }
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config as AdaptAxiosRequestConfig;

      // 511 retry logic (up to 3 retries with 2s delay)
      if (originalRequest && error.response && error.response.status === 511) {
        originalRequest.__retryCount = originalRequest.__retryCount || 0;

        if (originalRequest.__retryCount < 3) {
          originalRequest.__retryCount += 1;
          await delay(2000);

          // Re-inject headers with current config
          const refreshedHeaders: Record<string, string> = {
            [X_USER_ID]: config.userId,
            [X_TENANT_ID]: config.tenantId,
            [PIM_SID]: config.apiKey,
            [X_DEVICE_ID]: config.deviceId || DEFAULT_DEVICE_ID,
            [X_CLIENT_ID]: config.userId,
            [X_SELLER_ID]: config.userId,
            [X_SELLER_PROFILE_ID]: config.userId,
          };

          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            ...refreshedHeaders,
          } as AxiosRequestHeaders;

          return instance(originalRequest);
        }
      }

      return Promise.reject(error);
    },
  );

  return instance;
}
