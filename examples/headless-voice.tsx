/**
 * Headless Voice Integration Example
 *
 * Demonstrates using the individual hooks separately for a custom
 * headless integration where you control the UI completely.
 *
 * This pattern is useful when:
 * - You have your own chat UI already
 * - You only need voice capabilities
 * - You want to wire voice transcripts into an existing state system
 *
 * Usage:
 *   npm install @simplai/voice-agent-sdk react react-dom
 */

import React, { useEffect, useState } from "react";
import {
  SimplAIProvider,
  useSimplAIContext,
  useLivekitAudio,
} from "@simplai/voice-agent-sdk";
import type { ChatMessage, AgentDetails } from "@simplai/voice-agent-sdk";
import { fetchAgentDetailsApi } from "@simplai/voice-agent-sdk";

// ─── Configuration ────────────────────────────────────────────────────────────

const SDK_CONFIG = {
  agentId: "YOUR_AGENT_ID",
  apiKey: "YOUR_API_KEY",
  tenantId: "YOUR_TENANT_ID",
  projectId: "YOUR_PROJECT_ID",
  userId: "YOUR_USER_ID",
};

// ─── App Wrapper ──────────────────────────────────────────────────────────────

export function HeadlessVoiceApp() {
  return (
    <SimplAIProvider config={SDK_CONFIG}>
      <HeadlessVoice />
    </SimplAIProvider>
  );
}

// ─── Headless Voice Component ─────────────────────────────────────────────────

function HeadlessVoice() {
  const { httpClient, endpoints, config } = useSimplAIContext();

  // Manage your own messages array
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentDetails, setAgentDetails] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch agent details manually
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAgentDetailsApi(httpClient, endpoints, {
          agentId: config.agentId,
          headers: { "X-PROJECT-ID": config.projectId },
        });
        if (res?.status === 200) {
          setAgentDetails(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch agent:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [httpClient, endpoints, config]);

  // Use the voice hook with your own state management
  const {
    status,
    agentConnected,
    isMicrophoneEnabled,
    error,
    participants,
    connectToRoom,
    handleDisconnect,
    interuptAgent,
    toggleMuteLocalParticipant,
  } = useLivekitAudio({
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
    // Wire to your own state
    setMessages,
    changeConversation: (convId: any) => {
      console.log("Conversation changed to:", convId);
    },
    projectId: config.projectId,
  });

  if (loading) return <div>Loading agent configuration...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Headless Voice - Custom Integration</h2>
      <p style={{ color: "#666" }}>
        This example shows how to use the voice hook directly with your own
        state management. Messages are managed outside the SDK.
      </p>

      {/* Status */}
      <div
        style={{
          padding: 16,
          background: "#f3f4f6",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <div>
          <strong>Status:</strong> {status}
        </div>
        <div>
          <strong>Agent Connected:</strong> {agentConnected ? "Yes" : "No"}
        </div>
        <div>
          <strong>Mic Enabled:</strong> {isMicrophoneEnabled ? "Yes" : "No"}
        </div>
        <div>
          <strong>Participants:</strong> {participants.length}
        </div>
        {error && (
          <div style={{ color: "#ef4444" }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {status === "idle" || status === "error" ? (
          <button onClick={connectToRoom} style={buttonStyle("#10b981")}>
            Connect
          </button>
        ) : null}

        {status === "connected" && (
          <>
            <button
              onClick={() => toggleMuteLocalParticipant(isMicrophoneEnabled)}
              style={buttonStyle(isMicrophoneEnabled ? "#6b7280" : "#ef4444")}
            >
              {isMicrophoneEnabled ? "Mute" : "Unmute"}
            </button>
            <button
              onClick={interuptAgent}
              style={buttonStyle("#f59e0b")}
              disabled={!agentConnected}
            >
              Interrupt
            </button>
            <button onClick={handleDisconnect} style={buttonStyle("#ef4444")}>
              Disconnect
            </button>
          </>
        )}

        {status === "connecting" && (
          <span style={{ color: "#f59e0b", fontWeight: 600 }}>
            Connecting...
          </span>
        )}
      </div>

      {/* Transcript from voice */}
      <div>
        <h3>Voice Transcript ({messages.length} messages)</h3>
        <div
          style={{
            height: 300,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: "6px 0",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <strong style={{ color: msg.role === "user" ? "#4F46E5" : "#059669" }}>
                {msg.role === "user" ? "You" : "Agent"}:
              </strong>{" "}
              {msg.content}
            </div>
          ))}
        </div>
      </div>

      {/* Raw messages JSON (for debugging) */}
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", color: "#666" }}>
          Debug: Raw messages JSON
        </summary>
        <pre
          style={{
            maxHeight: 200,
            overflow: "auto",
            background: "#1f2937",
            color: "#e5e7eb",
            padding: 12,
            borderRadius: 8,
            fontSize: 11,
          }}
        >
          {JSON.stringify(messages, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const buttonStyle = (bg: string): React.CSSProperties => ({
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: bg,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
});

export default HeadlessVoiceApp;
