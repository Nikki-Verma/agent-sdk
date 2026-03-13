import { livekitTokenApi } from "../api/audio";
import { AGENT_SOCKET_ENDPOINT, SIMD_WASM, WASM_URL, WORKLET_URL, X_PROJECT_ID } from "../constants";
import { useSimplAIContext } from "../context/SimplAIProvider";
import { UseLivekitAudioProps } from "../types";
import { checkValidStringifiedJSON, getCleanMarkdownString, getErrorFromApi } from "../utils/helpers";
import { createRoom } from "../utils/livekit";
import {
  loadRnnoise,
  RnnoiseWorkletNode,
} from "@sapphi-red/web-noise-suppressor";
import {
  DisconnectReason,
  Participant,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 } from "uuid";

/**
 * React hook for real-time voice conversation via LiveKit with a SimplAI agent.
 *
 * Handles the full voice lifecycle: obtaining a LiveKit token, connecting to a
 * room, publishing a denoised microphone track (via RNNoise WASM), parsing
 * transcripts from the `DataReceived` event, and managing participants and
 * audio tracks.
 *
 * Must be used within a `SimplAIProvider`.
 *
 * @param props - Voice configuration.
 * @param props.agentDetails - Agent identification and feature flags.
 * @param props.userDetails - Current user's name and ID.
 * @param props.setMessages - State setter to push voice transcripts into the messages array.
 * @param props.changeConversation - Callback when the voice session creates or changes a conversation.
 * @param props.conversationId - Current conversation ID (used when requesting a token).
 * @param props.startSession - Callback fired when the room connects (avatar mode).
 * @param props.endSession - Callback fired when the room disconnects (avatar mode).
 * @param props.handleChunkSpeak - Receive avatar-voice text chunks.
 * @param props.hasAvatar - Whether avatar mode is active (changes audio routing).
 * @param props.projectId - Project ID for this session.
 *
 * @returns Voice state and controls: status, room, participants, audio tracks,
 *          connectToRoom, handleDisconnect, interuptAgent, toggleMuteLocalParticipant, etc.
 *
 * @example
 * ```tsx
 * const { status, connectToRoom, handleDisconnect, toggleMuteLocalParticipant } = useLivekitAudio({
 *   agentDetails: { agent_id: "...", agent_name: "..." },
 *   userDetails: { name: "User", id: "user-1" },
 *   setMessages,
 *   changeConversation,
 *   projectId: "proj-1",
 * });
 * ```
 */
const useLivekitAudio = ({
  agentDetails,
  userDetails,
  setMessages,
  changeConversation,
  conversationId,
  startSession,
  endSession,
  handleChunkSpeak,
  enableAgentThinkingMode,
  disableAgentThinkingMode,
  hasAvatar,
  projectId,
}: UseLivekitAudioProps) => {
  const { config, httpClient, endpoints } = useSimplAIContext();

  const textEncoder = useMemo(() => {
    return new TextEncoder();
  }, []);

  const decoder = useMemo(() => {
    return new TextDecoder();
  }, []);

  const [conversationProjectId, setConversationProjectId] = useState(projectId);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [status, setStatus] = useState<any>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioTracks, setAudioTracks] = useState<{
    [key: string]: Track | null;
  }>({});
  const newConversationMessageAddedToChat = useRef(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState<boolean>(true);
  const [voiceConversationId, setVoiceConversationId] =
    useState(conversationId);

  const remoteAudioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Refs to manage audio context and RNNoise node for cleanup
  const audioContextRef = useRef<AudioContext | null>(null);
  const rnnoiseNodeRef = useRef<RnnoiseWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!room) return;

    const localParticipant = room.localParticipant;

    const handleMicrophoneStateChange = () => {
      setIsMicrophoneEnabled(localParticipant.isMicrophoneEnabled);
    };

    localParticipant.on(RoomEvent.TrackMuted, handleMicrophoneStateChange);
    localParticipant.on(RoomEvent.TrackUnmuted, handleMicrophoneStateChange);

    return () => {
      localParticipant.off(RoomEvent.TrackMuted, handleMicrophoneStateChange);
      localParticipant.off(
        RoomEvent.TrackUnmuted,
        handleMicrophoneStateChange,
      );
    };
  }, [room]);

  useEffect(() => {
    if (participants?.length > 0) {
      const hasAgentParticipant = participants?.some(
        (participant: any) => participant.isAgent,
      );
      if (hasAgentParticipant) {
        setStatus("connected");
        setAgentConnected(true);
      }
    }
  }, [participants]);

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  const handleDisconnect = useCallback(() => {
    if (room) {
      room.disconnect();
    }
  }, [room]);

  const interuptAgent = useCallback(() => {
    if (room) {
      const interuptMessage = textEncoder.encode("interupt_agent");
      room.localParticipant.publishData(interuptMessage, {
        topic: "agent_communication",
      });
    }
  }, [room, textEncoder]);

  const toggleMuteLocalParticipant = (isMuted: boolean) => {
    if (room) {
      const localParticipant = room.localParticipant;
      localParticipant.setMicrophoneEnabled(!isMuted);
    }
  };

  const connectToRoom = async () => {
    try {
      setStatus("connecting");
      setError(null);
      const payload = {
        agent_details: {
          agent_name: agentDetails?.agent_name,
          agent_id: agentDetails?.agent_id,
          version_id: agentDetails?.version_id,
          citations: agentDetails?.citations,
          tool_citations: agentDetails?.tool_citations,
          config: agentDetails?.config,
        },
        conversation_details: {
          conversation_id: voiceConversationId,
        },
        user_details: {
          name: userDetails?.name,
          id: userDetails?.id,
          guest_user: false,
        },
      };
      const livekitTokenResponse = await livekitTokenApi(
        httpClient,
        endpoints,
        {
          payload,
          headers: { [X_PROJECT_ID]: conversationProjectId || config.projectId },
        },
      );

      if (livekitTokenResponse?.status === 200) {
        if (
          voiceConversationId !== livekitTokenResponse?.data?.conversation_id
        ) {
          setVoiceConversationId(livekitTokenResponse?.data?.conversation_id);
          changeConversation(livekitTokenResponse?.data?.conversation_id);
        }
        const newRoom = createRoom();

        newRoom
          .on(RoomEvent.Connected, () => {
            if (hasAvatar && startSession) startSession();
          })
          ?.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
            setStatus("idle");
            setAgentConnected(false);
            setParticipants([]);
            setAudioTracks({});
            setRoom(null);
            setIsMicrophoneEnabled(true);
            newConversationMessageAddedToChat.current = false;
            if (hasAvatar && endSession) endSession();

            // RNNOISE CLEANUP
            rnnoiseNodeRef.current?.destroy();
            audioContextRef.current?.close();
            micStreamRef.current?.getTracks().forEach((t) => t.stop());
            rnnoiseNodeRef.current = null;
            audioContextRef.current = null;
            micStreamRef.current = null;
          })
          ?.on(RoomEvent.ConnectionQualityChanged, () => {})
          ?.on(RoomEvent.LocalAudioSilenceDetected, () => {})
          ?.on(RoomEvent.LocalTrackSubscribed, () => {})
          ?.on(RoomEvent.TrackMuted, () => {})
          ?.on(RoomEvent.ActiveSpeakersChanged, () => {})
          ?.on(RoomEvent.ConnectionStateChanged, () => {})
          ?.on(RoomEvent.EncryptionError, () => {})
          ?.on(RoomEvent.ParticipantPermissionsChanged, () => {})
          ?.on(RoomEvent.MediaDevicesError, (error) => {
            setError(getErrorFromApi(error));
            newRoom.disconnect();
          })
          ?.on(RoomEvent.DataReceived, (data, participant, kind, topic) => {
            const decodedData = decoder?.decode?.(data);

            const parsedTranscriptObject = JSON.parse(
              decodedData || JSON.stringify({}),
            );

            parsedTranscriptObject?.segments?.map(
              (currentTranscript: any) => {
                const newTextObj = JSON.parse(
                  currentTranscript?.text || JSON.stringify({}),
                );

                if (
                  newTextObj?.role == "assistant" &&
                  !!newTextObj?.tool_calls
                ) {
                  setMessages((messages: any) => {
                    const latestMessage = messages[messages.length - 1];

                    const newTools =
                      newTextObj?.tool_calls
                        ?.map?.((toolData: any) => {
                          if (Object.keys(toolData || {})?.length > 0) {
                            const functionDetails = toolData?.function || {};
                            return {
                              ...(toolData || {}),
                              ...(functionDetails || {}),
                            };
                          } else {
                            return null;
                          }
                        })
                        ?.filter?.((toolData: any) => !!toolData) || null;
                    newConversationMessageAddedToChat.current = true;
                    if (latestMessage?.role === "SimplAi") {
                      return [
                        ...messages.slice(0, -1),
                        { ...latestMessage, tools: newTools },
                      ];
                    }
                    return [
                      ...messages,
                      {
                        role: "SimplAi",
                        content: "",
                        tools: newTools,
                        id: v4(),
                      },
                    ];
                  });
                } else if (
                  newTextObj?.role == "tool" &&
                  !!newTextObj?.tool_call_id
                ) {
                  setMessages((messages: any) => {
                    const latestMessage = messages[messages.length - 1];

                    if (latestMessage?.role === "SimplAi") {
                      const newToolwithDetails = latestMessage?.tools
                        ? latestMessage?.tools?.map?.((toolData: any) => {
                            if (toolData?.id === newTextObj?.tool_call_id) {
                              return {
                                ...toolData,
                                content: `${toolData?.content || ""}${newTextObj?.content || ""}`,
                              };
                            } else {
                              return { ...toolData };
                            }
                          })
                        : null;
                      return [
                        ...messages.slice(0, -1),
                        { ...latestMessage, tools: newToolwithDetails },
                      ];
                    }

                    return [...messages];
                  });
                } else if (
                  newTextObj?.role == "assistant" &&
                  !!newTextObj?.citations
                ) {
                  setMessages((messages: any) => {
                    const latestMessage = messages[messages.length - 1];

                    if (latestMessage?.role === "SimplAi") {
                      const citations = {
                        ...(latestMessage?.citations || {}),
                      };
                      if (newTextObj?.citations?.nodes) {
                        newTextObj?.citations?.nodes?.forEach?.(
                          (citationChunk: any) => {
                            const fileName =
                              citationChunk?.metadata?.file_name ||
                              citationChunk?.metadata?.filename;
                            if (fileName) {
                              citations[fileName] = citations[fileName]
                                ? [...citations[fileName], citationChunk]
                                : [citationChunk];
                            }
                          },
                        );
                      } else if (
                        Array.isArray(newTextObj?.citations) &&
                        newTextObj?.citations?.length > 0
                      ) {
                        newTextObj?.citations?.forEach(
                          (citationChunk: any) => {
                            const fileName =
                              citationChunk?.doc?.file_name ||
                              citationChunk?.doc?.filename;
                            if (fileName) {
                              citations[fileName] = citations[fileName]
                                ? [...citations[fileName], citationChunk]
                                : [citationChunk];
                            }
                          },
                        );
                      }
                      return [
                        ...messages.slice(0, -1),
                        {
                          ...latestMessage,
                          citations:
                            Object.keys(citations).length > 0
                              ? citations
                              : null,
                        },
                      ];
                    }

                    return [...messages];
                  });
                } else if (
                  newTextObj?.role == "assistant" ||
                  newTextObj?.role == "user"
                ) {
                  if (
                    handleChunkSpeak &&
                    newTextObj?.role == "assistant" &&
                    newTextObj?.media_type === "avatar_voice"
                  ) {
                    handleChunkSpeak(
                      getCleanMarkdownString(newTextObj?.content),
                    );
                    return null;
                  }
                  setMessages((messages: any) => {
                    const latestMessage = messages[messages.length - 1];

                    if (!!!newConversationMessageAddedToChat?.current) {
                      newConversationMessageAddedToChat.current = true;
                      return [
                        ...messages,
                        {
                          role:
                            newTextObj?.role == "user" ? "user" : "SimplAi",
                          content: newTextObj?.content,
                          id: v4(),
                        },
                      ];
                    }
                    if (newTextObj?.role == "user") {
                      if (latestMessage?.role === "user") {
                        return [
                          ...messages.slice(0, -1),
                          {
                            ...latestMessage,
                            content: `${latestMessage?.content}${newTextObj?.content}`,
                          },
                        ];
                      } else {
                        return [
                          ...messages,
                          {
                            role: "user",
                            content: newTextObj?.content,
                            id: v4(),
                          },
                        ];
                      }
                    } else {
                      if (latestMessage?.role === "user") {
                        return [
                          ...messages,
                          {
                            role: "SimplAi",
                            content: newTextObj?.content,
                            id: v4(),
                          },
                        ];
                      } else {
                        return [
                          ...messages.slice(0, -1),
                          {
                            ...latestMessage,
                            content: `${latestMessage?.content}${newTextObj?.content}`,
                          },
                        ];
                      }
                    }
                  });
                } else if (newTextObj?.role == "trace") {
                  const trace = checkValidStringifiedJSON(newTextObj?.content)
                    ? JSON.parse(newTextObj?.content ?? JSON.stringify(""))
                    : {};
                  setMessages((messages: any) => {
                    const latestMessage = messages[messages.length - 1];

                    if (latestMessage?.role === "SimplAi") {
                      return [
                        ...messages.slice(0, -1),
                        { ...latestMessage, trace: trace },
                      ];
                    }

                    return [
                      ...messages,
                      {
                        role: "SimplAi",
                        content: "",
                        trace: trace,
                        id: v4(),
                      },
                    ];
                  });
                }
              },
            );
          })
          ?.on(RoomEvent.SignalConnected, () => {})
          ?.on(
            RoomEvent.ParticipantConnected,
            (participant: Participant) => {
              if (participant?.isAgent) {
                setStatus("connected");
                setAgentConnected(true);
              }
              setParticipants((prev) => [...prev, participant]);
            },
          )
          ?.on(
            RoomEvent.ParticipantDisconnected,
            (participant: Participant) => {
              if (participant?.isAgent) {
                setAgentConnected(false);
                newRoom.disconnect();
                return null;
              }
              setParticipants((prev) =>
                prev.filter((p) => p !== participant),
              );
              setAudioTracks((prev) => {
                const updatedTracks = { ...prev };
                delete updatedTracks[participant.identity];
                return updatedTracks;
              });
            },
          )
          ?.on(
            RoomEvent.LocalTrackPublished,
            (publication, participant) => {
              if (publication?.track?.kind === Track.Kind.Audio) {
                setAudioTracks((prev) => ({
                  ...prev,
                  [participant.identity]: publication?.track || null,
                }));
              }
            },
          )
          ?.on(
            RoomEvent.TrackSubscribed,
            (track, publication, participant: Participant) => {
              if (track.kind === Track.Kind.Audio) {
                if (!hasAvatar && startSession && endSession) {
                  const audioElement = new Audio();
                  audioElement.srcObject = new MediaStream([
                    track.mediaStreamTrack,
                  ]);
                  audioElement.play();
                  remoteAudioRefs.current[participant.identity] =
                    audioElement;
                }

                setAudioTracks((prev) => ({
                  ...prev,
                  [participant.identity]: track || null,
                }));
              }
            },
          )
          ?.on(
            RoomEvent.TrackUnsubscribed,
            (_, __, participant: Participant) => {
              if (remoteAudioRefs.current[participant.identity]) {
                remoteAudioRefs.current[participant.identity].pause();
                delete remoteAudioRefs.current[participant.identity];
              }
              setAudioTracks((prev) => ({
                ...prev,
                [participant.identity]: null,
              }));
            },
          )
          ?.on(
            RoomEvent.TranscriptionReceived,
            () => {},
          );

        await newRoom.connect(
          agentDetails?.socketEndpoint ?? AGENT_SOCKET_ENDPOINT,
          livekitTokenResponse?.data?.token,
          { autoSubscribe: true },
        );
        setRoom(newRoom);

        // ==== RNNOISE INITIALIZATION ====
        const audioCtx = new AudioContext({ sampleRate: 48000 });
        audioContextRef.current = audioCtx;

        const wasmBinary = await loadRnnoise({
          url: WASM_URL,
          simdUrl: SIMD_WASM,
        });

        await audioCtx.audioWorklet.addModule(WORKLET_URL);

        const rnNode = new RnnoiseWorkletNode(audioCtx, {
          wasmBinary,
          maxChannels: 1,
        });
        rnnoiseNodeRef.current = rnNode;

        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: false,
            echoCancellation: true,
            autoGainControl: false,
            channelCount: 1,
          },
        });
        micStreamRef.current = micStream;

        const sourceNode = audioCtx.createMediaStreamSource(micStream);
        const destNode = audioCtx.createMediaStreamDestination();
        sourceNode.connect(rnNode);
        rnNode.connect(destNode);

        const processedTrack = destNode.stream.getAudioTracks()[0];

        await newRoom.localParticipant.publishTrack(processedTrack, {
          name: "microphone_denoised",
          source: Track.Source.Microphone,
        });

        const allParticipants = [
          newRoom.localParticipant,
          ...Array.from(newRoom.remoteParticipants.values()),
        ];

        setParticipants(allParticipants);
      } else {
        setError(getErrorFromApi(livekitTokenResponse));
        setStatus("error");
      }
    } catch (err) {
      setError(getErrorFromApi(err));
      setStatus("error");
    }
  };

  return {
    status,
    room,
    participants,
    error,
    audioTracks,
    agentConnected,
    isMicrophoneEnabled,
    setError,
    connectToRoom,
    handleDisconnect,
    interuptAgent,
    toggleMuteLocalParticipant,
    setVoiceConversationId,
    voiceConversationId,
    conversationProjectId,
    setConversationProjectId,
  };
};

export default useLivekitAudio;
