import React from "react";
import { Link } from "react-router-dom";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-grid">
        <section>
          <h3>NovaWrite Atlas</h3>
          <p>
            Publish standout stories, connect in real-time, and scale your creator
            brand with premium writing intelligence.
          </p>
        </section>

        <section>
          <h4>Platform</h4>
          <Link to="/home">Home</Link>
          <Link to="/home/posts">My Posts</Link>
          <Link to="/chat">Live Chat</Link>
          <Link to="/myprofile">Profile</Link>
        </section>

        <section>
          <h4>Resources</h4>
          <Link to="/home/support">Support</Link>
          <Link to="/home/partnerships">Partnerships</Link>
          <Link to="/home/privacy">Privacy</Link>
          <Link to="/home/terms">Terms</Link>
        </section>

        <section>
          <h4>Email</h4>
          <a href="mailto:blogbaseofficial@gmail.com">blogbaseofficial@gmail.com</a>
          <a href="mailto:blogbaseofficial@gmail.com?subject=Support%20Request">Contact Support</a>
        </section>

        <section>
          <h4>Follow</h4>
          <div className="social-row">
            <a href="https://facebook.com" target="_blank" rel="noreferrer">
              <FaFacebook />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              <FaTwitter />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              <FaInstagram />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">
              <FaLinkedin />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer">
              <FaYoutube />
            </a>
          </div>
        </section>
      </div>

      <p className="footer-note">
        Copyright {new Date().getFullYear()} NovaWrite Atlas. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
