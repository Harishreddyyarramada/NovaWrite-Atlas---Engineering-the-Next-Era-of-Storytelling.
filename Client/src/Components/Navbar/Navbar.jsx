import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiActivity, FiBookmark, FiHome, FiMenu, FiMessageCircle, FiUser, FiX, FiZap } from "react-icons/fi";
import Assests from "../../assets/Assests.js";
import API from "../../Utils/api.js";
import { clearAuthSession } from "../../Utils/authSession.js";
import postCategories from "../../Constants/postCategories.js";
import Logo from "../../assets/NovaWriteAtlasLogo.png";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Technology");
  const [seoTagsInput, setSeoTagsInput] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [aiLoadingAction, setAiLoadingAction] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [aiTagOutput, setAiTagOutput] = useState([]);
  const [aiTitles, setAiTitles] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [menuStats, setMenuStats] = useState({
    myPostsCount: 0,
    savedPostsCount: 0,
    chatsCount: 0,
  });

  const rawProfilePic = localStorage.getItem("profilePic");
  const email = localStorage.getItem("email");
  const user = localStorage.getItem("user") || "U";
  const totalUsers = localStorage.getItem("total-users") || 0;
  const role = localStorage.getItem("role") || "user";

  const profilePic =
    rawProfilePic && !["null", "undefined"].includes(rawProfilePic)
      ? rawProfilePic
      : "";
  const currentLetter = useMemo(() => {
    const first = String(user || "").trim().toUpperCase()[0];
    return /^[A-Z]$/.test(first) ? first : "A";
  }, [user]);
  const fallbackAvatar = Assests[currentLetter] || Assests.A;
  const isPostsView = location.pathname.toLowerCase().includes("/home/posts");

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  useEffect(() => {
    const loadMenuStats = async () => {
      try {
        const response = await API.get("/users/menu-stats");
        setMenuStats(response.data || {});
      } catch (_error) {
        setMenuStats({ myPostsCount: 0, savedPostsCount: 0, chatsCount: 0 });
      }
    };

    loadMenuStats();
  }, []);

  useEffect(() => {
    return () => {
      if (window.__blogRecognition) {
        window.__blogRecognition.stop();
      }
    };
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setTitle("");
    setDescription("");
    setCategory("Technology");
    setSeoTagsInput("");
    setImage(null);
    setModalError("");
    setAiLoadingAction("");
    setAiOutput("");
    setAiTagOutput([]);
    setAiTitles([]);
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const goToAndClose = (path) => {
    setShowMobileMenu(false);
    navigate(path);
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setModalError("");

    try {
      if (!email || !title || !image) {
        setModalError("Title and image are required.");
        return;
      }

      const formData = new FormData();
      formData.append("email", email);
      formData.append("image", image);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("seoTags", seoTagsInput);
      await API.post("/upload/uploads", formData);
      closeModal();
      navigate("/home/posts");
    } catch (error) {
      setModalError(error?.response?.data?.msg || "Unable to create blog.");
    } finally {
      setSubmitting(false);
    }
  };

  const runAiAction = async (action) => {
    try {
      setAiLoadingAction(action);
      setModalError("");
      setAiOutput("");
      setAiTagOutput([]);
      setAiTitles([]);

      const response = await API.post("/posts/ai/enhance", {
        action,
        title,
        description,
      });

      const result = response.data?.result;

      if (action === "improve" && typeof result === "string") {
        setDescription(result);
        setAiOutput("Description improved.");
      }

      if (action === "seo-tags" && Array.isArray(result)) {
        setAiTagOutput(result);
        setSeoTagsInput(result.map((tag) => String(tag).replace("#", "")).join(", "));
      }

      if (action === "title-suggestions" && Array.isArray(result)) {
        setAiTitles(result);
      }

      if (action === "summary" && typeof result === "string") {
        setAiOutput(result);
      }

      if (action === "linkedin" && typeof result === "string") {
        setAiOutput(result);
      }
    } catch (error) {
      setModalError(error?.response?.data?.msg || "AI enhancement failed.");
    } finally {
      setAiLoadingAction("");
    }
  };

  const handleVoiceToBlog = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setModalError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      window.__blogRecognition = recognition;
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript.trim()) {
          setDescription((prev) => `${prev}${prev ? "\n" : ""}${transcript.trim()}`);
        }
      };

      recognition.onerror = () => {
        setModalError("Unable to capture voice input.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } catch (_error) {
      setIsListening(false);
      setModalError("Voice input failed to start.");
    }
  };

  const applySuggestedTitle = (suggestedTitle) => {
    setTitle(suggestedTitle);
  };

  return (
    <>
      <header className="premium-nav-wrap">
        <div className="page-shell premium-nav">
          <button
            type="button"
            className="mobile-menu-btn mobile-menu-left-btn"
            onClick={() => setShowMobileMenu(true)}
            aria-label="Open menu"
          >
            <FiMenu />
          </button>

          <Link to="/home" className="brand-block">
            <img src={Logo} alt="NovaWrite Atlas logo" />
            <div className="brand-meta">
              <span className="brand-tag">Top Creator Choice</span>
            </div>
          </Link>

          <div className="nav-actions">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setShowMobileMenu(true)}
              aria-label="Open menu"
            >
              <FiMenu />
            </button>

            <span className="users-pill">
              <i className="fas fa-users" /> {totalUsers} Members
            </span>

            <button
              type="button"
              className="nav-btn"
              onClick={() => navigate(isPostsView ? "/home" : "/home/posts")}
            >
              {isPostsView ? "Featured" : "My Posts"}
            </button>

            <button type="button" className="nav-btn chat-live-btn" onClick={() => navigate("/chat")}>
              <span className="live-radar">
                <FiActivity />
              </span>
              <FiMessageCircle /> Live Chat
            </button>

            {role === "admin" && (
              <button type="button" className="nav-btn" onClick={() => navigate("/admin/dashboard")}>
                Admin
              </button>
            )}

            <button type="button" className="create-btn" onClick={() => setShowModal(true)}>
              + Create
            </button>

            <Link to="/myprofile" className="profile-link" aria-label="My profile">
              <img
                src={profilePic || fallbackAvatar}
                alt="profile"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = fallbackAvatar;
                }}
              />
            </Link>

            <button type="button" className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>

          <Link to="/myprofile" className="profile-link mobile-profile-link" aria-label="My profile">
            <img
              src={profilePic || fallbackAvatar}
              alt="profile"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = fallbackAvatar;
              }}
            />
          </Link>
        </div>
      </header>

      {showMobileMenu && (
        <div className="mobile-menu-overlay" onClick={() => setShowMobileMenu(false)}>
          <aside className="mobile-menu-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu-head">
              <h4>Quick Menu</h4>
              <button type="button" onClick={() => setShowMobileMenu(false)}>
                <FiX />
              </button>
            </div>

            <button type="button" onClick={() => goToAndClose("/home")}>
              <FiHome /> Home
            </button>
            <button type="button" onClick={() => goToAndClose("/home/posts")}>
              <FiUser /> My Posts ({menuStats.myPostsCount || 0})
            </button>
            <button type="button" onClick={() => goToAndClose("/home/saved")}>
              <FiBookmark /> Saved ({menuStats.savedPostsCount || 0})
            </button>
            <button type="button" onClick={() => goToAndClose("/chat")}>
              <FiMessageCircle /> Chats ({menuStats.chatsCount || 0})
            </button>
            <button type="button" onClick={() => goToAndClose("/myprofile")}>
              <FiUser /> Profile
            </button>
            <button type="button" onClick={() => goToAndClose("/myprofile/analytics")}>
              <FiActivity /> Analytics
            </button>
            {role === "admin" && (
              <button type="button" onClick={() => goToAndClose("/admin/dashboard")}>
                <FiZap /> Admin Dashboard
              </button>
            )}
            <button type="button" className="mobile-create-btn" onClick={() => { setShowMobileMenu(false); setShowModal(true); }}>
              + Create Post
            </button>
            <button type="button" className="mobile-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </aside>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>Publish New Article</h3>
              <button type="button" className="btn-close-custom" onClick={closeModal}>
                x
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="create-form">
              <label>
                Title
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  rows="5"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={800}
                  placeholder="Write a concise and useful summary..."
                />
              </label>

              <div className="ai-tools-wrap">
                <p>
                  <FiZap /> AI-Powered Blog Enhancer
                </p>
                <div className="ai-tools-grid">
                  <button
                    type="button"
                    className="ai-tool-btn"
                    onClick={() => runAiAction("improve")}
                    disabled={aiLoadingAction !== ""}
                  >
                    {aiLoadingAction === "improve" ? "Improving..." : "Improve Writing"}
                  </button>
                  <button
                    type="button"
                    className="ai-tool-btn"
                    onClick={() => runAiAction("seo-tags")}
                    disabled={aiLoadingAction !== ""}
                  >
                    {aiLoadingAction === "seo-tags" ? "Generating..." : "Generate SEO Tags"}
                  </button>
                  <button
                    type="button"
                    className="ai-tool-btn"
                    onClick={() => runAiAction("title-suggestions")}
                    disabled={aiLoadingAction !== ""}
                  >
                    {aiLoadingAction === "title-suggestions" ? "Generating..." : "Title Suggestions"}
                  </button>
                  <button
                    type="button"
                    className="ai-tool-btn"
                    onClick={() => runAiAction("summary")}
                    disabled={aiLoadingAction !== ""}
                  >
                    {aiLoadingAction === "summary" ? "Summarizing..." : "Create Summary"}
                  </button>
                  <button
                    type="button"
                    className="ai-tool-btn"
                    onClick={() => runAiAction("linkedin")}
                    disabled={aiLoadingAction !== ""}
                  >
                    {aiLoadingAction === "linkedin" ? "Converting..." : "Convert to LinkedIn Post"}
                  </button>
                </div>
                <button
                  type="button"
                  className="ai-tool-btn voice-btn"
                  onClick={handleVoiceToBlog}
                  disabled={isListening}
                >
                  {isListening ? "Listening..." : "Voice to Blog"}
                </button>
              </div>

              {!!aiOutput && <p className="ai-output">{aiOutput}</p>}

              {aiTagOutput.length > 0 && (
                <div className="ai-tags-list">
                  {aiTagOutput.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}

              {aiTitles.length > 0 && (
                <div className="ai-titles-list">
                  {aiTitles.map((suggestedTitle) => (
                    <button
                      key={suggestedTitle}
                      type="button"
                      onClick={() => applySuggestedTitle(suggestedTitle)}
                    >
                      {suggestedTitle}
                    </button>
                  ))}
                </div>
              )}

              <label>
                Category
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {postCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                SEO Tags
                <input
                  type="text"
                  value={seoTagsInput}
                  onChange={(event) => setSeoTagsInput(event.target.value)}
                  placeholder="ai, mern, seo, cloud"
                />
              </label>

              <label>
                Cover Image
                <input
                  type="file"
                  onChange={(event) => setImage(event.target.files?.[0] || null)}
                  accept="image/*"
                  required
                />
              </label>

              {preview && (
                <img src={preview} alt="cover preview" className="create-preview" />
              )}

              {!!modalError && <p className="modal-error">{modalError}</p>}

              <button type="submit" className="publish-btn" disabled={submitting}>
                {submitting ? "Publishing..." : "Publish Article"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
