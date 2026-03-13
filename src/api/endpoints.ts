import {
  EDGE_URL,
  EDGE_EXTERNAL_URL,
  AGENT_SERVICE_PATH,
  INTERACT_SERVICE_PATH,
} from "../constants";
import { SDKEndpoints } from "../types";

const agentBase = `${EDGE_URL}${AGENT_SERVICE_PATH}`;
const intractBase = `${EDGE_URL}${INTERACT_SERVICE_PATH}`;
const intractExternalBase = `${EDGE_EXTERNAL_URL}${INTERACT_SERVICE_PATH}`;

const endpoints: SDKEndpoints = {
  agents: {
    details: `${agentBase}/agents`,
    livekitToken: `${agentBase}/getToken`,
    updateArtifact: `${agentBase}/agents/artifact`,
    fetchArtifacts: `${agentBase}/agents/artifact`,
  },
  intract: {
    initiateConversation: `${intractBase}/api/v1/intract/conversation`,
    stopConversation: `${intractBase}/api/v1/intract/stop/conversation`,
    streamResponse: `${intractExternalBase}/api/v1/intract/data`,
    chatDetails: `${intractBase}/api/v1/intract/conversation`,
    chatHistoryList: `${intractBase}/api/v1/intract/conversation`,
  },
  chatFeedback: {
    submitFeedback: `${intractBase}/api/v1/feedback`,
  },
};

export default endpoints;
