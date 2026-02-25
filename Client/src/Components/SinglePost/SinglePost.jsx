import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import API from "../../Utils/api.js";
import PostEngagement from "../PostEngagement/PostEngagement.jsx";
import PremiumLoader from "../Common/PremiumLoader.jsx";
import "./SinglePost.css";

const SinglePost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/posts/posts/${id}`);
        setPost(response.data);
      } catch (apiError) {
        setError(apiError?.response?.data?.msg || "Unable to load article.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    API.post(`/posts/view/user/${id}`).catch(() => null);
    const history = JSON.parse(localStorage.getItem("post-view-history") || "[]");
    const withoutCurrent = Array.isArray(history)
      ? history.filter((entry) => String(entry.id) !== String(id))
      : [];
    const updated = [{ id, viewedAt: Date.now() }, ...withoutCurrent].slice(0, 30);
    localStorage.setItem("post-view-history", JSON.stringify(updated));
  }, [id]);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const response = await API.get("/users/bookmarks");
        const bookmarked = (response.data?.results || []).some(
          (item) => String(item._id) === String(id)
        );
        setSaved(bookmarked);
      } catch (_error) {
        setSaved(false);
      }
    };
    if (id) loadSavedState();
  }, [id]);

  useEffect(() => {
    const onScroll = () => {
      const winScroll = window.scrollY;
      const fullHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = fullHeight > 0 ? Math.min((winScroll / fullHeight) * 100, 100) : 0;
      setReadingProgress(progress);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const articleDate = useMemo(
    () =>
      new Date(post?.createdAt || Date.now()).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [post?.createdAt]
  );

  if (loading) {
    return (
      <section className="article-loading">
        <PremiumLoader label="Loading article..." />
      </section>
    );
  }

  if (error || !post) {
    return <p className="article-error">{error || "Post not found."}</p>;
  }

  const toggleSavePost = async () => {
    try {
      setSavingBookmark(true);
      const response = await API.post(`/users/bookmarks/${id}`);
      setSaved(Boolean(response.data?.saved));
    } catch (_error) {
      // keep quiet, primary reading flow should not break
    } finally {
      setSavingBookmark(false);
    }
  };

  return (
    <article className="article-view">
      <div className="reading-progress-wrap">
        <i style={{ width: `${readingProgress}%` }} />
      </div>
      <header className="article-hero" style={{ backgroundImage: `url(${post.image_url})` }}>
        <div className="article-overlay">
          <span className="pill-badge pill-warm">Published Story</span>
          <h1>{post.title}</h1>
          <p>By {post.author || post.email} | {articleDate}</p>
          <p>Category: {post.category || "General"}</p>
        </div>
      </header>

      <main className="article-content-wrap">
        <Link to="/home/posts" className="article-back-link">
          <FiArrowLeft /> Back to Articles
        </Link>
        <button
          type="button"
          className="article-save-btn"
          onClick={toggleSavePost}
          disabled={savingBookmark}
        >
          {savingBookmark ? "Saving..." : saved ? "Saved" : "Save Post"}
        </button>

        <section className="article-content elevated-card">
          {(post.description || "No content available.")
            .split("\n")
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}

          {(post.seoTags || []).length > 0 && (
            <div className="article-tags">
              {(post.seoTags || []).map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
        </section>

        <PostEngagement postType="user" postId={id} postTitle={post.title} />
      </main>
    </article>
  );
};

export default SinglePost;
