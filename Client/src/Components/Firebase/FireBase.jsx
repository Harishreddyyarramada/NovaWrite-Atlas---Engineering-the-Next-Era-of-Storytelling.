import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import API from "../../Utils/api.js";
import { auth, provider } from "./firebase.js";

const getGoogleAuthErrorMessage = (error) => {
  const code = error?.code || "";
  const firebaseMessage = error?.message || "";
  const apiMessage = error?.response?.data?.msg || "";

  if (apiMessage) return apiMessage;

  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in was cancelled.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup blocked by browser. Allow popups and try again.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized in Firebase Authentication.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error while contacting Firebase.";
  }

  return firebaseMessage || "Google sign-in failed.";
};

export default function GoogleLogin({ onSuccess, onError, disabled = false }) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      onError?.("");

      const result = await signInWithPopup(auth, provider);
      const firebaseIdToken = await result.user.getIdToken();

      const response = await API.post("/auth/firebase", { token: firebaseIdToken });
      onSuccess?.(response.data);
    } catch (error) {
      onError?.(getGoogleAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="google-auth-btn"
      onClick={handleLogin}
      disabled={disabled || loading}
    >
      <img
        src="https://www.svgrepo.com/show/355037/google.svg"
        alt="Google"
      />
      {loading ? "Connecting..." : "Continue with Google"}
    </button>
  );
}
