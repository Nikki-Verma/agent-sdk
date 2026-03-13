import { AxiosInstance } from "axios";
import { Participant, Room, Track } from "livekit-client";
import { ChangeEvent, FormEvent } from "react";

// ─── Core Utility Types ───────────────────────────────────────────────────────

export interface UnknownObject {
  [key: string]: any;
}

// ─── SDK Configuration ────────────────────────────────────────────────────────

export interface SimplAISDKConfig {
  agentId: string;
  apiKey: string;
  tenantId: string;
  projectId: string;
  userId: string;
  deviceId?: string;
}

// ─── SDK Context ──────────────────────────────────────────────────────────────

export interface SDKEndpoints {
  agents: {
    details: string;
    livekitToken: string;
    updateArtifact: string;
    fetchArtifacts: string;
  };
  intract: {
    initiateConversation: string;
    stopConversation: string;
    streamResponse: string;
    chatDetails: string;
    chatHistoryList: string;
  };
  chatFeedback: {
    submitFeedback: string;
  };
}

export interface SimplAIContextValue {
  config: SimplAISDKConfig;
  httpClient: AxiosInstance;
  endpoints: SDKEndpoints;
}

// ─── Chat Types ───────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: "SimplAi" | "user";
  content: string;
  id: string;
  tools?: null | UnknownObject[];
  citations?: null | UnknownObject;
  followUpMessages?: null | any[];
  tool_citations?: null | any[];
  message_liked?: boolean | null;
  feedback_remark?: string | null;
  trace?: null | UnknownObject;
  planning_details?: null | UnknownObject;
  artifact_details?: null | UnknownObject;
};

export type Artifact = {
  title: string;
  code?: string;
  full_markdown?: string;
  content?: string;
  language?: string;
  index: number;
  type: "code" | "text";
};

export type ChatArtifacts = {
  id: string | undefined;
  contents: Artifact[];
  current_index: number | undefined;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type UseChatStreamOptions = {
  url: string;
  method: HttpMethod;
  query?: Record<string, string>;
  headers?: HeadersInit;
  body?: Record<string, string>;
};

export type UseChatStreamInputMethod = {
  type: "body" | "query";
  key: string;
};

export interface ChatConfig {
  model: string;
  language_code?: string;
  source?: string;
  app_id: string;
  model_id: string;
  version_id?: string;
}

export type UseChatStreamInput = {
  convId?: string;
  messages?: ChatMessage[];
  chatConfig?: ChatConfig;
  projectId?: string | null;
  customAttributes?: UnknownObject | undefined | null;
};

export enum ChunkType {
  TOOL_CALLS = "tool_calls",
  TOOL = "tool",
  CITATION = "Citation",
  FOLLOW_UP_MESSAGE = "follow_up_message",
  TOOL_CITATION_MESSAGE = "tool_citation_message",
  TRACE = "trace",
  PLAN_INITIATION = "plan_initiation",
  STEP_EXECUTION_INFO = "step_execution_info",
  STEP_OBSERVATION = "step_observation",
  STEP_EVALUATION = "step_evaluation",
  NEXT_GOAL = "next_goal",
  PLANNING_TOOL_CALLS = "planning_tool_calls",
  PLANNING_TOOL = "planning_tool",
  PLANNING_EXECUTED = "planning_executed",
  THINKING_DURATION = "thinking_duration",
  BROWSER_AGENT_ACTION = "browser_agent_action",
  ARTIFACT_INITIATED = "artifact_initiated",
  ARTIFACT_COMPLETED = "artifact_completed",
}

// ─── Voice / LiveKit Types ────────────────────────────────────────────────────

export type VoiceStatus = "idle" | "connecting" | "connected" | "error";

export interface AgentDetails {
  id?: string;
  agent_id: string;
  agent_name?: string;
  version_id?: string;
  pipeline_id?: string;
  citations?: any;
  tool_citations?: any;
  config?: any;
  socketEndpoint?: string;
  welcome_message?: { message?: string };
  start_messages?: any[];
  youtube_url?: string;
  capabilities_url?: string;
}

export type UseLivekitAudioProps = {
  agentDetails: {
    agent_id: any;
    agent_name?: any;
    version_id?: any;
    citations?: boolean;
    tool_citations?: boolean;
    config?: any;
    socketEndpoint?: any;
  };
  userDetails?: {
    name: string | undefined;
    id: any;
  };
  setMessages: (values: any) => void;
  changeConversation: (values: any) => void;
  conversationId?: any;
  startSession?: any;
  endSession?: any;
  handleChunkSpeak?: any;
  enableAgentThinkingMode?: any;
  disableAgentThinkingMode?: any;
  hasAvatar?: boolean;
  projectId?: string | null;
};

// ─── Composite Hook Types ─────────────────────────────────────────────────────

export interface UseSimplAIVoiceAgentOptions {
  conversationId?: string;
  customAttributes?: UnknownObject | undefined | null;
  startSession?: () => void;
  endSession?: () => void;
  handleChunkSpeak?: (text: string) => void;
  enableAgentThinkingMode?: () => void;
  disableAgentThinkingMode?: () => void;
  hasAvatar?: boolean;
}

export interface AgentToolDrawerConfig {
  messageId: string | undefined;
  allTools: any[];
  selectedToolCallId: string | undefined;
}

export interface UseChatStreamReturn {
  conversationId: string | undefined;
  setConversationId: React.Dispatch<React.SetStateAction<string | undefined>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleInputChange: (
    e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  handleSubmit: (
    e?: FormEvent<HTMLFormElement>,
    newMessage?: string,
    additionalConfig?: UnknownObject,
  ) => Promise<null | undefined>;
  isLoading: boolean;
  chatStreaming: boolean;
  stopStream: () => Promise<void>;
  chatConfig: any;
  setChatConfig: React.Dispatch<React.SetStateAction<any>>;
  changeConversation: (convId: string | undefined) => Promise<void>;
  changeConversationLoading: boolean;
  custAtrr: UnknownObject | undefined | null;
  setCustAtrr: React.Dispatch<
    React.SetStateAction<UnknownObject | undefined | null>
  >;
  resetCustAtrr: () => void;
  submitMessageFeedback: (
    liked: boolean,
    messageObj: ChatMessage,
    remark?: string,
  ) => Promise<void>;
  projectId: string | null | undefined;
  setProjectId: React.Dispatch<React.SetStateAction<string | null | undefined>>;
  agentToolDrawerConfig: AgentToolDrawerConfig;
  setAgentToolDrawerConfig: React.Dispatch<
    React.SetStateAction<AgentToolDrawerConfig>
  >;
  agentToolDrawerVisible: boolean;
  setAgentToolDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  stopConversation: () => Promise<void>;
  artifacts: ChatArtifacts;
  setArtifacts: React.Dispatch<React.SetStateAction<ChatArtifacts>>;
  agentArtifactDrawerVisible: boolean;
  setAgentArtifactDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  closeAgentArtifactDrawer: () => void;
  updateArtifact: any;
  resetConversation: () => Promise<void>;
}

export interface UseLivekitAudioReturn {
  status: VoiceStatus;
  room: Room | null;
  participants: Participant[];
  error: string | null;
  audioTracks: { [key: string]: Track | null };
  agentConnected: boolean;
  isMicrophoneEnabled: boolean;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  connectToRoom: () => Promise<void>;
  handleDisconnect: () => void;
  interuptAgent: () => void;
  toggleMuteLocalParticipant: (isMuted: boolean) => void;
  setVoiceConversationId: React.Dispatch<React.SetStateAction<any>>;
  voiceConversationId: any;
  conversationProjectId: string | null | undefined;
  setConversationProjectId: React.Dispatch<
    React.SetStateAction<string | null | undefined>
  >;
}

export interface UseSimplAIVoiceAgentReturn extends UseChatStreamReturn {
  // Agent state
  agentDetails: AgentDetails | null;
  agentLoading: boolean;
  agentError: string | null;
  refetchAgentDetails: () => void;

  // Voice
  voiceStatus: VoiceStatus;
  voiceRoom: Room | null;
  voiceParticipants: Participant[];
  voiceError: string | null;
  voiceAudioTracks: { [key: string]: Track | null };
  agentConnected: boolean;
  isMicrophoneEnabled: boolean;
  connectToRoom: () => Promise<void>;
  disconnectFromRoom: () => void;
  interruptAgent: () => void;
  toggleMute: (isMuted: boolean) => void;
  voiceConversationId: any;
  setVoiceConversationId: React.Dispatch<React.SetStateAction<any>>;
  conversationProjectId: string | null | undefined;
  setConversationProjectId: React.Dispatch<
    React.SetStateAction<string | null | undefined>
  >;
}

// ─── API Params ───────────────────────────────────────────────────────────────

export interface Params {
  [key: string]: any;
}

export interface Headers {
  [key: string]: any;
}
