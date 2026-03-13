import { actionMap, networkErrorMessage } from "../constants";

export const getErrorFromApi = (
  res: any,
  defaultMessage = "Something went wrong!",
): string => {
  if (typeof res === "string") {
    return res;
  }

  // Handle network errors
  if (
    (!res?.response && res?.message === "Network Error") ||
    res?.code === "ERR_NETWORK"
  ) {
    return networkErrorMessage;
  }

  if (res?.response) {
    const error =
      res?.response?.data?.message ||
      (res?.response?.data?.error &&
      typeof res?.response?.data?.error === "string"
        ? res?.response?.data?.error
        : "");
    if (error) return error;
  }

  if (res?.data) {
    const error = res?.data?.error?.message;
    if (error) return error;
  }

  return res?.message || defaultMessage;
};

export const checkValidStringifiedJSON = (value: any): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
};

export const getBrowserUseState = (
  actionObj: Record<string, any>,
): string => {
  if (!actionObj) return "Using";
  for (const key of Object.keys(actionObj)) {
    if (actionObj[key] !== null && actionMap[key]) {
      return actionMap[key];
    }
  }
  return "Using";
};

export const getCleanMarkdownString = (markdown: any): string => {
  if (!markdown) return "";
  return markdown?.replace?.(/\\[ntrfbv'\"\\0]/g, (match: any) => {
    switch (match) {
      case "\\n":
        return "  \n";
      case "\\t":
        return "  \t";
      case "\\r":
        return "  \r";
      case "\\f":
        return "  \f";
      case "\\b":
        return "  \b";
      case "\\v":
        return "  \v";
      case "\\'":
        return "'";
      case '\\"':
        return '"';
      case "\\\\":
        return "\\";
      case "\\0":
        return "\0";
      default:
        return match;
    }
  }) || "";
};
