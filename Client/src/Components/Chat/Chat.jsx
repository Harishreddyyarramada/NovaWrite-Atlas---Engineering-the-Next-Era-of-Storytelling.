import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import API, { API_BASE } from "../../Utils/api.js";
import ChatList from "./ChatList.jsx";
import ChatWindow from "./ChatWindow.jsx";
import "./Chat.css";

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typingByConversation, setTypingByConversation] = useState({});
  const refreshTimer = useRef(null);

  const currentUser = useMemo(
    () => ({
      _id: localStorage.getItem("userId") || "",
      username: localStorage.getItem("user") || "You",
      email: localStorage.getItem("email") || "",
      profileImage: localStorage.getItem("profilePic") || "",
    }),
    []
  );

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv._id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const loadUsers = useCallback(async () => {
    const response = await API.get("/users");
    setUsers(response.data || []);
  }, []);

  const loadConversations = useCallback(async () => {
    const response = await API.get("/chat/conversations");
    const incoming = response.data || [];
    setConversations(incoming);
    setSelectedConversationId((prev) => {
      if (!incoming.length) return "";
      if (prev && incoming.some((conversation) => conversation._id === prev)) return prev;
      return incoming[0]._id;
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([loadUsers(), loadConversations()]);
      } catch (apiError) {
        setError(
          apiError?.response?.data?.message ||
            "Unable to load live chat. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadConversations, loadUsers]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const clientSocket = io(API_BASE, {
      withCredentials: true,
      auth: { token },
    });

    setSocket(clientSocket);

    const scheduleConversationsRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        loadConversations().catch(() => null);
      }, 120);
    };

    clientSocket.on("presence:update", (payload) => {
      const { userId, status, lastSeenAt } = payload || {};
      if (!userId) return;

      setUsers((prev) =>
        prev.map((user) =>
          String(user._id) === String(userId)
            ? {
                ...user,
                status,
                isOnline: status === "online",
                lastSeenAt: status === "offline" ? lastSeenAt || user.lastSeenAt : user.lastSeenAt,
              }
            : user
        )
      );

      setConversations((prev) =>
        prev.map((conversation) => {
          if (!conversation.otherUser) return conversation;
          if (String(conversation.otherUser._id) !== String(userId)) return conversation;
          return {
            ...conversation,
            otherUser: {
              ...conversation.otherUser,
              isOnline: status === "online",
              lastSeenAt:
                status === "offline"
                  ? lastSeenAt || conversation.otherUser.lastSeenAt
                  : conversation.otherUser.lastSeenAt,
            },
          };
        })
      );
    });

    clientSocket.on("chat:conversation-updated", scheduleConversationsRefresh);

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      clientSocket.close();
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ conversationId, userId, username }) => {
      if (!conversationId || String(userId) === String(currentUser._id)) return;
      setTypingByConversation((prev) => ({
        ...prev,
        [conversationId]: username || "Typing...",
      }));
    };

    const handleStopTyping = ({ conversationId, userId }) => {
      if (!conversationId || String(userId) === String(currentUser._id)) return;
      setTypingByConversation((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    };

    socket.on("chat:typing", handleTyping);
    socket.on("chat:stop-typing", handleStopTyping);

    return () => {
      socket.off("chat:typing", handleTyping);
      socket.off("chat:stop-typing", handleStopTyping);
    };
  }, [currentUser._id, socket]);

  const handleStartChatWithUser = async (user) => {
    try {
      setError("");
      const response = await API.post("/chat/conversation", { userId: user._id });
      const conversation = response.data;
      setSelectedConversationId(conversation._id);
      await loadConversations();
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to start conversation.");
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversationId(conversation._id);
  };

  return (
    <section className="chat-page">
      <div className="chat-shell">
        <ChatList
          loading={loading}
          error={error}
          users={users}
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          typingByConversation={typingByConversation}
          onSelectConversation={handleSelectConversation}
          onStartChatWithUser={handleStartChatWithUser}
          currentUser={currentUser}
        />
        <ChatWindow
          socket={socket}
          currentUser={currentUser}
          conversation={selectedConversation}
          typingByConversation={typingByConversation}
          onRefreshConversations={loadConversations}
        />
      </div>
    </section>
  );
};

export default Chat;
