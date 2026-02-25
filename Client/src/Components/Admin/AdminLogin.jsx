import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../Utils/api.js";
import "./Admin.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const response = await API.post("/admin/login", { email, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", "admin");
      localStorage.setItem("user", response.data.username || "Admin");
      localStorage.setItem("profilePic", response.data.profile_URL || "");
      navigate("/admin/dashboard");
    } catch (apiError) {
      setError(apiError?.response?.data?.msg || "Unable to login as admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card elevated-card">
        <h1>Admin Control Center</h1>
        <p>Access users, posts, and platform intelligence in real-time.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Admin Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {!!error && <p className="admin-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default AdminLogin;
