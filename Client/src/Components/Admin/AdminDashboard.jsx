import React, { useEffect, useState } from "react";
import API from "../../Utils/api.js";
import "./Admin.css";

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/admin/dashboard");
      setStats(response.data?.stats || {});
      setUsers(response.data?.users || []);
      setPosts(response.data?.posts || []);
    } catch (apiError) {
      setError(apiError?.response?.data?.msg || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const deleteUser = async (id) => {
    await API.delete(`/admin/users/${id}`);
    loadDashboard();
  };

  const deletePost = async (id) => {
    await API.delete(`/admin/posts/${id}`);
    loadDashboard();
  };

  if (loading) return <p className="admin-state">Loading dashboard...</p>;

  return (
    <section className="admin-page">
      <div className="page-shell admin-layout">
        <header className="admin-head elevated-card">
          <h2>Platform Admin Dashboard</h2>
          <p>Live moderation, analytics, and creator performance overview.</p>
        </header>

        {!!error && <p className="admin-error">{error}</p>}

        <section className="admin-stat-grid">
          <article className="elevated-card">
            <strong>{stats.totalUsers || 0}</strong>
            <span>Users</span>
          </article>
          <article className="elevated-card">
            <strong>{stats.totalPosts || 0}</strong>
            <span>Posts</span>
          </article>
          <article className="elevated-card">
            <strong>{stats.totalLikes || 0}</strong>
            <span>Likes</span>
          </article>
          <article className="elevated-card">
            <strong>{stats.totalComments || 0}</strong>
            <span>Comments</span>
          </article>
        </section>

        <section className="admin-chart elevated-card">
          <h3>Top Performing Blog</h3>
          <p>{stats.topPost?.title || "No post data yet."}</p>
          <small>Views: {stats.topPost?.views || 0}</small>
        </section>

        <section className="admin-grid-two">
          <div className="admin-table-card elevated-card">
            <h3>Manage Users</h3>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => deleteUser(user._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-table-card elevated-card">
            <h3>Manage Posts</h3>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Category</th>
                    <th>Views</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post._id}>
                      <td>{post.title}</td>
                      <td>{post.author || post.email}</td>
                      <td>{post.category || "General"}</td>
                      <td>{post.views || 0}</td>
                      <td>
                        <button onClick={() => deletePost(post._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};

export default AdminDashboard;
