import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PagenotFound.css";

const Pagenotfound = () => {
  const navigate = useNavigate();

  return (
    <main className="notfound-page">
      <div className="notfound-bg-shape shape-one" />
      <div className="notfound-bg-shape shape-two" />
      <div className="notfound-bg-shape shape-three" />

      <section className="notfound-card">
        <span className="notfound-badge">Premium Experience</span>
        <p className="notfound-code">404</p>
        <h1>This route does not exist.</h1>
        <p>
          The page was moved, removed, or the URL is incorrect. Let&apos;s get you
          back to the right workspace.
        </p>
        <div className="notfound-actions">
          <Link to="/" className="notfound-btn primary-btn">
            Back To Login
          </Link>
          <button
            type="button"
            className="notfound-btn ghost-btn"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </section>
    </main>
  );
};

export default Pagenotfound;
