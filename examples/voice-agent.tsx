/**
 * Voice Agent Example
 *
 * Demonstrates the full `useSimplAIVoiceAgent` composite hook with
 * both text chat and voice conversation capabilities.
 *
 * Usage:
 *   npm install @simplai.ai/voice-agent-sdk react react-dom
 *
 * Then render <VoiceAgentApp /> in your React tree.
 */

import type { ChatMessage, VoiceStatus } from "@simplai.ai/voice-agent-sdk";
import {
  SimplAIProvider,
  useSimplAIVoiceAgent,
} from "@simplai.ai/voice-agent-sdk";
import { useEffect, useRef } from "react";

// ─── Configuration ────────────────────────────────────────────────────────────

const SDK_CONFIG = {
  agentId: "YOUR_AGENT_ID",
  apiKey: "YOUR_API_KEY",
  tenantId: "YOUR_TENANT_ID",
  projectId: "YOUR_PROJECT_ID",
  userId: "YOUR_USER_ID",
};

// ─── App Wrapper ──────────────────────────────────────────────────────────────

export function VoiceAgentApp() {
  return (
    <SimplAIProvider config={SDK_CONFIG}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: 24 }}>
        <VoiceAgent />
      </div>
    </SimplAIProvider>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function VoiceAgent() {
  const {
    // Agent
    agentDetails,
    agentLoading,
    agentError,
    refetchAgentDetails,

    // Text chat
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    chatStreaming,
    stopStream,
    resetConversation,
    submitMessageFeedback,

    // Voice
    voiceStatus,
    agentConnected,
    isMicrophoneEnabled,
    voiceError,
    voiceParticipants,
    connectToRoom,
    disconnectFromRoom,
    interruptAgent,
    toggleMute,
  } = useSimplAIVoiceAgent({
    // Optional callbacks
    startSession: () => console.log("[SDK] Voice session started"),
    endSession: () => console.log("[SDK] Voice session ended"),
    enableAgentThinkingMode: () => console.log("[SDK] Agent thinking..."),
    disableAgentThinkingMode: () => console.log("[SDK] Agent done thinking"),
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Loading / Error ──────────────────────────────────────────────────────

  if (agentLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>Loading agent...</div>
        <div style={{ color: "#999" }}>Fetching agent configuration</div>
      </div>
    );
  }

  if (agentError) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 24, color: "#ef4444", marginBottom: 8 }}>
          Error
        </div>
        <div style={{ color: "#666", marginBottom: 16 }}>{agentError}</div>
        <button
          onClick={refetchAgentDetails}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>
            {agentDetails?.agent_name || "Voice Agent"}
          </h1>
          <p style={{ margin: 0, color: "#666", fontSize: 13 }}>
            Agent ID: {agentDetails?.agent_id}
          </p>
        </div>
        <VoiceStatusBadge
          status={voiceStatus}
          agentConnected={agentConnected}
        />
      </div>

      {/* Messages */}
      <div
        style={{
          height: 450,
          overflowY: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          background: "#fafafa",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#aaa", textAlign: "center", marginTop: 80 }}>
            Send a text message or start a voice conversation.
          </p>
        )}

        {messages.map((msg) => (
          <MessageRow
            key={msg.id}
            message={msg}
            onFeedback={(liked) => submitMessageFeedback(liked, msg)}
          />
        ))}

        {isLoading && !chatStreaming && (
          <div style={{ color: "#999", fontStyle: "italic", padding: "4px 0" }}>
            Agent is thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Text input */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            border: "none",
            background: isLoading || !input.trim() ? "#9ca3af" : "#4F46E5",
            color: "#fff",
            cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Send
        </button>
        {chatStreaming && (
          <button
            type="button"
            onClick={stopStream}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "2px solid #ef4444",
              background: "#fff",
              color: "#ef4444",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Stop
          </button>
        )}
      </form>

      {/* Voice controls */}
      <VoiceControls
        voiceStatus={voiceStatus}
        agentConnected={agentConnected}
        isMicrophoneEnabled={isMicrophoneEnabled}
        voiceError={voiceError}
        participantCount={voiceParticipants.length}
        onConnect={connectToRoom}
        onDisconnect={disconnectFromRoom}
        onInterrupt={interruptAgent}
        onToggleMute={() => toggleMute(isMicrophoneEnabled)}
      />

      {/* Actions */}
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          onClick={resetConversation}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          New Conversation
        </button>
      </div>
    </div>
  );
}

// ─── Voice Controls Panel ─────────────────────────────────────────────────────

function VoiceControls({
  voiceStatus,
  agentConnected,
  isMicrophoneEnabled,
  voiceError,
  participantCount,
  onConnect,
  onDisconnect,
  onInterrupt,
  onToggleMute,
}: {
  voiceStatus: VoiceStatus;
  agentConnected: boolean;
  isMicrophoneEnabled: boolean;
  voiceError: string | null;
  participantCount: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onInterrupt: () => void;
  onToggleMute: () => void;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <strong style={{ fontSize: 14 }}>Voice Conversation</strong>
        {voiceStatus === "connected" && (
          <span style={{ fontSize: 12, color: "#666" }}>
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {voiceStatus === "idle" && (
        <button
          onClick={onConnect}
          style={{
            width: "100%",
            padding: "12px 24px",
            borderRadius: 10,
            border: "none",
            background: "#10b981",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🎤 Start Voice Conversation
        </button>
      )}

      {voiceStatus === "connecting" && (
        <div style={{ textAlign: "center", padding: 12, color: "#f59e0b" }}>
          Connecting to voice room...
        </div>
      )}

      {voiceStatus === "connected" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onToggleMute}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: isMicrophoneEnabled ? "#e5e7eb" : "#fecaca",
              color: isMicrophoneEnabled ? "#374151" : "#dc2626",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {isMicrophoneEnabled ? "🎤 Mute" : "🔇 Unmute"}
          </button>

          <button
            onClick={onInterrupt}
            disabled={!agentConnected}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #f59e0b",
              background: "#fffbeb",
              color: "#b45309",
              cursor: agentConnected ? "pointer" : "not-allowed",
              fontWeight: 600,
              fontSize: 13,
              opacity: agentConnected ? 1 : 0.5,
            }}
          >
            ✋ Interrupt
          </button>

          <button
            onClick={onDisconnect}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#ef4444",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            End Call
          </button>
        </div>
      )}

      {voiceStatus === "error" && (
        <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>
          Error: {voiceError}
          <button
            onClick={onConnect}
            style={{
              marginLeft: 12,
              padding: "4px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Voice Status Badge ───────────────────────────────────────────────────────

function VoiceStatusBadge({
  status,
  agentConnected,
}: {
  status: VoiceStatus;
  agentConnected: boolean;
}) {
  const colorMap: Record<VoiceStatus, string> = {
    idle: "#9ca3af",
    connecting: "#f59e0b",
    connected: "#10b981",
    error: "#ef4444",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: colorMap[status],
        }}
      />
      <span style={{ fontSize: 13, color: "#666" }}>
        {status === "idle" && "Voice: Off"}
        {status === "connecting" && "Connecting..."}
        {status === "connected" &&
          (agentConnected ? "Agent Connected" : "Waiting for Agent")}
        {status === "error" && "Voice Error"}
      </span>
    </div>
  );
}

// ─── Message Row ──────────────────────────────────────────────────────────────

function MessageRow({
  message,
  onFeedback,
}: {
  message: ChatMessage;
  onFeedback: (liked: boolean) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: "10px 14px",
          borderRadius: 12,
          background: isUser ? "#4F46E5" : "#fff",
          color: isUser ? "#fff" : "#1f2937",
          border: isUser ? "none" : "1px solid #e5e7eb",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>

        {/* Citations */}
        {message.citations && Object.keys(message.citations).length > 0 && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: "rgba(0,0,0,0.04)",
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            <strong>Sources:</strong>{" "}
            {Object.keys(message.citations).join(", ")}
          </div>
        )}

        {/* Tool calls */}
        {message.tools && message.tools.length > 0 && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: "rgba(0,0,0,0.04)",
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            <strong>Tools:</strong>
            {message.tools.map((tool: any, i: number) => (
              <div key={i} style={{ marginTop: 4 }}>
                - {tool.name}
              </div>
            ))}
          </div>
        )}

        {/* Feedback */}
        {!isUser && message.content && (
          <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
            <button
              onClick={() => onFeedback(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: message.message_liked === true ? 1 : 0.35,
                fontSize: 14,
                padding: 2,
              }}
            >
              👍
            </button>
            <button
              onClick={() => onFeedback(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: message.message_liked === false ? 1 : 0.35,
                fontSize: 14,
                padding: 2,
              }}
            >
              👎
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VoiceAgentApp;
