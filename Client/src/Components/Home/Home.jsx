import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import API from "../../Utils/api.js";
import Navbar from "../Navbar/Navbar.jsx";
import Footer from "../Footer/Footer.jsx";
import PremiumLoader from "../Common/PremiumLoader.jsx";
import "./Home.css";

const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

const Home = () => {
  const location = useLocation();
  const username = localStorage.getItem("user") || "Creator";
  const totalUsers = localStorage.getItem("total-users") || "0";
  const [search, setSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [category, setCategory] = useState("");
  const [liveTime, setLiveTime] = useState(new Date());
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loadingFeatured, setLoadingFeatured] = useState(false);

  const lowerPath = location.pathname.toLowerCase();
  const isPostsView = lowerPath.startsWith("/home/") && lowerPath !== "/home";

  const recommendedBlogs = useMemo(() => {
    const history = JSON.parse(localStorage.getItem("post-view-history") || "[]");
    if (!Array.isArray(history) || history.length === 0) return [];

    const viewedIds = history.map((item) => String(item.id));
    const viewedPosts = featuredPosts.filter((post) => viewedIds.includes(String(post._id)));
    const unseenPosts = featuredPosts.filter((post) => !viewedIds.includes(String(post._id)));

    if (viewedPosts.length === 0) return featuredPosts.slice(0, 3);
    const profileWords = new Map();
    viewedPosts.forEach((post) => {
      tokenize(`${post.title} ${post.description}`).forEach((word) => {
        profileWords.set(word, (profileWords.get(word) || 0) + 1);
      });
    });

    const scored = unseenPosts.map((post) => {
      const words = tokenize(`${post.title} ${post.description} ${(post.seoTags || []).join(" ")}`);
      const overlapScore = words.reduce((score, word) => score + (profileWords.get(word) || 0), 0);
      return { ...post, overlapScore };
    });

    return scored.sort((a, b) => b.overlapScore - a.overlapScore).slice(0, 3);
  }, [featuredPosts]);

  const loadFeaturedPosts = async (pageNumber = 1) => {
    try {
      setLoadingFeatured(true);
      const response = await API.get("/upload/blogs", {
        params: {
          page: pageNumber,
          limit: 8,
          q: search.trim(),
          tag: tagSearch.trim().replace("#", ""),
          category,
        },
      });
      setFeaturedPosts(response.data?.results || []);
      setPagination(response.data?.pagination || pagination);
    } catch (_error) {
      setFeaturedPosts([]);
    } finally {
      setLoadingFeatured(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadFeaturedPosts(1);
  }, [search, tagSearch, category]);

  return (
    <>
      <Navbar />

      {!isPostsView && (
        <main className="home-page">
          <section className="page-shell hero-panel elevated-card">
            <div className="hero-copy">
              <span className="pill-badge pill-brand">NovaWrite Atlas</span>
              <h1>Welcome back, {username}. Build your next breakthrough story.</h1>
              <p>
                AI-powered writing, SEO optimization, and live audience engagement
                in one premium creator workspace.
              </p>
              <div className="hero-stats">
                <article>
                  <strong>{pagination.total || 0}</strong>
                  <span>Featured Reads</span>
                </article>
                <article>
                  <strong>{totalUsers}</strong>
                  <span>Community Members</span>
                </article>
                <article>
                  <strong>
                    {liveTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </strong>
                  <span>Live Now</span>
                </article>
              </div>
            </div>
          </section>

          <section className="page-shell discover-strip elevated-card">
            <div>
              <h2>Discover Stories</h2>
              <p>Search titles and content instantly.</p>
            </div>
            <input
              type="search"
              value={search}
              placeholder="Search posts, title, content..."
              onChange={(event) => setSearch(event.target.value)}
            />
            <input
              type="search"
              value={tagSearch}
              placeholder="Search by #tag"
              onChange={(event) => setTagSearch(event.target.value)}
            />
            <input
              type="search"
              value={category}
              placeholder="Filter by category"
              onChange={(event) => setCategory(event.target.value)}
            />
          </section>

          <section className="page-shell feed-layout-shell">
            <aside className="feed-side-left elevated-card">
              <h3>Explore</h3>
              <button type="button" onClick={() => setCategory("")}>All Categories</button>
              <button type="button" onClick={() => setCategory("Technology")}>Technology</button>
              <button type="button" onClick={() => setCategory("AI")}>AI</button>
              <button type="button" onClick={() => setCategory("Science")}>Science</button>
              <button type="button" onClick={() => setCategory("Medical")}>Medical</button>
              <button type="button" onClick={() => setCategory("Data Science")}>Data Science</button>
              <Link to="/myprofile">Profile Settings</Link>
              <Link to="/myprofile/analytics">Analytics Dashboard</Link>
            </aside>

            <div className="feed-center">
            {recommendedBlogs.length > 0 && (
              <div className="recommended-wrap elevated-card">
                <div className="recommended-head">
                  <h2>Recommended for You</h2>
                  <p>Based on your reading history and keyword similarity</p>
                </div>
                <div className="recommended-grid">
                  {recommendedBlogs.map((blog) => (
                    <article className="recommended-card" key={`rec-${blog._id}`}>
                      <img src={blog.image_url} alt={blog.title} />
                      <div>
                        <h3>{blog.title}</h3>
                        <Link to={`/posts/${blog._id}`}>Open Recommendation</Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="featured-grid">
              {loadingFeatured && <PremiumLoader label="Loading featured stories..." />}

              {!loadingFeatured && featuredPosts.length === 0 && (
                <p className="featured-state">No posts found for your filters.</p>
              )}

              {!loadingFeatured &&
                featuredPosts.map((blog) => (
                <article className="featured-card elevated-card" key={blog._id}>
                  <img src={blog.image_url} alt={blog.title} />
                  <div className="featured-body">
                    <h3>{blog.title}</h3>
                    <span className="post-category-pill">{blog.category || "General"}</span>
                    <p>
                      {(blog.description || "").length > 150
                        ? `${blog.description.slice(0, 150)}...`
                        : blog.description}
                    </p>
                    {(blog.seoTags || []).length > 0 && (
                      <div className="seo-tag-row">
                        {blog.seoTags.slice(0, 4).map((tag) => (
                          <button key={tag} type="button" onClick={() => setTagSearch(tag)}>
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                    <Link to={`/posts/${blog._id}`}>Read Article</Link>
                  </div>
                </article>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="pagination-wrap">
                <button
                  type="button"
                  disabled={!pagination.hasPrev}
                  onClick={() => loadFeaturedPosts(Math.max(pagination.page - 1, 1))}
                >
                  Prev
                </button>
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={!pagination.hasNext}
                  onClick={() => loadFeaturedPosts(Math.min(pagination.page + 1, pagination.totalPages))}
                >
                  Next
                </button>
              </div>
            )}
            </div>

            <aside className="feed-side-right elevated-card">
              <h3>Staff Picks</h3>
              {(featuredPosts || []).slice(0, 5).map((post) => (
                <article key={`pick-${post._id}`}>
                  <strong>{post.title}</strong>
                  <span>{post.category || "General"}</span>
                  <Link to={`/posts/${post._id}`}>Read</Link>
                </article>
              ))}
            </aside>
          </section>
        </main>
      )}

      {isPostsView && <Outlet />}
      <Footer />
    </>
  );
};

export default Home;
