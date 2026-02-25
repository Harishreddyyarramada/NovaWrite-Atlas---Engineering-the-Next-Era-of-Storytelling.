import Assests from "../../assets/Assests.js";

export const getUserInitial = (username) => {
  const first = String(username || "").trim().toUpperCase()[0];
  return /^[A-Z]$/.test(first) ? first : "A";
};

export const getFallbackAvatar = (username) => Assests[getUserInitial(username)] || Assests.A;

export const safeAvatar = (candidate, username) => {
  const invalid = !candidate || ["null", "undefined"].includes(String(candidate));
  if (invalid) return getFallbackAvatar(username);
  return candidate;
};

export const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatLastSeen = (value) => {
  if (!value) return "Last seen recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last seen recently";
  return `Last seen ${date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export const extractFirstUrl = (text) => {
  const match = String(text || "").match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : "";
};

export const getSenderId = (message) => {
  if (!message?.senderId) return "";
  return typeof message.senderId === "object" ? message.senderId?._id : message.senderId;
};
