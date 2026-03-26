/**
 * Basic Text Chat Example
 *
 * Demonstrates how to use the SDK for a simple text-only chat interface.
 * Uses `useChatStream` directly for text-only use cases.
 *
 * Usage:
 *   npm install @simplai.ai/voice-agent-sdk react react-dom
 *
 * Then render <TextChatApp /> in your React tree.
 */

import type { ChatMessage } from "@simplai.ai/voice-agent-sdk";
import { SimplAIProvider, useChatStream } from "@simplai.ai/voice-agent-sdk";

// ─── Configuration ────────────────────────────────────────────────────────────

const SDK_CONFIG = {
  agentId: "YOUR_AGENT_ID",
  apiKey: "YOUR_API_KEY",
  tenantId: "YOUR_TENANT_ID",
  projectId: "YOUR_PROJECT_ID",
  userId: "YOUR_USER_ID",
};

// ─── App Wrapper ──────────────────────────────────────────────────────────────

export function TextChatApp() {
  return (
    <SimplAIProvider config={SDK_CONFIG}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
        <h1>SimplAI Text Chat</h1>
        <TextChat />
      </div>
    </SimplAIProvider>
  );
}

// ─── Chat Component ───────────────────────────────────────────────────────────

function TextChat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    chatStreaming,
    stopStream,
    resetConversation,
    submitMessageFeedback,
  } = useChatStream({
    chatConfig: {
      model: "",
      language_code: "EN",
      source: "APP",
      app_id: SDK_CONFIG.agentId,
      model_id: "",
    },
  });

  return (
    <div>
      {/* Message list */}
      <div
        style={{
          height: 500,
          overflowY: "auto",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#999", textAlign: "center" }}>
            Start a conversation by sending a message below.
          </p>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onFeedback={(liked) => submitMessageFeedback(liked, msg)}
          />
        ))}

        {isLoading && !chatStreaming && (
          <div style={{ color: "#999", fontStyle: "italic" }}>Thinking...</div>
        )}
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#4F46E5",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Send
        </button>
        {chatStreaming && (
          <button
            type="button"
            onClick={stopStream}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #ef4444",
              background: "#fff",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Stop
          </button>
        )}
      </form>

      {/* Reset button */}
      <button
        onClick={resetConversation}
        style={{
          marginTop: 12,
          padding: "8px 16px",
          borderRadius: 6,
          border: "1px solid #ddd",
          background: "#f9f9f9",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        New Conversation
      </button>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
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
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          padding: "10px 14px",
          borderRadius: 12,
          background: isUser ? "#4F46E5" : "#f3f4f6",
          color: isUser ? "#fff" : "#111",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>

        {/* Tool calls */}
        {message.tools && message.tools.length > 0 && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: "rgba(0,0,0,0.05)",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <strong>Tools used:</strong>
            {message.tools.map((tool: any, i: number) => (
              <div key={i}>
                {tool.name}: {tool.content?.substring(0, 100)}
                {(tool.content?.length || 0) > 100 ? "..." : ""}
              </div>
            ))}
          </div>
        )}

        {/* Feedback buttons (agent messages only) */}
        {!isUser && (
          <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
            <button
              onClick={() => onFeedback(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: message.message_liked === true ? 1 : 0.4,
                fontSize: 16,
              }}
              title="Helpful"
            >
              👍
            </button>
            <button
              onClick={() => onFeedback(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: message.message_liked === false ? 1 : 0.4,
                fontSize: 16,
              }}
              title="Not helpful"
            >
              👎
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TextChatApp;
