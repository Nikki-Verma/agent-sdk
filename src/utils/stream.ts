import { AxiosInstance } from "axios";
import { cloneDeep } from "lodash";
import { v4 } from "uuid";
import { ChunkType, Headers, Params, SDKEndpoints, UnknownObject } from "../types";
import { getBrowserUseState } from "./helpers";

const DEFAULT_HEADERS = {
  "Content-Type": "text/markdown",
};

const getChatToolDetail = (type: ChunkType, toolDetail: any, tools?: any) => {
  switch (type) {
    case ChunkType.TOOL_CALLS:
      const newTools =
        toolDetail
          ?.map?.((toolData: any) => {
            if (Object.keys(toolData || {})?.length > 0) {
              const functionDetails = toolData?.function || {};
              return { ...(toolData || {}), ...(functionDetails || {}) };
            } else {
              return null;
            }
          })
          ?.filter?.((toolData: any) => !!toolData) || null;
      return newTools;

    case ChunkType.TOOL:
      const newToolwithDetails =
        tools?.length > 0
          ? tools?.map?.((toolData: any) => {
              if (toolData?.id === toolDetail?.tool_call_id) {
                return {
                  ...toolData,
                  content: toolDetail?.content,
                };
              } else {
                return { ...toolData };
              }
            })
          : null;
      return newToolwithDetails;

    case ChunkType.CITATION:
      const citations = cloneDeep(tools);

      if (!!toolDetail?.nodes) {
        toolDetail?.nodes?.map?.((citationChunk: any) => {
          if (!!citations?.[citationChunk?.metadata?.file_name]) {
            citations[citationChunk?.metadata?.file_name] = [
              ...(citations?.[citationChunk?.metadata?.file_name] || []),
              citationChunk,
            ];
          } else {
            citations[citationChunk?.metadata?.file_name] = [citationChunk];
          }
        });
      } else if (toolDetail?.length > 0) {
        const citationsData = cloneDeep(toolDetail);
        citationsData?.map?.((citationChunk: any) => {
          if (!!citations?.[citationChunk?.doc?.file_name]) {
            citations[citationChunk?.doc?.file_name] = [
              ...(citations?.[citationChunk?.doc?.file_name] || []),
              citationChunk,
            ];
          } else {
            citations[citationChunk?.doc?.file_name] = [citationChunk];
          }
        });
      }

      return citations;

    case ChunkType.TOOL_CITATION_MESSAGE:
      const tool_citations = cloneDeep(tools);
      const toolCitationDetails = cloneDeep(toolDetail);
      if (Object.keys(toolCitationDetails || {})?.length) {
        tool_citations?.push?.(toolCitationDetails);
      }
      return tool_citations;
    default:
      return null;
  }
};

const getChatTools = (tools: any) => {
  try {
    if (!tools) {
      return null;
    } else {
      let chatTools: any = null;

      tools?.forEach?.((tool: any) => {
        const parsedToolDetails = JSON.parse(tool);

        if (parsedToolDetails?.tool_calls?.length > 0) {
          chatTools = getChatToolDetail(
            ChunkType.TOOL_CALLS,
            parsedToolDetails?.tool_calls,
          );
        }
      });

      if (chatTools?.length > 0)
        tools?.forEach?.((tool: any) => {
          const parsedToolDetails = JSON.parse(tool);

          if (
            parsedToolDetails?.role?.toUpperCase?.() === "TOOL" &&
            !!parsedToolDetails?.tool_call_id
          ) {
            chatTools = getChatToolDetail(
              ChunkType.TOOL,
              parsedToolDetails,
              chatTools,
            );
          }
        });

      return chatTools;
    }
  } catch (error) {
    return null;
  }
};

const getChatCitations = (tools: any) => {
  try {
    if (!tools) {
      return null;
    } else {
      let chatCitations: any = {};

      tools?.forEach?.((tool: any) => {
        const parsedToolDetails = JSON.parse(tool);

        if (
          parsedToolDetails?.role?.toUpperCase?.() === "ASSISTANT" &&
          !!parsedToolDetails?.citation_message
        ) {
          chatCitations = getChatToolDetail(
            ChunkType.CITATION,
            parsedToolDetails?.citation_message,
            chatCitations,
          );
        }
      });

      return chatCitations;
    }
  } catch (error) {
    return null;
  }
};

const getChatToolCitations = (tools: any) => {
  try {
    if (!tools) {
      return null;
    } else {
      let toolCitations: any = [];

      tools?.forEach?.((tool: any) => {
        const parsedToolDetails = JSON.parse(tool);

        if (
          parsedToolDetails?.role?.toUpperCase?.() === "ASSISTANT" &&
          !!parsedToolDetails?.tool_citation_message
        ) {
          toolCitations = getChatToolDetail(
            ChunkType.TOOL_CITATION_MESSAGE,
            parsedToolDetails,
            toolCitations,
          );
        }
      });

      return toolCitations;
    }
  } catch (error) {
    return null;
  }
};

const getChatPlanningDetails = (chat: any) => {
  try {
    if (!chat) {
      return null;
    } else {
      let planDetails: any = {};
      if (chat?.plan_initiated) {
        const main_goal =
          JSON.parse(chat?.plan_initiated || JSON.stringify({}))?.content ||
          null;
        if (!!main_goal) {
          planDetails.main_goal = main_goal;
          planDetails.status = "Completed";
        }
      }
      if (
        chat?.step_execution &&
        Object.keys(chat?.step_execution || {})?.length > 0
      ) {
        const planning_stepsDetails = Object.values(
          chat?.step_execution || {},
        )?.map((stepData: any) => {
          const execution_info =
            JSON.parse(stepData?.execution_info || JSON.stringify({}))
              ?.content || null;
          const step_output =
            JSON.parse(stepData?.step_output || JSON.stringify({}))?.content ||
            null;
          const next_goal =
            JSON.parse(stepData?.next_goal || JSON.stringify({}))?.content ||
            null;
          const evaluation =
            JSON.parse(stepData?.evaluation || JSON.stringify({}))?.content ||
            null;
          const tools =
            JSON.parse(stepData?.tool_call || JSON.stringify({})) || null;
          let newTools =
            tools?.tool_calls
              ?.map?.((toolData: any) => {
                if (toolData && Object.keys(toolData || {})?.length > 0) {
                  const functionDetails = toolData.function || {};
                  return {
                    ...(toolData || {}),
                    ...(functionDetails || {}),
                    status: "COMPLETED",
                    jobId: tools?.job_ids?.[toolData?.id]?.job_id ?? null,
                    toolId: tools?.job_ids?.[toolData?.id]?.tool_id ?? null,
                    toolType: tools?.type_map?.[toolData?.id] ?? "workflow",
                  };
                }
                return null;
              })
              ?.filter(Boolean) || null;
          if (stepData?.tool_output?.length > 0) {
            stepData?.tool_output?.map((toolOutputData: any) => {
              const toolOutput =
                JSON.parse(toolOutputData || JSON.stringify({})) || null;
              newTools = newTools
                ? newTools.map?.((toolData: any) =>
                    toolData?.id === toolOutput?.tool_call_id
                      ? {
                          ...toolData,
                          content: toolOutput?.content,
                          status: "COMPLETED",
                        }
                      : { ...toolData },
                  )
                : null;
            });
          }
          if (stepData?.browser_use_step?.length > 0) {
            stepData?.browser_use_step?.forEach(
              (browserStepDetail: any) => {
                const browserStepChunk =
                  JSON.parse(browserStepDetail || JSON.stringify({})) || null;

                const parsedBrowserAgentContent =
                  JSON.parse(browserStepChunk?.content || JSON.stringify({})) ||
                  null;
                newTools = newTools
                  ? newTools.map?.((toolData: any) =>
                      toolData?.id === browserStepChunk?.tool_call_id
                        ? !(parsedBrowserAgentContent?.output?.length > 0) &&
                          Object.keys(
                            parsedBrowserAgentContent?.agent_output || {},
                          )?.length > 0
                          ? {
                              ...toolData,
                              status: "Completed",
                              ...parsedBrowserAgentContent,
                              currentState: "COMPLETED",
                              currentMessage: "completed browser_use usage",
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
              },
            );
          }
          return {
            execution_info,
            step_output,
            evaluation,
            next_goal,
            tools: newTools,
          };
        });
        planDetails.steps = planning_stepsDetails;
      }
      return planDetails;
    }
  } catch (error) {
    return null;
  }
};

const getChatArtifactDetails = (chat: any) => {
  try {
    if (!chat) {
      return null;
    } else {
      let artifact_details: any = {};
      if (chat?.artifact_details) {
        const artifact_data =
          JSON.parse(chat?.artifact_details || JSON.stringify({}))?.data ||
          null;

        artifact_details = {
          status: "Completed",
          id: artifact_data?.artifact_id,
          index: artifact_data?.current_index,
          title: artifact_data?.contents?.find(
            (contentData: any) =>
              contentData?.index === artifact_data?.current_index,
          )?.title,
        };
      }
      return artifact_details;
    }
  } catch (error) {
    return null;
  }
};

const getUserArtifactDetails = (chat: any) => {
  try {
    if (!chat) {
      return null;
    } else {
      let artifact_details: any = {};
      if (chat?.artifact?.current_index) {
        const artifact_data =
          JSON.parse(chat?.artifact_details || JSON.stringify({}))?.data ||
          null;

        artifact_details = {
          id: chat?.artifact?.id,
          index: chat?.artifact?.current_index,
          title: artifact_data?.contents?.find(
            (contentData: any) =>
              contentData?.index === chat?.artifact?.current_index,
          )?.title,
          ...(chat?.highlighted_text?.selected_text ||
          chat?.highlighted_text?.selected_code
            ? { highlighted_text: chat?.highlighted_text }
            : {}),
        };
      }
      return artifact_details;
    }
  } catch (error) {
    return null;
  }
};

const getChatFollowUpMessages = (chatExtraDetails: any) => {
  try {
    if (!chatExtraDetails) {
      return null;
    } else {
      let followUpMessages: any = null;

      chatExtraDetails?.forEach?.((tool: any) => {
        const parsedToolDetails = JSON.parse(tool);

        if (parsedToolDetails?.role?.toUpperCase() === "FOLLOW_UP_MESSAGE") {
          followUpMessages = cloneDeep(parsedToolDetails?.content);
        }
      });

      return followUpMessages;
    }
  } catch (error) {
    return null;
  }
};

export const getChatDetails = async (
  httpClient: AxiosInstance,
  endpoints: SDKEndpoints,
  chatId: string,
  params?: Params,
  headers?: Headers,
) => {
  const response = await httpClient.get(
    `${endpoints.intract.chatDetails}/${chatId}`,
    {
      params,
      headers: { ...DEFAULT_HEADERS, ...headers },
    },
  );
  if (response?.status !== 200)
    throw new Error("Error while fetching chat details");

  const chatMessage =
    response?.data?.result?.response?.flatMap((chat: any) => {
      const getSimplaiTools = getChatTools(chat?.tool_calls);
      const getSimplaiFollowUpMessages = getChatFollowUpMessages(
        chat?.tool_calls,
      );
      const getSimplaiCitations = getChatCitations(chat?.tool_calls);
      const getSimplaiToolCitations = getChatToolCitations(chat?.tool_calls);
      const getSimplaiPlanningDetails = getChatPlanningDetails(chat);
      const getSimplaiArtifactDetails = getChatArtifactDetails(chat);
      const UserArtifactDetails = getUserArtifactDetails(chat);

      const userMessage = {
        role: "user",
        content: chat?.query?.message || "",
        id: v4(),
        artifact_details: UserArtifactDetails,
      };
      const SimplAiMessage = {
        role: "SimplAi",
        content: chat?.query_result || "",
        tools: getSimplaiTools,
        followUpMessages: getSimplaiFollowUpMessages,
        citations: getSimplaiCitations,
        tool_citations: getSimplaiToolCitations,
        id: chat?.id,
        message_liked: chat?.feedback_data?.like_dislike,
        feedback_remark: chat?.feedback_data?.remark,
        planning_details: getSimplaiPlanningDetails,
        artifact_details: getSimplaiArtifactDetails,
      };
      return [userMessage, SimplAiMessage];
    }) || [];

  let artifacts = {};

  try {
    if (!!response?.data?.result?.artifact_id) {
      const artifactsResponse = await httpClient.get(
        `${endpoints.agents.fetchArtifacts}/${response?.data?.result?.artifact_id}`,
        {
          params,
          headers: { ...DEFAULT_HEADERS, ...headers },
        },
      );
      artifacts = artifactsResponse?.data || {};
    }
  } catch {
    console.error("error fetching artifact response");
  }

  return [chatMessage, artifacts];
};

export const getChatMessage = async (messageObject: UnknownObject) => {
  const getSimplaiTools = getChatTools(messageObject?.tool_calls);
  const getSimplaiFollowUpMessages = getChatFollowUpMessages(
    messageObject?.tool_calls,
  );
  const getSimplaiCitations = getChatCitations(messageObject?.tool_calls);
  const getSimplaiToolCitations = getChatToolCitations(
    messageObject?.tool_calls,
  );

  const userMessage = {
    role: "user",
    content: messageObject?.query?.message || "",
    id: v4(),
  };
  const SimplAiMessage = {
    role: "SimplAi",
    content: messageObject?.response || "",
    tools: getSimplaiTools,
    followUpMessages: getSimplaiFollowUpMessages,
    citations: getSimplaiCitations,
    tool_citations: getSimplaiToolCitations,
    id: messageObject?.id,
    message_liked: messageObject?.like_dislike,
    feedback_remark: messageObject?.remarks,
  };

  const chatMessage = [userMessage, SimplAiMessage];

  return chatMessage;
};

export async function* decodeStreamToJson(
  reader: any,
): AsyncIterableIterator<string> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    if (value) {
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split(/\n\n/);

      for (let i = 0; i < parts.length - 1; i++) {
        const message = parts[i].replace(/^data:/, "").trim();

        if (message.toUpperCase() === "PROCESSING") {
          yield "refetch";
          break;
        }

        try {
          yield message;
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      }

      buffer = parts[parts.length - 1];
    }
  }
}
