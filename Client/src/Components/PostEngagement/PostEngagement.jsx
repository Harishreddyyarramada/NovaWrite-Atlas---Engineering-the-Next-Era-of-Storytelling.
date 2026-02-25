import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiHeart, FiMessageCircle, FiSend } from "react-icons/fi";
import { io } from "socket.io-client";
import API from "../../Utils/api.js";
import { API_BASE } from "../../Utils/api.js";
import "./PostEngagement.css";

const formatDate = (dateValue) =>
  new Date(dateValue).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const CommentComposer = ({
  value,
  onChange,
  onSubmit,
  submitting,
  buttonText,
  placeholder,
}) => (
  <form className="comment-compose" onSubmit={onSubmit}>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={1500}
      required
    />
    <div className="comment-compose-foot">
      <span>{value.trim().length}/1500</span>
      <button type="submit" disabled={submitting || !value.trim()}>
        {submitting ? "Posting..." : buttonText}
      </button>
    </div>
  </form>
);

const PostEngagement = ({ postType, postId, postTitle }) => {
  const commentsSectionRef = useRef(null);
  const [interaction, setInteraction] = useState({
    likesCount: 0,
    likedByCurrentUser: false,
    shareCount: 0,
    commentsCount: 0,
    comments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingTo, setReplyingTo] = useState({});
  const [submittingReplyTo, setSubmittingReplyTo] = useState("");
  const [readersCount, setReadersCount] = useState(0);

  const interactionPath = useMemo(
    () => `/posts/interactions/${postType}/${postId}`,
    [postType, postId]
  );

  const loadInteraction = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get(interactionPath);
      setInteraction(response.data);
    } catch (apiError) {
      setError(apiError?.response?.data?.msg || "Unable to load engagement details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!postId || !postType) return;
    loadInteraction();
  }, [postId, postType]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !postId || !postType) return;

    const socket = io(API_BASE, { withCredentials: true, auth: { token } });
    socket.emit("post:join", { postType, postId });

    const onReaders = (payload) => {
      if (payload?.postType === postType && String(payload?.postId) === String(postId)) {
        setReadersCount(payload.readers || 0);
      }
    };

    const onEngagement = (payload) => {
      if (payload?.postType === postType && String(payload?.postId) === String(postId)) {
        setInteraction((prev) => ({
          ...prev,
          likesCount: payload.likesCount ?? prev.likesCount,
          shareCount: payload.shareCount ?? prev.shareCount,
          commentsCount: payload.commentsCount ?? prev.commentsCount,
        }));
      }
    };

    socket.on("post:readers-count", onReaders);
    socket.on("post:engagement-updated", onEngagement);

    return () => {
      socket.emit("post:leave", { postType, postId });
      socket.off("post:readers-count", onReaders);
      socket.off("post:engagement-updated", onEngagement);
      socket.close();
    };
  }, [postId, postType]);

  const handleLike = async () => {
    try {
      setActionError("");
      const response = await API.post(`${interactionPath}/like`);
      setInteraction((prev) => ({
        ...prev,
        likesCount: response.data.likesCount,
        likedByCurrentUser: response.data.likedByCurrentUser,
      }));
    } catch (apiError) {
      setActionError(apiError?.response?.data?.msg || "Unable to update like.");
    }
  };

  const handleShare = async () => {
    const sharePayload = {
      title: postTitle || "Blog Article",
      text: "Read this post",
      url: window.location.href,
    };

    try {
      setActionError("");
      if (navigator.share) {
        await navigator.share(sharePayload);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }

      const response = await API.post(`${interactionPath}/share`);
      setInteraction((prev) => ({ ...prev, shareCount: response.data.shareCount }));
    } catch (apiError) {
      const fallbackMessage =
        apiError?.name === "AbortError"
          ? ""
          : apiError?.response?.data?.msg || "Unable to complete share. Try again.";
      setActionError(fallbackMessage);
    }
  };

  const submitComment = async (event, parentCommentId = null) => {
    event.preventDefault();

    const draftText = parentCommentId ? replyDrafts[parentCommentId] : commentText;
    const sanitizedText = String(draftText || "").trim();
    if (!sanitizedText) return;

    try {
      setActionError("");
      if (parentCommentId) {
        setSubmittingReplyTo(parentCommentId);
      } else {
        setSubmittingComment(true);
      }

      const response = await API.post(`${interactionPath}/comments`, {
        text: sanitizedText,
        parentCommentId,
      });

      setInteraction((prev) => ({
        ...prev,
        commentsCount: response.data.commentsCount,
        comments: response.data.comments,
      }));

      if (parentCommentId) {
        setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: "" }));
        setReplyingTo((prev) => ({ ...prev, [parentCommentId]: false }));
      } else {
        setCommentText("");
      }
    } catch (apiError) {
      setActionError(apiError?.response?.data?.msg || "Unable to add comment.");
    } finally {
      setSubmittingComment(false);
      setSubmittingReplyTo("");
    }
  };

  const focusComments = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <section className="engagement-shell">
        <p className="comment-state">Loading reactions and comments...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="engagement-shell">
        <p className="comment-state comment-error">{error}</p>
      </section>
    );
  }

  return (
    <section className="engagement-shell elevated-card">
      <div className="engagement-actions">
        <button
          type="button"
          onClick={handleLike}
          className={interaction.likedByCurrentUser ? "active" : ""}
        >
          <FiHeart /> Like ({interaction.likesCount})
        </button>
        <button type="button" onClick={focusComments}>
          <FiMessageCircle /> Comment ({interaction.commentsCount})
        </button>
        <button type="button" onClick={handleShare}>
          <FiSend /> Share ({interaction.shareCount})
        </button>
      </div>

      <p className="live-readers">Currently {readersCount} users reading this post</p>

      {!!actionError && <p className="comment-state comment-error">{actionError}</p>}

      <div ref={commentsSectionRef} className="comments-layout">
        <h3>Discussion</h3>

        <CommentComposer
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          onSubmit={(event) => submitComment(event)}
          submitting={submittingComment}
          buttonText="Post Comment"
          placeholder="Write a public comment..."
        />

        {interaction.comments.length === 0 ? (
          <p className="comment-state">Be the first to comment on this post.</p>
        ) : (
          <div className="comment-thread-list">
            {interaction.comments.map((comment) => (
              <article key={comment._id} className="comment-thread">
                <div className="comment-item">
                  <div className="comment-avatar">
                    {(comment.username || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="comment-body">
                    <header>
                      <strong>{comment.username}</strong>
                      <time>{formatDate(comment.createdAt)}</time>
                    </header>
                    <p>{comment.text}</p>
                    <button
                      type="button"
                      className="reply-toggle"
                      onClick={() =>
                        setReplyingTo((prev) => ({
                          ...prev,
                          [comment._id]: !prev[comment._id],
                        }))
                      }
                    >
                      Reply
                    </button>
                  </div>
                </div>

                {replyingTo[comment._id] && (
                  <div className="reply-compose-wrap">
                    <CommentComposer
                      value={replyDrafts[comment._id] || ""}
                      onChange={(event) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [comment._id]: event.target.value,
                        }))
                      }
                      onSubmit={(event) => submitComment(event, comment._id)}
                      submitting={submittingReplyTo === comment._id}
                      buttonText="Post Reply"
                      placeholder={`Reply to ${comment.username}...`}
                    />
                  </div>
                )}

                {comment.replies?.length > 0 && (
                  <div className="comment-replies">
                    {comment.replies.map((reply) => (
                      <div key={reply._id} className="comment-item">
                        <div className="comment-avatar reply-avatar">
                          {(reply.username || "U").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="comment-body">
                          <header>
                            <strong>{reply.username}</strong>
                            <time>{formatDate(reply.createdAt)}</time>
                          </header>
                          <p>{reply.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PostEngagement;
