import React, { useEffect, useRef, useState } from "react";
import API from "../../Utils/api.js";
import {
  extractFirstUrl,
  formatLastSeen,
  formatTime,
  getSenderId,
  safeAvatar,
} from "./chatUtils.js";
import "./Chat.css";

const mergeMessage = (messages, incoming) => {
  if (!incoming?._id) return messages;
  const exists = messages.some((message) => String(message._id) === String(incoming._id));
  if (exists) return messages;
  return [...messages, incoming];
};

const ChatWindow = ({
  socket,
  currentUser,
  conversation,
  typingByConversation,
  onRefreshConversations,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const conversationId = conversation?._id || "";
  const otherUser = conversation?.otherUser || null;
  const canSend = Boolean(conversationId && otherUser);
  const isTyping = Boolean(typingByConversation[conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setError("");
      return;
    }

    const loadMessages = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await API.get(`/chat/messages/${conversationId}`);
        setMessages(response.data || []);
        await API.patch(`/chat/messages/${conversationId}/read`);
      } catch (apiError) {
        setError(apiError?.response?.data?.message || "Failed to load messages.");
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit("conversation:join", conversationId);
    return () => {
      socket.emit("conversation:leave", conversationId);
    };
  }, [conversationId, socket]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (incoming) => {
      if (String(incoming?.conversationId) !== String(conversationId)) return;
      setMessages((prev) => mergeMessage(prev, incoming));
    };

    socket.on("chat:new-message", onMessage);
    return () => socket.off("chat:new-message", onMessage);
  }, [conversationId, socket]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, imagePreview]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const emitTyping = () => {
    if (!socket || !conversationId) return;

    socket.emit("chat:typing", {
      conversationId,
      userId: currentUser._id,
      username: currentUser.username,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("chat:stop-typing", { conversationId, userId: currentUser._id });
    }, 1100);
  };

  const uploadImage = async () => {
    if (!imageFile) return { mediaUrl: null, mediaPublicId: null };
    const formData = new FormData();
    formData.append("image", imageFile);
    setIsUploading(true);
    try {
      const response = await API.post("/chat/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!canSend || sending || isUploading) return;

    const text = inputText.trim();
    if (!text && !imageFile) return;

    try {
      setSending(true);
      setError("");

      const payload = { conversationId, text };
      const linkUrl = extractFirstUrl(text);

      if (imageFile) {
        const uploadPayload = await uploadImage();
        payload.messageType = "image";
        payload.mediaUrl = uploadPayload.mediaUrl;
        payload.mediaPublicId = uploadPayload.mediaPublicId;
      } else if (linkUrl) {
        payload.messageType = "link";
        payload.linkUrl = linkUrl;
      } else {
        payload.messageType = "text";
      }

      const response = await API.post("/chat/messages", payload);
      setMessages((prev) => mergeMessage(prev, response.data));
      setInputText("");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      socket?.emit("chat:stop-typing", { conversationId, userId: currentUser._id });
      await onRefreshConversations?.();
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  if (!conversation) {
    return (
      <section className="chat-window chat-window-empty">
        <p>Select any online user to start real-time chat.</p>
      </section>
    );
  }

  return (
    <section className="chat-window">
      <header className="chat-window-header">
        <div className="chat-avatar-wrap">
          <img
            src={safeAvatar(otherUser?.profileImage, otherUser?.username)}
            alt={otherUser?.username || "Chat user"}
            className="chat-avatar"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = safeAvatar("", otherUser?.username || "U");
            }}
          />
          <span className={`status-dot status-${otherUser?.isOnline ? "online" : "offline"}`} />
        </div>
        <div>
          <h3>{otherUser?.username || "Conversation"}</h3>
          <p>
            {otherUser?.isOnline
              ? "Online"
              : formatLastSeen(otherUser?.lastSeenAt || otherUser?.lastLoginAt)}
          </p>
        </div>
      </header>

      <main className="chat-messages">
        {loading && <p className="chat-state">Loading messages...</p>}
        {!!error && <p className="chat-state chat-error">{error}</p>}

        {!loading &&
          messages.map((message) => {
            const senderId = getSenderId(message);
            const sentByMe = String(senderId) === String(currentUser._id);

            return (
              <article
                key={message._id}
                className={`chat-bubble-wrap ${sentByMe ? "is-me" : ""}`}
              >
                <div className={`chat-bubble ${sentByMe ? "bubble-me" : "bubble-them"}`}>
                  {message.messageType === "image" && message.mediaUrl && (
                    <img src={message.mediaUrl} alt="Shared" className="chat-image" />
                  )}

                  {message.messageType === "link" && message.linkUrl && (
                    <a
                      href={message.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`chat-link ${sentByMe ? "chat-link-me" : ""}`}
                    >
                      {message.linkUrl}
                    </a>
                  )}

                  {!!message.text && <p>{message.text}</p>}
                  <span>{formatTime(message.createdAt)}</span>
                </div>
              </article>
            );
          })}

        {isTyping && <p className="typing-indicator">{typingByConversation[conversationId]} is typing...</p>}
        <div ref={messageEndRef} />
      </main>

      {imagePreview && (
        <div className="chat-image-preview-wrap">
          <img src={imagePreview} alt="Preview" className="chat-image-preview" />
          <button type="button" onClick={() => setImageFile(null)}>
            Remove
          </button>
        </div>
      )}

      <form className="chat-input-bar" onSubmit={handleSendMessage}>
        <label className="chat-file-btn" title="Send image">
          +
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            disabled={!canSend || sending || isUploading}
          />
        </label>
        <input
          type="text"
          placeholder="Type message or paste link..."
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          onInput={emitTyping}
          disabled={!canSend || sending || isUploading}
        />
        <button
          type="submit"
          disabled={(!inputText.trim() && !imageFile) || !canSend || sending || isUploading}
        >
          {isUploading ? "Uploading..." : sending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
};

export default ChatWindow;
