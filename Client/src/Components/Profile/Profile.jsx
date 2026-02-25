import React, { useEffect, useMemo, useState } from "react";
import API from "../../Utils/api.js";
import Assests from "../../assets/Assests.js";
import PremiumLoader from "../Common/PremiumLoader.jsx";
import "./Profile.css";

const THEME_OPTIONS = [
  { id: "light", label: "Light Mode" },
  { id: "dark", label: "Dark Mode" },
  { id: "writer", label: "Writer Mode" },
  { id: "focus", label: "Focus Mode" },
  { id: "neon", label: "Neon Hacker" },
];

const Profile = () => {
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    bio: "",
    website: "",
    location: "",
    linkedin: "",
    themePreference: localStorage.getItem("theme") || "light",
    profile_URL: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fallbackAvatar = useMemo(() => {
    const first = String(profile.username || "A").trim().toUpperCase()[0];
    const letter = /^[A-Z]$/.test(first) ? first : "A";
    return Assests[letter] || Assests.A;
  }, [profile.username]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const profileResponse = await API.get("/profile/me");

        setProfile((prev) => ({
          ...prev,
          ...profileResponse.data,
        }));
        localStorage.setItem("user", profileResponse.data?.username || "");
        localStorage.setItem("profilePic", profileResponse.data?.profile_URL || "");
        localStorage.setItem("email", profileResponse.data?.email || "");
        localStorage.setItem("linkedin", profileResponse.data?.linkedin || "");
      } catch (apiError) {
        setError(apiError?.response?.data?.msg || "Unable to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", profile.themePreference || "light");
    localStorage.setItem("theme", profile.themePreference || "light");
  }, [profile.themePreference]);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const updateProfileValue = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (showPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("username", profile.username || "");
      formData.append("bio", profile.bio || "");
      formData.append("website", profile.website || "");
      formData.append("location", profile.location || "");
      formData.append("linkedin", profile.linkedin || "");
      formData.append("themePreference", profile.themePreference || "light");

      if (showPassword && newPassword.trim()) {
        formData.append("currentPassword", currentPassword);
        formData.append("newPassword", newPassword);
      }

      if (selectedImage) {
        formData.append("profilePic", selectedImage);
      }

      const response = await API.put("/profile/me", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setProfile((prev) => ({ ...prev, ...updatedUser }));
        localStorage.setItem("user", updatedUser.username);
        localStorage.setItem("profilePic", updatedUser.profile_URL || "");
        localStorage.setItem("theme", updatedUser.themePreference || "light");
        localStorage.setItem("linkedin", updatedUser.linkedin || "");
      }

      if (showPassword) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
      setSelectedImage(null);
      setSuccess("Profile updated successfully.");
    } catch (apiError) {
      setError(apiError?.response?.data?.msg || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="profile-page">
        <div className="page-shell">
          <PremiumLoader label="Loading your profile..." />
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <div className="page-shell profile-layout">
        <article className="profile-card elevated-card">
          {saving && <div className="profile-saving-overlay">Saving changes...</div>}
          <div className="profile-top">
            <img
              src={imagePreview || profile.profile_URL || fallbackAvatar}
              alt={profile.username || "Profile"}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = fallbackAvatar;
              }}
            />
            <div>
              <h2>{profile.username || "Creator"}</h2>
              <p>{profile.email}</p>
              <label className="upload-btn">
                Change Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setSelectedImage(event.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                value={profile.username}
                onChange={(event) => updateProfileValue("username", event.target.value)}
                maxLength={50}
              />
            </label>

            <label>
              Bio
              <textarea
                rows="4"
                value={profile.bio}
                onChange={(event) => updateProfileValue("bio", event.target.value)}
                maxLength={500}
              />
            </label>

            <div className="profile-two-grid">
              <label>
                Website
                <input
                  value={profile.website}
                  onChange={(event) => updateProfileValue("website", event.target.value)}
                  placeholder="https://yourportfolio.com"
                />
              </label>
              <label>
                Location
                <input
                  value={profile.location}
                  onChange={(event) => updateProfileValue("location", event.target.value)}
                  placeholder="City, Country"
                />
              </label>
            </div>

            <label>
              LinkedIn Profile
              <input
                value={profile.linkedin}
                onChange={(event) => updateProfileValue("linkedin", event.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </label>

            <label>
              Theme Mode
              <select
                value={profile.themePreference}
                onChange={(event) => updateProfileValue("themePreference", event.target.value)}
              >
                {THEME_OPTIONS.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Cancel Password Change" : "Change Password"}
            </button>

            {showPassword && (
              <div className="profile-two-grid">
                <label>
                  Current Password
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>
                <label>
                  New Password
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>
              </div>
            )}

            {showPassword && (
              <label>
                Confirm New Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            )}

            {!!error && <p className="profile-state profile-error">{error}</p>}
            {!!success && <p className="profile-state profile-success">{success}</p>}

            <button type="submit" className="profile-save-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
};

export default Profile;
