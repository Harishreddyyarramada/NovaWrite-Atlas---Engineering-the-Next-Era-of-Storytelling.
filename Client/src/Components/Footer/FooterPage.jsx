import React from "react";
import { useParams } from "react-router-dom";
import "./FooterPage.css";

const PAGE_CONTENT = {
  support: {
    title: "Support Center",
    subtitle: "We help you publish, grow, and resolve issues faster.",
    points: [
      "Email support for login, profile, posting, and chat issues.",
      "Priority response for production-impacting bugs.",
      "Guided troubleshooting for media upload and analytics data.",
    ],
  },
  partnerships: {
    title: "Partnerships",
    subtitle: "Collaborate with NovaWrite Atlas for community and creator growth.",
    points: [
      "Creator campaigns and editorial collaborations.",
      "Education, product, and startup ecosystem partnerships.",
      "Custom integrations for teams and communities.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "Your data is protected with practical, transparent controls.",
    points: [
      "We store only required profile and product usage data.",
      "Authentication and sessions are secured with token-based access.",
      "You can update profile data and visibility from account settings.",
    ],
  },
  terms: {
    title: "Terms of Use",
    subtitle: "Platform standards designed for safe and professional publishing.",
    points: [
      "Users are responsible for published content and media rights.",
      "Abusive activity, spam, and harmful behavior can lead to suspension.",
      "Service features may evolve to improve quality and reliability.",
    ],
  },
};

const FooterPage = () => {
  const { slug } = useParams();
  const page = PAGE_CONTENT[slug] || PAGE_CONTENT.support;

  return (
    <section className="footer-page-wrap">
      <div className="page-shell">
        <article className="footer-page-card elevated-card">
          <h1>{page.title}</h1>
          <p>{page.subtitle}</p>
          <ul>
            {page.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <a href="mailto:blogbaseofficial@gmail.com">Email: blogbaseofficial@gmail.com</a>
        </article>
      </div>
    </section>
  );
};

export default FooterPage;
