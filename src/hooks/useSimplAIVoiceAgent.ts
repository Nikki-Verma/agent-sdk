import { useCallback, useEffect, useState } from "react";
import { fetchAgentDetailsApi } from "../api/agents";
import { X_PROJECT_ID } from "../constants";
import { useSimplAIContext } from "../context/SimplAIProvider";
import {
  AgentDetails,
  UseSimplAIVoiceAgentOptions,
  UseSimplAIVoiceAgentReturn,
} from "../types";
import useChatStream from "./useChatStream";
import useSimplaiAudio from "./useSimplaiAudio";

/**
 * Primary composite hook for the SimplAI Voice Agent SDK.
 *
 * Automatically fetches agent details on mount, initialises both the SSE
 * text-chat stream (`useChatStream`) and the voice room
 * (`useSimplaiAudio`), and returns a single flat API that is the superset
 * of both hooks plus agent-detail state.
 *
 * Must be used within a `SimplAIProvider`.
 *
 * @param options - Optional callbacks and configuration.
 * @param options.conversationId - Resume an existing conversation by ID.
 * @param options.customAttributes - Additional attributes sent with chat requests.
 * @param options.startSession - Callback fired when the voice session starts (avatar mode).
 * @param options.endSession - Callback fired when the voice session ends (avatar mode).
 * @param options.handleChunkSpeak - Receive avatar-voice text chunks for TTS.
 * @param options.enableAgentThinkingMode - Callback when the agent enters thinking mode.
 * @param options.disableAgentThinkingMode - Callback when the agent exits thinking mode.
 * @param options.hasAvatar - Set `true` when using avatar mode (changes audio routing).
 *
 * @returns A unified object containing agent state, text-chat controls, and voice controls.
 *
 * @example
 * ```tsx
 * const {
 *   agentDetails, agentLoading,
 *   messages, input, handleInputChange, handleSubmit,
 *   voiceStatus, connectToRoom, disconnectFromRoom, interruptAgent, toggleMute,
 * } = useSimplAIVoiceAgent();
 * ```
 */
const useSimplAIVoiceAgent = (
  options: UseSimplAIVoiceAgentOptions = {},
): UseSimplAIVoiceAgentReturn => {
  const { config, httpClient, endpoints } = useSimplAIContext();

  // ─── Agent Details ──────────────────────────────────────────────────────────
  const [agentDetails, setAgentDetails] = useState<AgentDetails | null>(null);
  const [agentLoading, setAgentLoading] = useState<boolean>(true);
  const [agentError, setAgentError] = useState<string | null>(null);

  const fetchAgentDetails = useCallback(async () => {
    try {
      setAgentLoading(true);
      setAgentError(null);
      const res = await fetchAgentDetailsApi(httpClient, endpoints, {
        agentId: config.agentId,
        headers: { [X_PROJECT_ID]: config.projectId },
      });
      if (res?.status === 200) {
        setAgentDetails(res.data);
      } else {
        setAgentError("Failed to fetch agent details");
      }
    } catch (err: any) {
      setAgentError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch agent details",
      );
    } finally {
      setAgentLoading(false);
    }
  }, [config.agentId, config.projectId, httpClient, endpoints]);

  useEffect(() => {
    fetchAgentDetails();
  }, [fetchAgentDetails]);

  // ─── Chat Stream ────────────────────────────────────────────────────────────
  const chatStream = useChatStream({
    convId: options.conversationId,
    chatConfig: {
      model: "",
      language_code: "EN",
      source: "APP",
      app_id: agentDetails?.agent_id || config.agentId || "",
      model_id: "",
      version_id: agentDetails?.version_id || "",
    },
    projectId: config.projectId,
    customAttributes: options.customAttributes,
  });

  // ─── Sync chat config when agent details load ─────────────────────────────
  useEffect(() => {
    if (agentDetails) {
      chatStream.setChatConfig({
        model: agentDetails.agent_name,
        language_code: "EN",
        source: "APP",
        app_id: agentDetails.pipeline_id,
        model_id: agentDetails.pipeline_id,
      });
    }
  }, [agentDetails]);

  // ───  Audio ──────────────────────────────────────────────────────────
  const agentAudio = useSimplaiAudio({
    agentDetails: {
      agent_id: agentDetails?.agent_id || config.agentId,
      agent_name: agentDetails?.agent_name,
      version_id: agentDetails?.version_id,
      citations: agentDetails?.citations?.enabled,
      tool_citations: agentDetails?.tool_citations?.enabled,
      config: agentDetails?.config,
      socketEndpoint: agentDetails?.socketEndpoint,
    },
    userDetails: {
      name: config.userId,
      id: config.userId,
    },
    setMessages: chatStream.setMessages as (values: any) => void,
    changeConversation: chatStream.changeConversation as (values: any) => void,
    conversationId: chatStream.conversationId,
    startSession: options.startSession,
    endSession: options.endSession,
    handleChunkSpeak: options.handleChunkSpeak,
    enableAgentThinkingMode: options.enableAgentThinkingMode,
    disableAgentThinkingMode: options.disableAgentThinkingMode,
    hasAvatar: options.hasAvatar ?? false,
    projectId: config.projectId,
  });

  // ─── Unified Return ─────────────────────────────────────────────────────────
  return {
    // Agent state
    agentDetails,
    agentLoading,
    agentError,
    refetchAgentDetails: fetchAgentDetails,

    // Chat stream (all fields from useChatStream)
    conversationId: chatStream.conversationId,
    setConversationId: chatStream.setConversationId,
    messages: chatStream.messages,
    setMessages: chatStream.setMessages,
    input: chatStream.input,
    setInput: chatStream.setInput,
    handleInputChange: chatStream.handleInputChange,
    handleSubmit: chatStream.handleSubmit,
    isLoading: chatStream.isLoading,
    chatStreaming: chatStream.chatStreaming,
    stopStream: chatStream.stopStream,
    chatConfig: chatStream.chatConfig,
    setChatConfig: chatStream.setChatConfig,
    changeConversation: chatStream.changeConversation,
    changeConversationLoading: chatStream.changeConversationLoading,
    custAtrr: chatStream.custAtrr,
    setCustAtrr: chatStream.setCustAtrr,
    resetCustAtrr: chatStream.resetCustAtrr,
    submitMessageFeedback: chatStream.submitMessageFeedback,
    projectId: chatStream.projectId,
    setProjectId: chatStream.setProjectId,
    agentToolDrawerConfig: chatStream.agentToolDrawerConfig,
    setAgentToolDrawerConfig: chatStream.setAgentToolDrawerConfig,
    agentToolDrawerVisible: chatStream.agentToolDrawerVisible,
    setAgentToolDrawerVisible: chatStream.setAgentToolDrawerVisible,
    stopConversation: chatStream.stopConversation,
    artifacts: chatStream.artifacts,
    setArtifacts: chatStream.setArtifacts,
    agentArtifactDrawerVisible: chatStream.agentArtifactDrawerVisible,
    setAgentArtifactDrawerVisible: chatStream.setAgentArtifactDrawerVisible,
    closeAgentArtifactDrawer: chatStream.closeAgentArtifactDrawer,
    updateArtifact: chatStream.updateArtifact,
    resetConversation: chatStream.resetConversation,

    // Voice  (all fields from useSimplaiAudio)
    voiceStatus: agentAudio.status,
    voiceRoom: agentAudio.room,
    voiceParticipants: agentAudio.participants,
    voiceError: agentAudio.error,
    voiceAudioTracks: agentAudio.audioTracks,
    agentConnected: agentAudio.agentConnected,
    isMicrophoneEnabled: agentAudio.isMicrophoneEnabled,
    connectToRoom: agentAudio.connectToRoom,
    disconnectFromRoom: agentAudio.handleDisconnect,
    interruptAgent: agentAudio.interuptAgent,
    toggleMute: agentAudio.toggleMuteLocalParticipant,
    voiceConversationId: agentAudio.voiceConversationId,
    setVoiceConversationId: agentAudio.setVoiceConversationId,
    conversationProjectId: agentAudio.conversationProjectId,
    setConversationProjectId: agentAudio.setConversationProjectId,
  };
};

export default useSimplAIVoiceAgent;
