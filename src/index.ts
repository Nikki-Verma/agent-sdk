// ─── Provider ────────────────────────────────────────────────────────────────
export { SimplAIProvider } from "./context/SimplAIProvider";
export type { SimplAIProviderProps } from "./context/SimplAIProvider";
export { useSimplAIContext } from "./context/SimplAIProvider";

// ─── Hooks ───────────────────────────────────────────────────────────────────
export { default as useChatStream } from "./hooks/useChatStream";
export { default as useLivekitAudio } from "./hooks/useLivekitAudio";
export { default as useSimplAIVoiceAgent } from "./hooks/useSimplAIVoiceAgent";

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  SimplAISDKConfig,
  SimplAIContextValue,
  SDKEndpoints,
  ChatMessage,
  Artifact,
  ChatArtifacts,
  ChatConfig,
  UseChatStreamInput,
  UseChatStreamOptions,
  UseChatStreamInputMethod,
  HttpMethod,
  VoiceStatus,
  AgentDetails,
  UseLivekitAudioProps,
  UseSimplAIVoiceAgentOptions,
  UseSimplAIVoiceAgentReturn,
  UseChatStreamReturn,
  UseLivekitAudioReturn,
  AgentToolDrawerConfig,
  UnknownObject,
  Params,
  Headers,
} from "./types";

export { ChunkType } from "./types";

// ─── Utilities ───────────────────────────────────────────────────────────────
export { getChatDetails, getChatMessage, decodeStreamToJson } from "./utils/stream";
export { createRoom } from "./utils/livekit";
export {
  getErrorFromApi,
  checkValidStringifiedJSON,
  getBrowserUseState,
  getCleanMarkdownString,
} from "./utils/helpers";

// ─── API Functions ───────────────────────────────────────────────────────────
export { fetchAgentDetailsApi, updateArtifactApi } from "./api/agents";
export { livekitTokenApi } from "./api/audio";
export {
  initiateConversationApi,
  stopConversationApi,
  submitUserMessageFeedbackApi,
} from "./api/intract";

// ─── Constants ───────────────────────────────────────────────────────────────
export {
  EDGE_URL,
  EDGE_EXTERNAL_URL,
  AGENT_SOCKET_ENDPOINT,
  RNNOISE_BASE,
  WORKLET_URL,
  WASM_URL,
  SIMD_WASM,
} from "./constants";
