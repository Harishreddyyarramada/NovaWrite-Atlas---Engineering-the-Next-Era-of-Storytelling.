import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiHeart, FiMessageCircle, FiSend } from "react-icons/fi";
import API from "../../Utils/api.js";
import PremiumLoader from "../Common/PremiumLoader.jsx";
import "./Posts.css";

const formatDate = (dateValue) =>
  new Date(dateValue).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const Posts = () => {
  const email = localStorage.getItem("email");
  const [posts, setPosts] = useState([]);
  const [interactions, setInteractions] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingTo, setReplyingTo] = useState({});
  const [submittingTarget, setSubmittingTarget] = useState("");
  const [actionLoadingPostId, setActionLoadingPostId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const interactionPath = (postId) => `/posts/interactions/user/${postId}`;

  const loadInteractions = async (postItems = []) => {
    if (postItems.length === 0) {
      setInteractions({});
      return;
    }

    const responses = await Promise.all(
      postItems.map(async (item) => {
        try {
          const response = await API.get(interactionPath(item._id || item.id));
          return [String(item._id || item.id), response.data];
        } catch (_error) {
          return [
            String(item._id || item.id),
            {
              likesCount: 0,
              likedByCurrentUser: false,
              shareCount: 0,
              commentsCount: 0,
              comments: [],
            },
          ];
        }
      })
    );

    setInteractions(Object.fromEntries(responses));
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await API.get(
        `/posts/posts?email=${email || ""}`
      );
      const postResults = response.data?.results || [];
      setPosts(postResults);
      await loadInteractions(postResults);
    } catch (err) {
      setError(err?.response?.data?.msg || "Unable to fetch posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const commentsCountLabel = useMemo(
    () =>
      Object.fromEntries(
        posts.map((post) => {
          const postId = String(post._id || post.id);
          const count = interactions[postId]?.commentsCount || 0;
          return [postId, count];
        })
      ),
    [posts, interactions]
  );

  const updatePostInteraction = (postId, payload) => {
    const key = String(postId);
    setInteractions((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        ...payload,
      },
    }));
  };

  const handleLike = async (postId) => {
    try {
      setActionLoadingPostId(String(postId));
      setActionError("");
      const response = await API.post(`${interactionPath(postId)}/like`);
      updatePostInteraction(postId, {
        likesCount: response.data?.likesCount || 0,
        likedByCurrentUser: Boolean(response.data?.likedByCurrentUser),
      });
    } catch (_error) {
      setActionError("Unable to update like. Please try again.");
    } finally {
      setActionLoadingPostId("");
    }
  };

  const handleShare = async (postId, title) => {
    const sharePayload = {
      title: title || "Blog Article",
      text: "Read this post",
      url: `${window.location.origin}/posts/${postId}`,
    };
    try {
      setActionLoadingPostId(String(postId));
      setActionError("");
      if (navigator.share) {
        await navigator.share(sharePayload);
      } else {
        await navigator.clipboard.writeText(sharePayload.url);
      }

      const response = await API.post(`${interactionPath(postId)}/share`);
      updatePostInteraction(postId, {
        shareCount: response.data?.shareCount || 0,
      });
    } catch (_error) {
      setActionError("Unable to complete share action.");
    } finally {
      setActionLoadingPostId("");
    }
  };

  const submitComment = async (event, postId, parentCommentId = null) => {
    event.preventDefault();
    const postKey = String(postId);
    const draftKey = `${postKey}:${parentCommentId || "root"}`;
    const text = parentCommentId ? replyDrafts[draftKey] : commentDrafts[postKey];
    const sanitizedText = String(text || "").trim();
    if (!sanitizedText) return;

    try {
      setSubmittingTarget(draftKey);
      setActionError("");
      const response = await API.post(`${interactionPath(postId)}/comments`, {
        text: sanitizedText,
        parentCommentId,
      });

      updatePostInteraction(postId, {
        commentsCount: response.data?.commentsCount || 0,
        comments: response.data?.comments || [],
      });

      if (parentCommentId) {
        setReplyDrafts((prev) => ({ ...prev, [draftKey]: "" }));
        setReplyingTo((prev) => ({ ...prev, [draftKey]: false }));
      } else {
        setCommentDrafts((prev) => ({ ...prev, [postKey]: "" }));
      }
    } catch (_error) {
      setActionError("Unable to post comment. Please try again.");
    } finally {
      setSubmittingTarget("");
    }
  };

  if (loading) {
    return (
      <section className="page-shell my-posts-page">
        <PremiumLoader label="Loading your posts..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-shell my-posts-page">
        <p className="posts-state posts-error">{error}</p>
      </section>
    );
  }

  return (
    <section className="page-shell my-posts-page">
      <div className="posts-head">
        <h2>Your Published Articles</h2>
        <span>{posts.length} posts</span>
      </div>
      {!!actionError && <p className="posts-state posts-error">{actionError}</p>}

      {posts.length === 0 ? (
        <p className="posts-state">No posts yet. Create your first article.</p>
      ) : (
        <div className="posts-grid">
          {posts.map((blog) => (
            <article className="post-card elevated-card" key={blog._id || blog.id}>
              <img src={blog.image_url} alt={blog.title || "Article cover"} />
              <div className="post-card-body">
                {(() => {
                  const postId = String(blog._id || blog.id);
                  const postInteraction = interactions[postId] || {};
                  const isOpen = Boolean(openComments[postId]);

                  return (
                    <>
                <h3>{blog.title || "Untitled"}</h3>
                <span className="post-mini-meta">{blog.category || "General"}</span>
                <p>
                  {blog.description
                    ? blog.description.length > 130
                      ? `${blog.description.slice(0, 130)}...`
                      : blog.description
                    : "No description provided."}
                </p>
                {(blog.seoTags || []).length > 0 && (
                  <div className="post-mini-tags">
                    {(blog.seoTags || []).slice(0, 3).map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="post-engagement-row">
                  <button
                    type="button"
                    className={postInteraction.likedByCurrentUser ? "is-liked" : ""}
                    disabled={actionLoadingPostId === postId}
                    onClick={() => handleLike(postId)}
                  >
                    <FiHeart /> Like ({postInteraction.likesCount || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }))
                    }
                  >
                    <FiMessageCircle /> Comment ({commentsCountLabel[postId] || 0})
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingPostId === postId}
                    onClick={() => handleShare(postId, blog.title)}
                  >
                    <FiSend /> Share ({postInteraction.shareCount || 0})
                  </button>
                </div>

                {isOpen && (
                  <div className="post-comments-panel">
                    <form
                      className="post-comment-compose"
                      onSubmit={(event) => submitComment(event, postId)}
                    >
                      <textarea
                        value={commentDrafts[postId] || ""}
                        onChange={(event) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [postId]: event.target.value,
                          }))
                        }
                        placeholder="Write a comment..."
                        maxLength={1500}
                      />
                      <button type="submit" disabled={submittingTarget === `${postId}:root`}>
                        {submittingTarget === `${postId}:root` ? "Posting..." : "Post Comment"}
                      </button>
                    </form>

                    {(postInteraction.comments || []).length === 0 ? (
                      <p className="post-comments-empty">No comments yet.</p>
                    ) : (
                      <div className="post-thread-list">
                        {(postInteraction.comments || []).map((comment) => {
                          const replyKey = `${postId}:${comment._id}`;
                          return (
                            <article key={comment._id} className="post-thread-item">
                              <div className="post-thread-head">
                                <strong>{comment.username}</strong>
                                <span>{formatDate(comment.createdAt)}</span>
                              </div>
                              <p>{comment.text}</p>
                              <button
                                type="button"
                                className="post-reply-toggle"
                                onClick={() =>
                                  setReplyingTo((prev) => ({
                                    ...prev,
                                    [replyKey]: !prev[replyKey],
                                  }))
                                }
                              >
                                Reply
                              </button>

                              {replyingTo[replyKey] && (
                                <form
                                  className="post-comment-compose post-reply-compose"
                                  onSubmit={(event) => submitComment(event, postId, comment._id)}
                                >
                                  <textarea
                                    value={replyDrafts[replyKey] || ""}
                                    onChange={(event) =>
                                      setReplyDrafts((prev) => ({
                                        ...prev,
                                        [replyKey]: event.target.value,
                                      }))
                                    }
                                    placeholder={`Reply to ${comment.username}...`}
                                    maxLength={1500}
                                  />
                                  <button
                                    type="submit"
                                    disabled={submittingTarget === replyKey}
                                  >
                                    {submittingTarget === replyKey ? "Posting..." : "Post Reply"}
                                  </button>
                                </form>
                              )}

                              {(comment.replies || []).length > 0 && (
                                <div className="post-replies-list">
                                  {(comment.replies || []).map((reply) => (
                                    <div key={reply._id} className="post-reply-item">
                                      <div className="post-thread-head">
                                        <strong>{reply.username}</strong>
                                        <span>{formatDate(reply.createdAt)}</span>
                                      </div>
                                      <p>{reply.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <Link to={`/posts/${blog._id || blog.id}`}>Read More</Link>
                    </>
                  );
                })()}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default Posts;
