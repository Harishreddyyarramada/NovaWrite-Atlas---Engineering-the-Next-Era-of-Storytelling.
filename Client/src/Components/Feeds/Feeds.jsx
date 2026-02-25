import React, { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { FaLeaf } from "react-icons/fa";
import { FiArrowLeft } from "react-icons/fi";
import BlogCards from "../BlogCards/BlogCards.jsx";
import PostEngagement from "../PostEngagement/PostEngagement.jsx";
import "../SinglePost/SinglePost.css";
import "./Feeds.css";

const Feeds = () => {
  const { id } = useParams();

  const post = useMemo(() => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    return BlogCards.find((item) => Number(item.id) === numericId) || null;
  }, [id]);

  if (!post) {
    return <p className="article-error">Featured story not found.</p>;
  }

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("featured-view-history") || "[]");
    const withoutCurrent = Array.isArray(history)
      ? history.filter((entry) => Number(entry.id) !== Number(post.id))
      : [];
    const updated = [{ id: post.id, viewedAt: Date.now() }, ...withoutCurrent].slice(0, 20);
    localStorage.setItem("featured-view-history", JSON.stringify(updated));
  }, [post.id]);

  return (
    <article className="article-view">
      <header className="article-hero featured-hero" style={{ backgroundImage: `url(${post.image})` }}>
        <div className="article-overlay">
          <span className="pill-badge pill-brand">Featured Pick</span>
          <h1>{post.title}</h1>
          <p>By Editorial Team • {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      <main className="article-content-wrap">
        <Link to="/home" className="article-back-link">
          <FiArrowLeft /> Back to Featured
        </Link>

        <section className="article-content elevated-card">
          {post.text.split("\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </section>

        <PostEngagement postType="featured" postId={String(post.id)} postTitle={post.title} />
      </main>

      <div className="featured-badge">
        <FaLeaf />
        <span>Curated Story</span>
      </div>
    </article>
  );
};

export default Feeds;
