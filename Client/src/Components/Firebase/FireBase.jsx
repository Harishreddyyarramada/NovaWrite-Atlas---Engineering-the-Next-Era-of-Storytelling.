import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import API from "../../Utils/api.js";
import { auth, provider } from "./firebase.js";

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
      onError?.(error?.response?.data?.msg || "Google sign-in failed.");
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
