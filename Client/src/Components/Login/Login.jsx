import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../Utils/api.js";
import GoogleLogin from "../Firebase/FireBase.jsx";
import "./Login.css";

const initialForm = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const Login = () => {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/home");
    }
  }, [navigate]);

  const toggleMode = () => {
    setIsLoginMode((prev) => !prev);
    setFormData(initialForm);
    setError("");
  };

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.id]: event.target.value }));
  };

  const saveSession = (payload) => {
    localStorage.setItem("email", payload.email || formData.email);
    localStorage.setItem("token", payload.token);
    localStorage.setItem("userId", payload.userId);
    localStorage.setItem("user", payload.username);
    localStorage.setItem("total-users", payload.total_users);
    localStorage.setItem("profilePic", payload.profile_URL || "");
    localStorage.setItem("authProvider", payload.authProvider || "local");
    localStorage.setItem("emailVerified", String(Boolean(payload.emailVerified)));
    localStorage.setItem("theme", payload.themePreference || "light");
    localStorage.setItem("bio", payload.bio || "");
    localStorage.setItem("website", payload.website || "");
    localStorage.setItem("location", payload.location || "");
    localStorage.setItem("linkedin", payload.linkedin || "");
    localStorage.setItem("role", payload.role || "user");
    document.documentElement.setAttribute("data-theme", payload.themePreference || "light");
  };

  const handleGoogleSuccess = (payload) => {
    saveSession(payload);
    navigate("/home");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (isLoginMode) {
        const response = await API.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });
        saveSession(response.data);
        navigate("/home");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      await API.post("/auth/register", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      setIsLoginMode(true);
      setFormData(initialForm);
    } catch (apiError) {
      setError(apiError?.response?.data?.msg || "Unable to continue. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-hero">
          <span className="pill-badge pill-brand">Premium Platform</span>
          <h1>Turn Ideas Into High-Impact Stories.</h1>
          <p>
            Ship polished articles, engage readers live, and grow your authority
            from one modern creator platform.
          </p>
          <ul>
            <li>Premium publishing workflow</li>
            <li>AI-ready writing and discovery tools</li>
            <li>Live chat and community engagement</li>
          </ul>
        </aside>

        <section className="auth-card">
          <h2>{isLoginMode ? "Welcome Back, Creator" : "Create Creator Account"}</h2>
          <p>{isLoginMode ? "Sign in to continue building impact." : "Start your creator journey now."}</p>

          <form onSubmit={handleSubmit}>
            {!isLoginMode && (
              <label>
                Username
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  maxLength={20}
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                maxLength={40}
                required
              />
            </label>

            <label>
              Password
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                maxLength={30}
                required
              />
            </label>

            {!isLoginMode && (
              <label>
                Confirm Password
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  maxLength={30}
                  required
                />
              </label>
            )}

            {!!error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={submitting}>
              {submitting
                ? "Please wait..."
                : isLoginMode
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="auth-footer">
            {isLoginMode && (
              <>
                <div className="auth-divider">
                  <span>or</span>
                </div>
                <GoogleLogin
                  disabled={submitting}
                  onSuccess={handleGoogleSuccess}
                  onError={setError}
                />
              </>
            )}

            <p>
              {isLoginMode ? "No account yet?" : "Already have an account?"}{" "}
              <button type="button" onClick={toggleMode}>
                {isLoginMode ? "Register" : "Login"}
              </button>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
};

export default Login;
