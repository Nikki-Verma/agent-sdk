// ─── Provider ────────────────────────────────────────────────────────────────
export { SimplAIProvider, useSimplAIContext } from "./context/SimplAIProvider";
export type { SimplAIProviderProps } from "./context/SimplAIProvider";

// ─── Hooks ───────────────────────────────────────────────────────────────────
export { default as useChatStream } from "./hooks/useChatStream";
export { default as useSimplaiAudio } from "./hooks/useSimplaiAudio";
export { default as useSimplAIVoiceAgent } from "./hooks/useSimplAIVoiceAgent";

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  AgentDetails,
  AgentToolDrawerConfig,
  Artifact,
  ChatArtifacts,
  ChatConfig,
  ChatMessage,
  Headers,
  HttpMethod,
  Params,
  SDKEndpoints,
  SimplAIContextValue,
  SimplAISDKConfig,
  UnknownObject,
  UseChatStreamInput,
  UseChatStreamInputMethod,
  UseChatStreamOptions,
  UseChatStreamReturn,
  useSimplaiAudioProps,
  useSimplaiAudioReturn,
  UseSimplAIVoiceAgentOptions,
  UseSimplAIVoiceAgentReturn,
  VoiceStatus,
} from "./types";

export { ChunkType } from "./types";

// ─── Utilities ───────────────────────────────────────────────────────────────
export { createRoom } from "./utils/audio";
export {
  checkValidStringifiedJSON,
  getBrowserUseState,
  getCleanMarkdownString,
  getErrorFromApi,
} from "./utils/helpers";
export {
  decodeStreamToJson,
  getChatDetails,
  getChatMessage,
} from "./utils/stream";

// ─── API Functions ───────────────────────────────────────────────────────────
export { fetchAgentDetailsApi, updateArtifactApi } from "./api/agents";
export { audioTokenApi } from "./api/audio";
export {
  initiateConversationApi,
  stopConversationApi,
  submitUserMessageFeedbackApi,
} from "./api/intract";

// ─── Constants ───────────────────────────────────────────────────────────────
export {
  AGENT_SOCKET_ENDPOINT,
  EDGE_EXTERNAL_URL,
  EDGE_URL,
  RNNOISE_BASE,
  SIMD_WASM,
  WASM_URL,
  WORKLET_URL,
} from "./constants";
