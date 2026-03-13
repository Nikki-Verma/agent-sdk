import { updateArtifactApi } from "../api/agents";
import {
  initiateConversationApi,
  stopConversationApi,
  submitUserMessageFeedbackApi,
} from "../api/intract";
import { X_PROJECT_ID, X_SELLER_ID, X_SELLER_PROFILE_ID } from "../constants";
import { useSimplAIContext } from "../context/SimplAIProvider";
import {
  ChatArtifacts,
  ChatMessage,
  ChunkType,
  Artifact,
  UnknownObject,
  UseChatStreamInput,
} from "../types";
import {
  checkValidStringifiedJSON,
  getBrowserUseState,
  getErrorFromApi,
} from "../utils/helpers";
import { getChatDetails } from "../utils/stream";
import { cloneDeep, debounce } from "lodash";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";

const SimplAi_ERROR_MESSAGE = "Something went wrong fetching AI response.";
const INSUFFICIENT_CREDIT_ERROR = "Please contact your admin.";

/**
 * React hook for SSE-based text chat streaming with a SimplAI agent.
 *
 * Manages the full chat lifecycle: sending messages, streaming AI responses,
 * handling tool calls, citations, planning steps, artifacts, and feedback.
 *
 * Must be used within a `SimplAIProvider`.
 *
 * @param input - Chat stream configuration.
 * @param input.convId - Optional conversation ID to resume.
 * @param input.messages - Optional initial messages array.
 * @param input.chatConfig - Chat configuration (model, language, source, app_id, etc.).
 * @param input.projectId - Project ID for this conversation.
 * @param input.customAttributes - Additional attributes sent with each request.
 *
 * @returns An object with messages state, input controls, streaming controls,
 *          conversation management, artifact state, tool drawer config, and feedback methods.
 *
 * @example
 * ```tsx
 * const { messages, input, handleInputChange, handleSubmit, isLoading } = useChatStream({
 *   chatConfig: { model: "", language_code: "EN", source: "APP", app_id: "agent-id", model_id: "" },
 * });
 * ```
 */
const useChatStream = (input: UseChatStreamInput) => {
  const { config, httpClient, endpoints } = useSimplAIContext();

  const streamRef = useRef<EventSource>();
  const stopStreamRef = useRef<boolean>(false);
  const controllerRef = useRef<AbortController | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(
    input?.messages ?? [],
  );
  const [artifacts, setArtifacts] = useState<ChatArtifacts>({
    id: undefined,
    contents: [],
    current_index: undefined,
  });
  const [projectId, setProjectId] = useState(input?.projectId);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(input?.convId);
  const [messageId, setMessageId] = useState(undefined);
  const [changeConversationLoading, setChangeConversationLoading] =
    useState<boolean>(false);
  const [chatConfig, setChatConfig] = useState<any>(
    input?.chatConfig ?? {
      model: "abc",
      language_code: "EN",
      source: "APP",
    },
  );
  const [agentToolDrawerConfig, setAgentToolDrawerConfig] = useState<{
    messageId: string | undefined;
    allTools: any[];
    selectedToolCallId: string | undefined;
  }>({
    messageId: undefined,
    allTools: [],
    selectedToolCallId: undefined,
  });
  const [agentToolDrawerVisible, setAgentToolDrawerVisible] =
    useState<boolean>(false);
  const [agentArtifactDrawerVisible, setAgentArtifactDrawerVisible] =
    useState<boolean>(false);
  const [custAtrr, setCustAtrr] = useState(input?.customAttributes);

  const closeAgentArtifactDrawer = useCallback(() => {
    setAgentArtifactDrawerVisible(false);
    setArtifacts((prev) => {
      return {
        ...prev,
        current_index: undefined,
      };
    });
  }, []);

  const updateLatestMessage = useCallback(
    (msgs: ChatMessage[], newProps: Partial<ChatMessage>): ChatMessage[] => {
      const cloned = cloneDeep(msgs);
      const latest = cloned[cloned.length - 1];
      return [...cloned.slice(0, -1), { ...latest, ...newProps }];
    },
    [],
  );

  const stopStream = useCallback(async () => {
    if (controllerRef.current) {
      controllerRef.current?.abort();
      controllerRef.current = null;
    }
    setChatStreaming(false);
    setIsLoading(false);
    stopStreamRef.current = true;
  }, []);

  const stopConversation = useCallback(async () => {
    try {
      const response = await stopConversationApi(httpClient, endpoints, {
        messageId: messageId,
      });
      if (response?.status === 200) {
        setMessageId(undefined);
      }
    } catch {
      console.error(`error executing stop conversation api`);
    }
  }, [messageId, httpClient, endpoints]);

  const resetConversation = useCallback(async () => {
    try {
      await stopStream();
      setChangeConversationLoading(true);
      setConversationId(undefined);
      setMessageId(undefined);
      setMessage("");
      setAgentArtifactDrawerVisible(false);
      setAgentToolDrawerVisible(false);
      setAgentToolDrawerConfig({
        messageId: undefined,
        allTools: [],
        selectedToolCallId: undefined,
      });

      setMessages([]);
      setArtifacts({
        id: undefined,
        contents: [],
        current_index: undefined,
      });
    } catch (error) {
      setMessages([]);
      setArtifacts({
        id: undefined,
        contents: [],
        current_index: undefined,
      });
    } finally {
      setChangeConversationLoading(false);
    }
  }, [stopStream]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const resetCustAtrr = useCallback(() => {
    stopStream();
    setCustAtrr(undefined);
  }, [stopStream]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e?.target?.value);
    },
    [],
  );

  const changeConversation = useCallback(
    async (convId: string | undefined) => {
      try {
        await stopStream();
        setChangeConversationLoading(true);
        setConversationId(convId);
        setMessageId(undefined);
        setMessage("");
        setAgentArtifactDrawerVisible(false);
        setAgentToolDrawerVisible(false);
        setAgentToolDrawerConfig({
          messageId: undefined,
          allTools: [],
          selectedToolCallId: undefined,
        });
        if (convId) {
          setMessages([]);
          setArtifacts({
            id: undefined,
            contents: [],
            current_index: undefined,
          });
          const chatDetails = await getChatDetails(
            httpClient,
            endpoints,
            convId,
            { userId: config.userId },
            { [X_PROJECT_ID]: projectId || config.projectId },
          );
          setMessages(chatDetails?.[0]);
          setArtifacts(chatDetails?.[1]);
        } else {
          setMessages([]);
          setArtifacts({
            id: undefined,
            contents: [],
            current_index: undefined,
          });
        }
      } catch (error) {
        setMessages([]);
        setArtifacts({
          id: undefined,
          contents: [],
          current_index: undefined,
        });
      } finally {
        setChangeConversationLoading(false);
      }
    },
    [config, httpClient, endpoints, projectId, stopStream],
  );

  const addMessageToChat = useCallback(
    (
      msg: string,
      role: ChatMessage["role"] = "user",
      id?: string,
      additionalDetails?: UnknownObject,
    ) => {
      setMessages((msgs) => [
        ...msgs,
        { role, content: msg, id: id ?? uuidv4(), ...additionalDetails },
      ]);
    },
    [],
  );

  const appendMessageToChat = useCallback((msg: string) => {
    setMessages((msgs) => {
      const latestMessage = msgs[msgs.length - 1];
      return [
        ...msgs.slice(0, -1),
        { ...latestMessage, content: `${latestMessage.content}${msg}` },
      ];
    });
  }, []);

  const appendIdToChat = useCallback((id: string) => {
    setMessages((msgs) => {
      const latestMessage = msgs[msgs.length - 1];
      return [...msgs.slice(0, -1), { ...latestMessage, id }];
    });
  }, []);

  const appendExtraMessageDetailsToChat = useCallback(
    (type: ChunkType, data: any) => {
      setMessages((msgs) => {
        const latestMessage = msgs[msgs.length - 1];
        switch (type) {
          case ChunkType.TOOL_CALLS: {
            const newTools =
              data
                ?.map?.((toolData: any) => {
                  if (toolData && Object.keys(toolData || {})?.length > 0) {
                    const functionDetails = toolData.function || {};
                    return { ...(toolData || {}), ...(functionDetails || {}) };
                  }
                  return null;
                })
                ?.filter(Boolean) || null;
            return updateLatestMessage(msgs, { tools: newTools });
          }
          case ChunkType.TOOL: {
            const newToolwithDetails = latestMessage?.tools
              ? latestMessage?.tools?.map?.((toolData: any) =>
                  toolData?.id === data?.tool_call_id
                    ? { ...toolData, content: data?.content }
                    : { ...toolData },
                )
              : null;
            return updateLatestMessage(msgs, { tools: newToolwithDetails });
          }
          case ChunkType.CITATION: {
            const citations = { ...(latestMessage?.citations || {}) };
            if (data?.result?.nodes) {
              data?.result?.nodes?.forEach?.((citationChunk: any) => {
                const fileName =
                  citationChunk?.metadata?.file_name ||
                  citationChunk?.metadata?.filename;
                if (fileName) {
                  citations[fileName] = citations[fileName]
                    ? [...citations[fileName], citationChunk]
                    : [citationChunk];
                }
              });
            } else if (
              Array.isArray(data?.result) &&
              data?.result?.length > 0
            ) {
              data?.result?.forEach((citationChunk: any) => {
                const fileName =
                  citationChunk?.doc?.file_name || citationChunk?.doc?.filename;
                if (fileName) {
                  citations[fileName] = citations[fileName]
                    ? [...citations[fileName], citationChunk]
                    : [citationChunk];
                }
              });
            }
            return updateLatestMessage(msgs, {
              citations: Object.keys(citations).length > 0 ? citations : null,
            });
          }
          case ChunkType.FOLLOW_UP_MESSAGE: {
            return updateLatestMessage(msgs, { followUpMessages: data });
          }
          case ChunkType.TOOL_CITATION_MESSAGE: {
            const tool_citations = latestMessage?.tool_citations || [];
            if (data && Object.keys(data).length) {
              tool_citations?.push?.(data);
            }
            return updateLatestMessage(msgs, { tool_citations });
          }
          case ChunkType.TRACE: {
            return updateLatestMessage(msgs, {
              trace: checkValidStringifiedJSON(data)
                ? JSON.parse(data ?? JSON.stringify(""))
                : {},
            });
          }
          case ChunkType.PLAN_INITIATION: {
            const planning_details = latestMessage?.planning_details || {};
            const updatedMainGoal = `${(planning_details as any).main_goal ?? ""}${data}`;
            (planning_details as any).status = "Running";
            return updateLatestMessage(msgs, {
              planning_details: {
                ...planning_details,
                main_goal: updatedMainGoal,
              },
            });
          }
          case ChunkType.STEP_EXECUTION_INFO: {
            const planning_details = latestMessage?.planning_details || {};
            const planning_stepsDetails =
              (planning_details as any)?.steps || [];
            let stepToUpdate =
              planning_stepsDetails?.find(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id === data?.step_id,
              ) ?? {};
            const updatedStep = {
              ...stepToUpdate,
              step_id: data?.step_id,
              execution_info: `${stepToUpdate?.execution_info ?? ""}${data?.content}`,
            };
            const updated_step_details = [
              ...planning_stepsDetails?.filter(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id !== data?.step_id,
              ),
              updatedStep,
            ];

            return updateLatestMessage(msgs, {
              planning_details: {
                ...planning_details,
                steps: updated_step_details,
              },
            });
          }
          case ChunkType.STEP_OBSERVATION: {
            const planning_details = latestMessage?.planning_details || {};
            const planning_stepsDetails =
              (planning_details as any)?.steps || [];
            let stepToUpdate =
              planning_stepsDetails?.find(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id === data?.step_id,
              ) ?? {};
            const updatedStep = {
              ...stepToUpdate,
              step_id: data?.step_id,
              step_output: `${stepToUpdate?.step_output ?? ""}${data?.content}`,
            };
            const updated_step_details = [
              ...planning_stepsDetails?.filter(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id !== data?.step_id,
              ),
              updatedStep,
            ];

            return updateLatestMessage(msgs, {
              planning_details: {
                ...planning_details,
                steps: updated_step_details,
              },
            });
          }
          case ChunkType.STEP_EVALUATION: {
            const planning_details = latestMessage?.planning_details || {};
            const planning_stepsDetails =
              (planning_details as any)?.steps || [];
            let stepToUpdate =
              planning_stepsDetails?.find(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id === data?.step_id,
              ) ?? {};
            const updatedStep = {
              ...stepToUpdate,
              step_id: data?.step_id,
              evaluation: `${stepToUpdate?.evaluation ?? ""}${data?.content}`,
            };
            const updated_step_details = [
              ...planning_stepsDetails?.filter(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id !== data?.step_id,
              ),
              updatedStep,
            ];

            return updateLatestMessage(msgs, {
              planning_details: {
                ...planning_details,
                steps: updated_step_details,
              },
            });
          }
          case ChunkType.NEXT_GOAL: {
            const planning_details = latestMessage?.planning_details || {};
            const planning_stepsDetails =
              (planning_details as any)?.steps || [];
            let stepToUpdate =
              planning_stepsDetails?.find(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id === data?.step_id,
              ) ?? {};
            const updatedStep = {
              ...stepToUpdate,
              step_id: data?.step_id,
              next_goal: `${stepToUpdate?.next_goal ?? ""}${data?.content}`,
            };
            const updated_step_details = [
              ...planning_stepsDetails?.filter(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id !== data?.step_id,
              ),
              updatedStep,
            ];

            return updateLatestMessage(msgs, {
              planning_details: {
                ...planning_details,
                steps: updated_step_details,
              },
            });
          }
          case ChunkType.PLANNING_TOOL_CALLS: {
            const planning_details = latestMessage?.planning_details || {};
            const planning_stepsDetails =
              (planning_details as any)?.steps || [];
            let stepToUpdate =
              planning_stepsDetails?.find(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id === data?.step_id,
              ) ?? {};

            const newTools =
              data?.tool_calls
                ?.map?.((toolData: any) => {
                  if (toolData && Object.keys(toolData || {})?.length > 0) {
                    const functionDetails = toolData.function || {};

                    return {
                      ...(toolData || {}),
                      ...(functionDetails || {}),
                      status: "Pending",
                      jobId: data?.job_ids?.[toolData?.id]?.job_id ?? null,
                      toolId: data?.job_ids?.[toolData?.id]?.tool_id ?? null,
                      toolType: data?.type_map?.[toolData?.id] ?? "workflow",
                    };
                  }
                  return null;
                })
                ?.filter(Boolean) || null;

            const updatedStep = {
              ...stepToUpdate,
              step_id: data?.step_id,
              tools: newTools,
            };
            const updated_step_details = [
              ...planning_stepsDetails?.filter(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id !== data?.step_id,
              ),
              updatedStep,
            ];

            return updateLatestMessage(msgs, {
              planning_details: {
                ...planning_details,
                steps: updated_step_details,
              },
            });
          }
          case ChunkType.PLANNING_TOOL: {
            const planning_details = latestMessage?.planning_details || {};
            const planning_stepsDetails =
              (planning_details as any)?.steps || [];
            let stepToUpdate =
              planning_stepsDetails?.find(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id === data?.step_id,
              ) ?? {};

            const newToolwithDetails = stepToUpdate?.tools
              ? stepToUpdate?.tools?.map?.((toolData: any) =>
                  toolData?.id === data?.tool_call_id
                    ? {
                        ...toolData,
                        content: data?.content,
                        status: "COMPLETED",
                      }
                    : { ...toolData },
                )
              : null;

            const updatedStep = {
              ...stepToUpdate,
              step_id: data?.step_id,
              tools: newToolwithDetails,
            };
            const updated_step_details = [
              ...planning_stepsDetails?.filter(
                (stepDetail: UnknownObject) =>
                  stepDetail?.step_id !== data?.step_id,
              ),
              updatedStep,
            ];

            return updateLatestMessage(msgs, {
              planning_details: {
                ...planning_details,
                steps: updated_step_details,
              },
            });
          }
          case ChunkType.PLANNING_EXECUTED: {
            const planning_details = latestMessage?.planning_details || {};
            return updateLatestMessage(msgs, {
              ...(planning_details &&
              Object.keys(planning_details || {})?.length > 0
                ? {
                    planning_details: {
                      ...planning_details,
                      status: "Completed",
                    },
                  }
                : {}),
            });
          }
          case ChunkType.THINKING_DURATION: {
            const planning_details = latestMessage?.planning_details || {};
            return updateLatestMessage(msgs, {
              ...(planning_details &&
              Object.keys(planning_details || {})?.length > 0
                ? {
                    planning_details: {
                      ...planning_details,
                      timingMessage: data,
                    },
                  }
                : {}),
            });
          }
          case ChunkType.BROWSER_AGENT_ACTION: {
            if (checkValidStringifiedJSON(data?.content)) {
              const parsedBrowserAgentContent = JSON.parse(
                data?.content || JSON.stringify({}),
              );

              const planning_details = latestMessage?.planning_details || {};
              const planning_stepsDetails =
                (planning_details as any)?.steps || [];
              let stepToUpdate =
                planning_stepsDetails?.find(
                  (stepDetail: UnknownObject) =>
                    stepDetail?.step_id === data?.step_id,
                ) ?? {};

              const newToolwithDetails = stepToUpdate?.tools
                ? stepToUpdate?.tools?.map?.((toolData: any) =>
                    toolData?.id === data?.tool_call_id
                      ? !(parsedBrowserAgentContent?.output?.length > 0) &&
                        Object.keys(
                          parsedBrowserAgentContent?.agent_output || {},
                        )?.length > 0
                        ? {
                            ...toolData,
                            status: "running",
                            ...parsedBrowserAgentContent,
                            currentState: getBrowserUseState(
                              parsedBrowserAgentContent?.agent_output
                                ?.action?.[0],
                            ),
                            currentMessage:
                              parsedBrowserAgentContent?.agent_output
                                ?.current_state?.next_goal ?? "",
                            browserUseSteps: [
                              ...(toolData?.browserUseSteps || []),
                              {
                                state: getBrowserUseState(
                                  parsedBrowserAgentContent?.agent_output
                                    ?.action?.[0],
                                ),
                                message:
                                  parsedBrowserAgentContent?.agent_output
                                    ?.current_state?.next_goal ?? "",
                                url: parsedBrowserAgentContent?.browser_url,
                                imageUrl:
                                  parsedBrowserAgentContent?.screenshot_url,
                              },
                            ],
                          }
                        : {
                            ...toolData,
                            currentState: "COMPLETED",
                            currentMessage: "completed browser_use usage",
                            status: "Completed",
                            ...parsedBrowserAgentContent,
                          }
                      : { ...toolData },
                  )
                : null;
              const updatedStep = {
                ...stepToUpdate,
                step_id: data?.step_id,
                tools: newToolwithDetails,
              };
              const updated_step_details = [
                ...planning_stepsDetails?.filter(
                  (stepDetail: UnknownObject) =>
                    stepDetail?.step_id !== data?.step_id,
                ),
                updatedStep,
              ];

              return updateLatestMessage(msgs, {
                planning_details: {
                  ...planning_details,
                  steps: updated_step_details,
                },
              });
            } else {
              console.error("error while parsing browser use tool data");
            }
          }
          case ChunkType.ARTIFACT_INITIATED: {
            const artifact_details = {
              ...(latestMessage?.artifact_details || {}),
              status: "Pending",
              id: data?.data?.artifact_id,
              index: data?.data?.current_index,
              title: data?.data?.contents?.find(
                (contentData: any) =>
                  contentData?.index === data?.data?.current_index,
              )?.title,
            };
            return updateLatestMessage(msgs, {
              artifact_details: artifact_details,
            });
          }
          case ChunkType.ARTIFACT_COMPLETED: {
            const artifact_details = {
              ...(latestMessage?.artifact_details || {}),
              status: "Completed",
            };
            return updateLatestMessage(msgs, {
              artifact_details: artifact_details,
            });
          }
          default:
            return [...msgs];
        }
      });
    },
    [updateLatestMessage],
  );

  const updateArtifactData = useCallback(
    async (data: any) => {
      setArtifacts((artifacts) => {
        return {
          id: data?.data?.artifact_id,
          contents: data?.data?.contents || [artifacts?.contents],
          current_index: data?.data?.current_index,
        };
      });
      setAgentArtifactDrawerVisible(true);
      setAgentToolDrawerVisible(false);
    },
    [],
  );

  const appendDetailsToArtifact = useCallback(async (data: any) => {
    setArtifacts((artifacts: ChatArtifacts) => {
      const artifactToUpdate: any =
        artifacts?.contents?.find(
          (artifactContentDetail) =>
            artifactContentDetail?.index === data?.data?.content_index,
        ) ?? {};

      const updatedArtifact = {
        ...artifactToUpdate,
        [data?.data?.field_name]:
          `${artifactToUpdate[data?.data?.field_name]}${data?.data?.delta}`,
      };

      return {
        ...artifacts,
        contents: artifacts?.contents?.map((artifactContentDetail) => {
          if (artifactContentDetail?.index === data?.data?.content_index) {
            return updatedArtifact;
          } else {
            return artifactContentDetail;
          }
        }),
      };
    });
  }, []);

  const updateArtifact = useCallback(
    debounce(async (data: Artifact) => {
      try {
        const updatedContent = artifacts?.contents?.map((artifactDetail) => {
          if (artifactDetail?.index === data?.index) {
            return {
              ...artifactDetail,
              ...data,
            };
          } else {
            return artifactDetail;
          }
        });
        const payload = {
          ...artifacts,
          contents: updatedContent,
          current_index: artifacts?.current_index ?? 0,
        };
        await updateArtifactApi(httpClient, endpoints, {
          artifactId: artifacts?.id,
          payload,
          headers: {
            [X_PROJECT_ID]: projectId || config.projectId,
          },
        });
      } catch {
        console.error("error updating artifacts");
      }
    }, 1000),
    [artifacts, httpClient, endpoints, projectId, config],
  );

  const replaceMessageToChat = useCallback((msg: string) => {
    setMessages((msgs) => {
      const latestMessage = msgs[msgs.length - 1];
      return [...msgs.slice(0, -1), { ...latestMessage, content: msg }];
    });
  }, []);

  const fetchAndUpdateAIResponse = useCallback(
    async (messageID: string, signal: AbortSignal) => {
      try {
        const response = await fetch(
          `${endpoints.intract.streamResponse}/${messageID}/stream`,
          {
            headers: { Accept: "text/event-stream" },
            signal,
          },
        );
        const reader = response?.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        while (true) {
          if (stopStreamRef.current) {
            setChatStreaming(false);
            setIsLoading(false);
            stopStreamRef.current = false;
            setMessageId(undefined);
            break;
          }
          const { value, done } = (await reader?.read?.()) || {};
          if (done) {
            setChatStreaming(false);
            setIsLoading(false);
            setMessageId(undefined);
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          for (let i = 0; i < parts.length - 1; i++) {
            const rawEvent = parts[i].trim();
            if (!rawEvent) continue;
            let eventName = "message";
            const dataLines: string[] = [];
            rawEvent?.split?.("\n")?.forEach?.((line) => {
              if (line?.startsWith?.("event:")) {
                eventName = line.slice("event:".length).trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.slice("data:".length).trim());
              }
            });
            const eventData = dataLines.join("\n");
            if (chatConfig?.model_id?.includes("agent")) {
              const chatResponseChunkJson = JSON.parse(
                eventData?.replace?.(/---->/g, "")?.replace?.(/<----/g, "") ||
                  "{}",
              );
              const role = chatResponseChunkJson?.role?.toUpperCase();
              const chunkEvent = chatResponseChunkJson?.event?.toUpperCase();
              const response_type =
                chatResponseChunkJson?.message_type?.toUpperCase();
              if (role !== "TRACE") setIsLoading(false);
              if (
                role === "ASSISTANT" &&
                chatResponseChunkJson?.content &&
                (!response_type || response_type === "FINAL_OUTPUT")
              ) {
                appendMessageToChat(chatResponseChunkJson.content);
                appendExtraMessageDetailsToChat(
                  ChunkType.PLANNING_EXECUTED,
                  chatResponseChunkJson,
                );
              } else if (
                role === "ASSISTANT" &&
                chatResponseChunkJson?.tool_calls?.length > 0
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.TOOL_CALLS,
                  chatResponseChunkJson.tool_calls,
                );
                if (response_type === "STEP_OBSERVATION")
                  appendExtraMessageDetailsToChat(
                    ChunkType.PLANNING_TOOL_CALLS,
                    chatResponseChunkJson,
                  );
              } else if (
                role === "TOOL" &&
                chatResponseChunkJson?.tool_call_id
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.TOOL,
                  chatResponseChunkJson,
                );
                if (response_type === "STEP_OBSERVATION") {
                  appendExtraMessageDetailsToChat(
                    ChunkType.PLANNING_TOOL,
                    chatResponseChunkJson,
                  );
                }
              } else if (
                role === "ASSISTANT" &&
                chatResponseChunkJson?.citation_message
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.CITATION,
                  chatResponseChunkJson.citation_message,
                );
              } else if (
                role === "FOLLOW_UP_MESSAGE" &&
                chatResponseChunkJson?.content
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.FOLLOW_UP_MESSAGE,
                  chatResponseChunkJson.content,
                );
              } else if (
                role === "ASSISTANT" &&
                chatResponseChunkJson?.tool_citation_message
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.TOOL_CITATION_MESSAGE,
                  chatResponseChunkJson,
                );
              } else if (role === "TRACE" && chatResponseChunkJson?.content) {
                appendExtraMessageDetailsToChat(
                  ChunkType.TRACE,
                  chatResponseChunkJson?.content,
                );
              } else if (
                role === "ASSISTANT" &&
                response_type === "PLAN_INITIATED" &&
                chatResponseChunkJson?.content
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.PLAN_INITIATION,
                  chatResponseChunkJson?.content,
                );
              } else if (
                role === "ASSISTANT" &&
                response_type === "STEP_EXECUTION_INFO" &&
                chatResponseChunkJson?.content
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.STEP_EXECUTION_INFO,
                  chatResponseChunkJson,
                );
              } else if (
                role === "ASSISTANT" &&
                response_type === "STEP_OBSERVATION" &&
                chatResponseChunkJson?.content
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.STEP_OBSERVATION,
                  chatResponseChunkJson,
                );
              } else if (
                role === "ASSISTANT" &&
                response_type === "EVALUATION" &&
                chatResponseChunkJson?.content
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.STEP_EVALUATION,
                  chatResponseChunkJson,
                );
              } else if (
                role === "ASSISTANT" &&
                response_type === "NEXT_GOAL" &&
                chatResponseChunkJson?.content
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.NEXT_GOAL,
                  chatResponseChunkJson,
                );
              } else if (
                role === "ASSISTANT" &&
                chatResponseChunkJson?.content &&
                response_type === "THINKING_DURATION"
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.THINKING_DURATION,
                  chatResponseChunkJson?.content,
                );
              } else if (
                role === "ASSISTANT" &&
                chatResponseChunkJson?.content &&
                response_type === "BROWSER_AGENT_ACTION"
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.BROWSER_AGENT_ACTION,
                  chatResponseChunkJson,
                );
              } else if (
                chunkEvent === "ARTIFACT_START" &&
                chatResponseChunkJson
              ) {
                updateArtifactData(chatResponseChunkJson);
                appendExtraMessageDetailsToChat(
                  ChunkType.ARTIFACT_INITIATED,
                  chatResponseChunkJson,
                );
              } else if (
                chunkEvent === "ARTIFACT_DELTA" &&
                chatResponseChunkJson?.data
              ) {
                appendDetailsToArtifact(chatResponseChunkJson);
              } else if (
                chunkEvent === "ARTIFACT_END" &&
                chatResponseChunkJson?.data
              ) {
                appendExtraMessageDetailsToChat(
                  ChunkType.ARTIFACT_COMPLETED,
                  chatResponseChunkJson,
                );
              }
            } else {
              setIsLoading(false);
              appendMessageToChat(
                eventData.replace(/---->/g, "").replace(/<----/g, ""),
              );
            }
          }
          buffer = parts[parts.length - 1];
        }
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }
        if (getErrorFromApi(error) === "Failed to fetch") {
          setChatStreaming(true);
          await fetchAndUpdateAIResponse(messageID, signal);
          return null;
        }
        if (error?.response?.status === 403) {
          replaceMessageToChat(getErrorFromApi(error));
        } else {
          replaceMessageToChat(getErrorFromApi(SimplAi_ERROR_MESSAGE));
        }
        setChatStreaming(false);
        setIsLoading(false);
        setMessageId(undefined);
      } finally {
        controllerRef.current = null;
        stopStreamRef.current = false;
      }
    },
    [
      chatConfig,
      endpoints,
      appendMessageToChat,
      appendExtraMessageDetailsToChat,
      replaceMessageToChat,
      updateArtifactData,
      appendDetailsToArtifact,
    ],
  );

  const submitMessageFeedback = useCallback(
    async (liked: boolean, messageObj: ChatMessage, remark?: string) => {
      const messagesClone = cloneDeep(messages);
      const messageToUpdate = messagesClone.find(
        (chatMessage: ChatMessage) => chatMessage?.id === messageObj?.id,
      );
      if (!messageToUpdate) return;
      const updatedMessage: ChatMessage = {
        ...messageToUpdate,
        message_liked: liked,
        feedback_remark: remark ?? null,
      };
      setMessages((prev: ChatMessage[]) =>
        prev.map((chatMessage) =>
          chatMessage?.id === updatedMessage?.id ? updatedMessage : chatMessage,
        ),
      );
      try {
        const res = await submitUserMessageFeedbackApi(httpClient, endpoints, {
          payload: {
            conversation_id: conversationId,
            message_id: messageObj?.id,
            version_id: chatConfig?.version_id,
            app_id: chatConfig?.app_id,
            app_name: chatConfig?.model,
            like_dislike: liked,
            remarks: remark,
          },
          headers: { [X_PROJECT_ID]: projectId || config.projectId },
        });
        if (res?.status !== 200 && res?.status !== 201) {
          setMessages((prev: ChatMessage[]) =>
            prev?.map?.((chatMessage) =>
              chatMessage?.id === updatedMessage?.id
                ? messageToUpdate!
                : chatMessage,
            ),
          );
        }
      } catch (error) {
        setMessages((prev: ChatMessage[]) =>
          prev?.map?.((chatMessage) =>
            chatMessage?.id === updatedMessage?.id
              ? messageToUpdate!
              : chatMessage,
          ),
        );
      }
    },
    [messages, conversationId, chatConfig, projectId, config, httpClient, endpoints],
  );

  const handleSubmit = useCallback(
    async (
      e?: FormEvent<HTMLFormElement>,
      newMessage?: string,
      additionalConfig?: UnknownObject,
    ) => {
      if (isLoading || chatStreaming || !(newMessage && newMessage?.trim?.())) {
        return null;
      }
      stopStreamRef.current = false;
      setIsLoading(true);
      setChatStreaming(true);
      addMessageToChat(newMessage, "user", undefined, {
        ...(artifacts?.current_index !== undefined
          ? {
              artifact_details: {
                id: artifacts?.id,
                index: artifacts?.current_index,
                title:
                  artifacts?.contents?.find(
                    (artifactDetails) =>
                      artifactDetails?.index === artifacts?.current_index,
                  )?.title || "",
                ...additionalConfig,
              },
            }
          : {}),
      });
      setMessage("");
      setAgentToolDrawerVisible(false);

      controllerRef.current?.abort();
      controllerRef.current = new AbortController();
      const signal = controllerRef.current.signal;
      const handleAbort = () => {
        if (streamRef?.current) {
          setChatStreaming(false);
          setIsLoading(false);
          streamRef?.current?.close?.();
          setMessageId(undefined);
        }
      };

      signal.addEventListener("abort", handleAbort);

      try {
        addMessageToChat("", "SimplAi");
        const res = await initiateConversationApi(httpClient, endpoints, {
          payload: {
            ...chatConfig,
            cust_attr: custAtrr,
            state_override: {
              sys: {
                user_timezone:
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
                language_code: navigator.language || "en-US",
              },
            },
            action: "START_SCREEN",
            query: {
              message: newMessage,
              message_type: "text",
              message_category: "",
            },
            conversation_id: conversationId,
            ...(!!artifacts?.id
              ? {
                  artifact: {
                    id: artifacts?.id,
                    current_index: artifacts?.current_index,
                  },
                }
              : {}),
            ...additionalConfig,
          },
          headers: {
            [X_SELLER_ID]: config.userId,
            [X_SELLER_PROFILE_ID]: config.userId,
            [X_PROJECT_ID]: projectId || config.projectId,
          },
          signal,
        });
        if (res?.data?.result?.conversation_id) {
          if (
            !conversationId ||
            res?.data?.result?.conversation_id !== conversationId
          ) {
            setConversationId(res?.data?.result?.conversation_id);
          }
          setMessageId(res?.data?.result?.message_id);
          appendIdToChat(res?.data?.result?.message_id);
          await fetchAndUpdateAIResponse(
            res?.data?.result?.message_id,
            signal,
          );
        }
      } catch (error: any) {
        if (
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError" ||
          error?.message === "canceled"
        ) {
          return;
        }
        // Simplified error handling (no plan validation in SDK)
        const errorMessage = getErrorFromApi(error);
        if (error?.response?.status === 403) {
          appendMessageToChat(INSUFFICIENT_CREDIT_ERROR);
        } else {
          appendMessageToChat(errorMessage || SimplAi_ERROR_MESSAGE);
        }
        setIsLoading(false);
        setChatStreaming(false);
        setMessageId(undefined);
      }
    },
    [
      isLoading,
      chatStreaming,
      chatConfig,
      conversationId,
      config,
      projectId,
      custAtrr,
      artifacts,
      httpClient,
      endpoints,
      addMessageToChat,
      appendIdToChat,
      appendMessageToChat,
      fetchAndUpdateAIResponse,
    ],
  );

  return {
    conversationId,
    setConversationId,
    messages,
    setMessages,
    input: message,
    setInput: setMessage,
    handleInputChange,
    handleSubmit,
    isLoading,
    chatStreaming,
    stopStream,
    chatConfig,
    setChatConfig,
    changeConversation,
    changeConversationLoading,
    custAtrr,
    setCustAtrr,
    resetCustAtrr,
    submitMessageFeedback,
    projectId,
    setProjectId,
    agentToolDrawerConfig,
    setAgentToolDrawerConfig,
    agentToolDrawerVisible,
    setAgentToolDrawerVisible,
    stopConversation,
    artifacts,
    setArtifacts,
    agentArtifactDrawerVisible,
    setAgentArtifactDrawerVisible,
    closeAgentArtifactDrawer,
    updateArtifact,
    resetConversation,
  };
};

export default useChatStream;
