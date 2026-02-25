import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../Utils/api.js";
import PremiumLoader from "../Common/PremiumLoader.jsx";
import "../Posts/Posts.css";

const SavedPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSaved = async () => {
      try {
        setLoading(true);
        const response = await API.get("/users/bookmarks");
        setPosts(response.data?.results || []);
      } catch (apiError) {
        setError(apiError?.response?.data?.message || "Unable to load saved posts.");
      } finally {
        setLoading(false);
      }
    };

    loadSaved();
  }, []);

  if (loading) {
    return (
      <section className="page-shell my-posts-page">
        <PremiumLoader label="Loading saved posts..." />
      </section>
    );
  }

  return (
    <section className="page-shell my-posts-page">
      <div className="posts-head">
        <h2>Saved Articles</h2>
        <span>{posts.length} saved</span>
      </div>

      {!!error && <p className="posts-state posts-error">{error}</p>}

      {!error && posts.length === 0 && (
        <p className="posts-state">No saved posts yet.</p>
      )}

      {!error && posts.length > 0 && (
        <div className="posts-grid">
          {posts.map((post) => (
            <article className="post-card elevated-card" key={post._id}>
              <img src={post.image_url} alt={post.title || "Article"} />
              <div className="post-card-body">
                <h3>{post.title}</h3>
                <span className="post-mini-meta">{post.category || "General"}</span>
                <p>
                  {(post.description || "").length > 130
                    ? `${post.description.slice(0, 130)}...`
                    : post.description}
                </p>
                <Link to={`/posts/${post._id}`}>Read More</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default SavedPosts;
