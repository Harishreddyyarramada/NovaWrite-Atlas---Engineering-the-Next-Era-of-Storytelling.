import React, { useMemo, useState } from "react";
import { formatLastSeen, formatTime, safeAvatar } from "./chatUtils.js";
import "./Chat.css";

const ChatList = ({
  loading,
  error,
  users,
  conversations,
  selectedConversationId,
  typingByConversation,
  onSelectConversation,
  onStartChatWithUser,
  currentUser,
}) => {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const lower = search.trim().toLowerCase();
    if (!lower) return users;
    return users.filter((user) =>
      `${user.username} ${user.email}`.toLowerCase().includes(lower)
    );
  }, [search, users]);

  const onlineCount = useMemo(
    () => users.filter((user) => user.isOnline || user.status === "online").length,
    [users]
  );

  const mappedConversations = useMemo(
    () =>
      conversations.map((conversation) => {
        const fallbackOther =
          conversation.otherUser ||
          conversation.participants?.find(
            (participant) => String(participant._id) !== String(currentUser._id)
          ) ||
          null;
        return { ...conversation, otherUser: fallbackOther };
      }),
    [conversations, currentUser._id]
  );

  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h2>Inbox</h2>
        <p>{onlineCount} users online now</p>
      </div>

      <div className="chat-search">
        <input
          type="search"
          placeholder="Search users"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading && <p className="chat-state">Loading chats...</p>}
      {!!error && <p className="chat-state chat-error">{error}</p>}

      <div className="chat-list-section">
        <h3>People</h3>
        {filteredUsers.length === 0 ? (
          <p className="chat-state">No users found.</p>
        ) : (
          filteredUsers.map((user) => (
            <button
              type="button"
              key={user._id}
              className="chat-row"
              onClick={() => onStartChatWithUser(user)}
            >
              <div className="chat-avatar-wrap">
                <img
                  src={safeAvatar(user.profileImage, user.username)}
                  alt={user.username}
                  className="chat-avatar"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = safeAvatar("", user.username);
                  }}
                />
                <span className={`status-dot status-${user.isOnline ? "online" : "offline"}`} />
              </div>
              <div className="chat-row-body">
                <p className="chat-row-title">{user.username}</p>
                <p className="chat-row-subtitle">
                  {user.isOnline ? "Online" : formatLastSeen(user.lastSeenAt)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="chat-list-section">
        <h3>Recent Chats</h3>
        {mappedConversations.length === 0 ? (
          <p className="chat-state">No conversations yet.</p>
        ) : (
          mappedConversations.map((conversation) => {
            const isTyping = Boolean(typingByConversation[conversation._id]);
            const subtitle = isTyping
              ? `${typingByConversation[conversation._id]} is typing...`
              : conversation.lastMessage?.text ||
                (conversation.lastMessage?.messageType === "image"
                  ? "Image"
                  : conversation.lastMessage?.messageType === "link"
                    ? "Link"
                    : "Start your first message");

            return (
              <button
                type="button"
                key={conversation._id}
                className={`chat-row ${
                  selectedConversationId === conversation._id ? "chat-row-active" : ""
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="chat-avatar-wrap">
                  <img
                    src={safeAvatar(
                      conversation.otherUser?.profileImage,
                      conversation.otherUser?.username
                    )}
                    alt={conversation.otherUser?.username || "User"}
                    className="chat-avatar"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = safeAvatar(
                        "",
                        conversation.otherUser?.username || "U"
                      );
                    }}
                  />
                  <span
                    className={`status-dot status-${
                      conversation.otherUser?.isOnline ? "online" : "offline"
                    }`}
                  />
                </div>
                <div className="chat-row-body">
                  <p className="chat-row-title">
                    {conversation.otherUser?.username || "Unknown User"}
                  </p>
                  <p className={`chat-row-subtitle ${isTyping ? "typing-text" : ""}`}>{subtitle}</p>
                </div>
                <span className="chat-time">{formatTime(conversation.lastMessageTime)}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default ChatList;
