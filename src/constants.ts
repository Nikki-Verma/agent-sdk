// ─── HTTP Header Constants ────────────────────────────────────────────────────

export const X_USER_ID = "X-USER-ID";
export const X_SELLER_ID = "X-SELLER-ID";
export const X_CLIENT_ID = "X-CLIENT-ID";
export const X_SELLER_PROFILE_ID = "X-SELLER-PROFILE-ID";
export const X_PROJECT_ID = "X-PROJECT-ID";
export const X_TENANT_ID = "X-TENANT-ID";
export const X_DEVICE_ID = "X-DEVICE-ID";
export const PIM_SID = "PIM-SID";

// ─── Default Device ID ───────────────────────────────────────────────────────

export const DEFAULT_DEVICE_ID = "simplai";

// ─── Hardcoded Production URLs ────────────────────────────────────────────────

export const EDGE_URL = "https://edge-service.simplai.ai";
export const EDGE_EXTERNAL_URL = "https://edge-external.simplai.ai";
export const AGENT_SOCKET_ENDPOINT = "wss://lk.simplai.ai";

// Service path segments (appended to EDGE_URL)
export const AGENT_SERVICE_PATH = "/agent";
export const INTERACT_SERVICE_PATH = "/interact";

// ─── RNNoise Audio Processing URLs ────────────────────────────────────────────

export const RNNOISE_BASE =
  "https://unpkg.com/@sapphi-red/web-noise-suppressor@0.3.5/dist";
export const WORKLET_URL = `${RNNOISE_BASE}/rnnoise/workletProcessor.js`;
export const WASM_URL = `${RNNOISE_BASE}/rnnoise.wasm`;
export const SIMD_WASM = `${RNNOISE_BASE}/rnnoise_simd.wasm`;

// ─── Browser Agent Action Map ─────────────────────────────────────────────────

export const actionMap: Record<string, string> = {
  done: "Finishing",
  search_google: "Searching",
  go_to_url: "Navigating",
  go_back: "Returning",
  wait: "Waiting",
  click_element: "Clicking",
  input_text: "Typing",
  switch_tab: "Switching Tabs",
  open_tab: "Opening Tab",
  extract_content: "Extracting",
  scroll_down: "Scrolling Down",
  scroll_up: "Scrolling Up",
  send_keys: "Sending Keys",
  scroll_to_text: "Scrolling to Text",
  get_dropdown_options: "Retrieving Options",
  select_dropdown_option: "Selecting",
};

// ─── Error Messages ───────────────────────────────────────────────────────────

export const networkErrorMessage =
  "Network connectivity issue detected. Please check your connection and try again.";
