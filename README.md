# @simplai.ai/voice-agent-sdk

React hooks SDK for integrating SimplAI voice and text chat agents into your application.

Provides a single unified hook (`useSimplAIVoiceAgent`) that handles agent configuration fetching, SSE-based text chat streaming, and real-time voice conversation - all wired together out of the box.

---

## Installation

```bash
npm install @simplai.ai/voice-agent-sdk
# or
yarn add @simplai.ai/voice-agent-sdk
# or
pnpm add @simplai.ai/voice-agent-sdk
```

### Peer Dependencies

The SDK requires React 17+ as a peer dependency:

```bash
npm install react react-dom
```

---

## Quick Start

### 1. Wrap your app with the provider

```tsx
import { SimplAIProvider } from "@simplai.ai/voice-agent-sdk";

function App() {
  return (
    <SimplAIProvider
      config={{
        agentId: "your-agent-id",
        apiKey: "your-api-key",
        tenantId: "your-tenant-id",
        projectId: "your-project-id",
        userId: "current-user-id",
      }}
    >
      <ChatBot />
    </SimplAIProvider>
  );
}
```

### 2. Use the composite hook

```tsx
import { useSimplAIVoiceAgent } from "@simplai.ai/voice-agent-sdk";

function ChatBot() {
  const {
    // Agent
    agentDetails,
    agentLoading,
    agentError,

    // Text chat
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    chatStreaming,
    stopStream,

    // Voice
    voiceStatus,
    connectToRoom,
    disconnectFromRoom,
    interruptAgent,
    toggleMute,
    isMicrophoneEnabled,
    agentConnected,
  } = useSimplAIVoiceAgent();

  if (agentLoading) return <div>Loading agent...</div>;
  if (agentError) return <div>Error: {agentError}</div>;

  return (
    <div>
      {/* Message list */}
      <div>
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "user" : "agent"}>
            {msg.content}
          </div>
        ))}
      </div>

      {/* Text input */}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
        {chatStreaming && <button onClick={stopStream}>Stop</button>}
      </form>

      {/* Voice controls */}
      <div>
        {voiceStatus === "idle" && (
          <button onClick={connectToRoom}>Start Voice</button>
        )}
        {voiceStatus === "connecting" && <span>Connecting...</span>}
        {voiceStatus === "connected" && (
          <>
            <button onClick={() => toggleMute(!isMicrophoneEnabled)}>
              {isMicrophoneEnabled ? "Mute" : "Unmute"}
            </button>
            <button onClick={interruptAgent}>Interrupt</button>
            <button onClick={disconnectFromRoom}>End Call</button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Configuration

### `SimplAISDKConfig`

| Property    | Type     | Required | Description                                        |
| ----------- | -------- | -------- | -------------------------------------------------- |
| `agentId`   | `string` | Yes      | The ID of your SimplAI agent                       |
| `apiKey`    | `string` | Yes      | Your SimplAI API key (passed as `PIM-SID` header)  |
| `tenantId`  | `string` | Yes      | Your tenant identifier                             |
| `projectId` | `string` | Yes      | The project the agent belongs to                   |
| `userId`    | `string` | Yes      | Current user's unique identifier                   |
| `deviceId`  | `string` | No       | Custom device identifier (defaults to `"simplai"`) |

---

## API Reference

### Provider

#### `<SimplAIProvider config={...}>`

Wraps your component tree and provides the SDK context (HTTP client with auth headers, endpoint config) to all child hooks.

```tsx
<SimplAIProvider config={sdkConfig}>{children}</SimplAIProvider>
```

---

### Hooks

#### `useSimplAIVoiceAgent(options?)`

The primary hook. Fetches agent details automatically, initialises text chat and voice, and returns a single flat API.

**Options** (`UseSimplAIVoiceAgentOptions`):

| Option                     | Type                     | Description                                             |
| -------------------------- | ------------------------ | ------------------------------------------------------- |
| `conversationId`           | `string`                 | Resume an existing conversation                         |
| `customAttributes`         | `object`                 | Additional attributes sent with chat requests           |
| `startSession`             | `() => void`             | Callback when voice session starts (avatar mode)        |
| `endSession`               | `() => void`             | Callback when voice session ends (avatar mode)          |
| `handleChunkSpeak`         | `(text: string) => void` | Receive avatar-voice text chunks                        |
| `enableAgentThinkingMode`  | `() => void`             | Callback when agent enters thinking mode                |
| `disableAgentThinkingMode` | `() => void`             | Callback when agent exits thinking mode                 |
| `hasAvatar`                | `boolean`                | Set `true` if using avatar mode (changes audio routing) |

**Return value** (`UseSimplAIVoiceAgentReturn`):

<details>
<summary><strong>Agent State</strong></summary>

| Field                 | Type                 | Description                     |
| --------------------- | -------------------- | ------------------------------- |
| `agentDetails`        | `AgentDetails\|null` | Fetched agent configuration     |
| `agentLoading`        | `boolean`            | Agent details are loading       |
| `agentError`          | `string\|null`       | Agent fetch error message       |
| `refetchAgentDetails` | `() => void`         | Manually re-fetch agent details |

</details>

<details>
<summary><strong>Text Chat</strong></summary>

| Field                           | Type                                              | Description                                 |
| ------------------------------- | ------------------------------------------------- | ------------------------------------------- |
| `messages`                      | `ChatMessage[]`                                   | Array of conversation messages              |
| `setMessages`                   | `Dispatch<SetStateAction<ChatMessage[]>>`         | Directly set messages                       |
| `input`                         | `string`                                          | Current text input value                    |
| `setInput`                      | `Dispatch<SetStateAction<string>>`                | Set input value                             |
| `handleInputChange`             | `(e) => void`                                     | Bind to `<input onChange>`                  |
| `handleSubmit`                  | `(e?, newMessage?, additionalConfig?) => Promise` | Submit a message                            |
| `isLoading`                     | `boolean`                                         | Waiting for AI response                     |
| `chatStreaming`                 | `boolean`                                         | AI response is actively streaming           |
| `stopStream`                    | `() => Promise<void>`                             | Abort the active stream                     |
| `chatConfig`                    | `ChatConfig`                                      | Current chat configuration                  |
| `setChatConfig`                 | `Dispatch<SetStateAction<any>>`                   | Update chat config                          |
| `conversationId`                | `string\|undefined`                               | Active conversation ID                      |
| `setConversationId`             | `Dispatch<SetStateAction<string\|undefined>>`     | Set conversation ID                         |
| `changeConversation`            | `(convId) => Promise<void>`                       | Load a different conversation               |
| `changeConversationLoading`     | `boolean`                                         | Conversation switch in progress             |
| `submitMessageFeedback`         | `(liked, messageObj, remark?) => Promise<void>`   | Submit like/dislike feedback                |
| `stopConversation`              | `() => Promise<void>`                             | Stop the current conversation on the server |
| `resetConversation`             | `() => Promise<void>`                             | Clear all state and start fresh             |
| `artifacts`                     | `ChatArtifacts`                                   | Code/text artifacts from the agent          |
| `setArtifacts`                  | `Dispatch<SetStateAction<ChatArtifacts>>`         | Set artifacts directly                      |
| `agentArtifactDrawerVisible`    | `boolean`                                         | Artifact drawer visibility state            |
| `setAgentArtifactDrawerVisible` | `Dispatch<SetStateAction<boolean>>`               | Toggle artifact drawer                      |
| `closeAgentArtifactDrawer`      | `() => void`                                      | Close the artifact drawer                   |
| `updateArtifact`                | `function`                                        | Persist artifact changes to the server      |
| `agentToolDrawerConfig`         | `AgentToolDrawerConfig`                           | Tool drawer configuration                   |
| `setAgentToolDrawerConfig`      | `Dispatch<SetStateAction<...>>`                   | Set tool drawer config                      |
| `agentToolDrawerVisible`        | `boolean`                                         | Tool drawer visibility state                |
| `setAgentToolDrawerVisible`     | `Dispatch<SetStateAction<boolean>>`               | Toggle tool drawer                          |
| `custAtrr`                      | `UnknownObject\|null\|undefined`                  | Custom attributes state                     |
| `setCustAtrr`                   | `Dispatch<SetStateAction<...>>`                   | Set custom attributes                       |
| `resetCustAtrr`                 | `() => void`                                      | Reset custom attributes                     |
| `projectId`                     | `string\|null\|undefined`                         | Active project ID                           |
| `setProjectId`                  | `Dispatch<SetStateAction<...>>`                   | Set project ID                              |

</details>

<details>
<summary><strong>Voice </strong></summary>

| Field                      | Type                                         | Description                                |
| -------------------------- | -------------------------------------------- | ------------------------------------------ |
| `voiceStatus`              | `"idle"\|"connecting"\|"connected"\|"error"` | Current voice connection state             |
| `voiceRoom`                | `Room\|null`                                 | Room instance                              |
| `voiceParticipants`        | `Participant[]`                              | All room participants                      |
| `voiceError`               | `string\|null`                               | Voice connection error                     |
| `voiceAudioTracks`         | `{ [key: string]: Track\|null }`             | Audio tracks keyed by participant identity |
| `agentConnected`           | `boolean`                                    | Whether the AI agent has joined the room   |
| `isMicrophoneEnabled`      | `boolean`                                    | Whether the local mic is on                |
| `connectToRoom`            | `() => Promise<void>`                        | Start a voice session                      |
| `disconnectFromRoom`       | `() => void`                                 | End the voice session                      |
| `interruptAgent`           | `() => void`                                 | Interrupt the agent mid-speech             |
| `toggleMute`               | `(isMuted: boolean) => void`                 | Toggle local microphone (`true` = mute)    |
| `voiceConversationId`      | `any`                                        | Conversation ID for the voice session      |
| `setVoiceConversationId`   | `Dispatch<SetStateAction<any>>`              | Set voice conversation ID                  |
| `conversationProjectId`    | `string\|null\|undefined`                    | Project ID for the voice conversation      |
| `setConversationProjectId` | `Dispatch<SetStateAction<...>>`              | Set voice conversation project ID          |

</details>

---

#### `useChatStream(input)`

Lower-level hook for text-only chat. Use this if you do **not** need voice capabilities.

```tsx
import { useChatStream } from "@simplai.ai/voice-agent-sdk";

const chat = useChatStream({
  chatConfig: {
    model: "",
    language_code: "EN",
    source: "APP",
    app_id: "your-agent-id",
    model_id: "",
    version_id: "",
  },
});
```

Must be used inside `<SimplAIProvider>`.

---

#### `useSimplaiAudio(props)`

Lower-level hook for voice-only functionality. Use this if you are managing chat state separately.

```tsx
import { useSimplaiAudio } from "@simplai.ai/voice-agent-sdk";

const voice = useSimplaiAudio({
  agentDetails: { agent_id: "...", agent_name: "..." },
  userDetails: { name: "User", id: "user-1" },
  setMessages: setMessages,
  changeConversation: changeConversation,
  conversationId: currentConvId,
  projectId: "project-id",
});
```

Must be used inside `<SimplAIProvider>`.

---

### Types

All types are exported and can be imported for TypeScript usage:

```tsx
import type {
  SimplAISDKConfig,
  ChatMessage,
  Artifact,
  ChatArtifacts,
  VoiceStatus,
  AgentDetails,
  UseSimplAIVoiceAgentOptions,
  UseSimplAIVoiceAgentReturn,
} from "@simplai.ai/voice-agent-sdk";
```

---

## Examples

### Text Chat Only

```tsx
import { SimplAIProvider, useChatStream } from "@simplai.ai/voice-agent-sdk";

function TextChatApp() {
  return (
    <SimplAIProvider
      config={{
        agentId: "agent-123",
        apiKey: "sk-xxx",
        tenantId: "tenant-1",
        projectId: "proj-1",
        userId: "user-1",
      }}
    >
      <TextChat />
    </SimplAIProvider>
  );
}

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
  } = useChatStream({
    chatConfig: {
      model: "",
      language_code: "EN",
      source: "APP",
      app_id: "agent-123",
      model_id: "",
    },
  });

  return (
    <div>
      <div style={{ height: 400, overflowY: "auto" }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.role === "user" ? "You" : "Agent"}:</strong>{" "}
            {msg.content}
          </div>
        ))}
        {isLoading && <div>Thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
        {chatStreaming && (
          <button type="button" onClick={stopStream}>
            Stop
          </button>
        )}
      </form>

      <button onClick={resetConversation}>New Conversation</button>
    </div>
  );
}
```

### Voice Agent with Avatar

```tsx
import {
  SimplAIProvider,
  useSimplAIVoiceAgent,
} from "@simplai.ai/voice-agent-sdk";

function AvatarApp() {
  return (
    <SimplAIProvider
      config={{
        agentId: "voice-agent-456",
        apiKey: "sk-xxx",
        tenantId: "tenant-1",
        projectId: "proj-1",
        userId: "user-1",
      }}
    >
      <AvatarAgent />
    </SimplAIProvider>
  );
}

function AvatarAgent() {
  const {
    agentDetails,
    agentLoading,
    messages,
    voiceStatus,
    agentConnected,
    isMicrophoneEnabled,
    connectToRoom,
    disconnectFromRoom,
    interruptAgent,
    toggleMute,
    voiceError,
  } = useSimplAIVoiceAgent({
    hasAvatar: true,
    startSession: () => console.log("Avatar session started"),
    endSession: () => console.log("Avatar session ended"),
    handleChunkSpeak: (text) => {
      // Feed text to your avatar TTS system
      console.log("Avatar speak:", text);
    },
  });

  if (agentLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{agentDetails?.agent_name || "Voice Agent"}</h2>

      {/* Transcript */}
      <div style={{ height: 300, overflowY: "auto" }}>
        {messages.map((msg) => (
          <p key={msg.id}>
            <strong>{msg.role === "user" ? "You" : "Agent"}:</strong>{" "}
            {msg.content}
          </p>
        ))}
      </div>

      {/* Voice controls */}
      {voiceStatus === "idle" && (
        <button onClick={connectToRoom}>Start Conversation</button>
      )}

      {voiceStatus === "connecting" && <p>Connecting to agent...</p>}

      {voiceStatus === "connected" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => toggleMute(!isMicrophoneEnabled)}>
            {isMicrophoneEnabled ? "Mute Mic" : "Unmute Mic"}
          </button>
          <button onClick={interruptAgent}>Interrupt</button>
          <button onClick={disconnectFromRoom}>End Call</button>
          {agentConnected && <span>Agent connected</span>}
        </div>
      )}

      {voiceStatus === "error" && (
        <p style={{ color: "red" }}>Error: {voiceError}</p>
      )}
    </div>
  );
}
```

### Conversation History / Switch Conversations

```tsx
import { useSimplAIVoiceAgent } from "@simplai.ai/voice-agent-sdk";

function ChatWithHistory() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    conversationId,
    changeConversation,
    changeConversationLoading,
    resetConversation,
  } = useSimplAIVoiceAgent();

  const [savedConversations] = useState(["conv-1", "conv-2", "conv-3"]);

  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      <aside style={{ width: 200 }}>
        <button onClick={resetConversation}>New Chat</button>
        <h4>History</h4>
        {savedConversations.map((id) => (
          <button
            key={id}
            onClick={() => changeConversation(id)}
            disabled={changeConversationLoading}
            style={{ fontWeight: id === conversationId ? "bold" : "normal" }}
          >
            {id}
          </button>
        ))}
      </aside>

      {/* Chat area */}
      <main style={{ flex: 1 }}>
        {changeConversationLoading ? (
          <p>Loading conversation...</p>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id}>
                <strong>{msg.role}:</strong> {msg.content}
              </div>
            ))}
            <form onSubmit={handleSubmit}>
              <input value={input} onChange={handleInputChange} />
              <button type="submit">Send</button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
```

### Message Feedback

```tsx
import { useSimplAIVoiceAgent, ChatMessage } from "@simplai.ai/voice-agent-sdk";

function ChatWithFeedback() {
  const {
    messages,
    submitMessageFeedback,
    input,
    handleInputChange,
    handleSubmit,
  } = useSimplAIVoiceAgent();

  const handleFeedback = async (msg: ChatMessage, liked: boolean) => {
    await submitMessageFeedback(liked, msg, liked ? "" : "Not helpful");
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          <p>
            <strong>{msg.role}:</strong> {msg.content}
          </p>
          {msg.role === "SimplAi" && (
            <div>
              <button
                onClick={() => handleFeedback(msg, true)}
                style={{ opacity: msg.message_liked === true ? 1 : 0.4 }}
              >
                👍
              </button>
              <button
                onClick={() => handleFeedback(msg, false)}
                style={{ opacity: msg.message_liked === false ? 1 : 0.4 }}
              >
                👎
              </button>
            </div>
          )}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

---

## Browser Requirements

- Modern browser with WebRTC support (Chrome 74+, Firefox 66+, Safari 14.1+, Edge 79+)
- Microphone access permission for voice features
- WebAssembly support for RNNoise audio denoising

---

## License

MIT
