import React, { createContext, useContext, useMemo } from "react";
import endpoints from "../api/endpoints";
import { createHttpClient } from "../http";
import { SimplAIContextValue, SimplAISDKConfig } from "../types";

const SimplAIContext = createContext<SimplAIContextValue | null>(null);

/**
 * Props for the {@link SimplAIProvider} component.
 *
 * @property config - SDK configuration containing agentId, apiKey, tenantId, projectId, userId.
 * @property children - React node tree that will have access to SDK hooks.
 */
export interface SimplAIProviderProps {
  config: SimplAISDKConfig;
  children: React.ReactNode;
}

/**
 * React context provider that initialises the SimplAI SDK.
 *
 * Wrap your component tree with this provider to make all SDK hooks
 * (`useSimplAIVoiceAgent`, `useChatStream`, `useSimplaiAudio`) available.
 *
 * It creates a shared authenticated HTTP client and configures the API
 * endpoints automatically. The HTTP client injects auth headers
 * (`X-USER-ID`, `X-TENANT-ID`, `PIM-SID`, `X-PROJECT-ID`, etc.) on
 * every request based on the provided config.
 *
 * @example
 * ```tsx
 * import { SimplAIProvider } from "@simplai.ai/voice-agent-sdk";
 *
 * <SimplAIProvider config={{
 *   agentId: "agent-123",
 *   apiKey: "sk-xxx",
 *   tenantId: "tenant-1",
 *   projectId: "proj-1",
 *   userId: "user-1",
 * }}>
 *   <App />
 * </SimplAIProvider>
 * ```
 */
export function SimplAIProvider({ config, children }: SimplAIProviderProps) {
  const value = useMemo<SimplAIContextValue>(
    () => ({
      config,
      httpClient: createHttpClient(config),
      endpoints,
    }),
    [config],
  );

  return (
    <SimplAIContext.Provider value={value}>{children}</SimplAIContext.Provider>
  );
}

/**
 * Hook to access the SimplAI SDK context.
 *
 * Returns the SDK configuration, the authenticated HTTP client (Axios
 * instance), and the resolved API endpoints. Primarily useful for making
 * custom API calls with the same auth headers the SDK uses internally.
 *
 * Must be used within a {@link SimplAIProvider}.
 *
 * @throws {Error} If called outside of a SimplAIProvider.
 *
 * @example
 * ```tsx
 * const { httpClient, endpoints, config } = useSimplAIContext();
 * const res = await httpClient.get(`${endpoints.agents.details}/${config.agentId}`);
 * ```
 */
export function useSimplAIContext(): SimplAIContextValue {
  const ctx = useContext(SimplAIContext);
  if (!ctx) {
    throw new Error(
      "useSimplAIContext must be used within a SimplAIProvider. " +
        "Wrap your component tree with <SimplAIProvider config={...}>.",
    );
  }
  return ctx;
}
