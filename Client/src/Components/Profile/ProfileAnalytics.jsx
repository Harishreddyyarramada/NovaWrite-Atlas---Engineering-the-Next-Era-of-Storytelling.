import React, { useEffect, useState } from "react";
import API from "../../Utils/api.js";
import PremiumLoader from "../Common/PremiumLoader.jsx";
import "./ProfileAnalytics.css";

const ProfileAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalViews: 0,
    engagementGrowth: 0,
    returningReaders: 0,
    bestPost: null,
    weekly: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const metricCards = [
    { label: "Total Posts", value: analytics.totalPosts || 0 },
    { label: "Total Likes", value: analytics.totalLikes || 0 },
    { label: "Total Comments", value: analytics.totalComments || 0 },
    { label: "Total Views", value: analytics.totalViews || 0 },
    { label: "Total Shares", value: analytics.totalShares || 0 },
    { label: "Engagement Growth", value: analytics.engagementGrowth || 0 },
    { label: "Returning Readers", value: analytics.returningReaders || 0 },
    { label: "Community Score", value: (analytics.totalLikes || 0) + (analytics.totalComments || 0) },
  ];

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await API.get("/profile/analytics");
        setAnalytics(response.data || {});
      } catch (apiError) {
        setError(apiError?.response?.data?.msg || "Unable to load analytics.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <section className="analytics-page">
        <div className="page-shell">
          <PremiumLoader label="Loading analytics..." />
        </div>
      </section>
    );
  }

  return (
    <section className="analytics-page">
      <div className="page-shell analytics-layout">
        <article className="profile-analytics elevated-card">
          <h2>Analytics Dashboard</h2>
          {!!error && <p className="analytics-error">{error}</p>}

          <div className="analytics-grid">
            {metricCards.map((metric) => (
              <article key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>

          <div className="best-post-card">
            <h4>Top Performing Post</h4>
            <p>{analytics.bestPost?.title || "No post data yet."}</p>
            <small>Score: {analytics.bestPost?.score || 0}</small>
          </div>

          <div className="analytics-charts">
            <article className="chart-card">
              <h4>Engagement Mix</h4>
              <div
                className="engagement-donut"
                style={{
                  background: `conic-gradient(
                    #2a77f2 0% ${Math.min((analytics.totalLikes || 0) * 4, 100)}%,
                    #32b0d6 ${Math.min((analytics.totalLikes || 0) * 4, 100)}% ${Math.min(((analytics.totalLikes || 0) + (analytics.totalComments || 0)) * 4, 100)}%,
                    #5ad4a8 ${Math.min(((analytics.totalLikes || 0) + (analytics.totalComments || 0)) * 4, 100)}% 100%
                  )`,
                }}
              >
                <span>{(analytics.totalLikes || 0) + (analytics.totalComments || 0) + (analytics.totalShares || 0)}</span>
              </div>
              <p>Likes + Comments + Shares</p>
            </article>

            <article className="chart-card">
              <h4>Weekly Trend</h4>
              <div className="mini-weekly-bars">
                {(analytics.weekly || []).map((item) => (
                  <div key={item.label} title={`${item.label}: ${item.value || 0}`}>
                    <i style={{ height: `${Math.min((item.value || 0) * 12, 100)}%` }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="weekly-chart">
            <h4>Weekly Engagement</h4>
            {(analytics.weekly || []).map((item) => (
              <div key={item.label} className="weekly-row">
                <span>{item.label}</span>
                <div>
                  <i style={{ width: `${Math.min((item.value || 0) * 12, 100)}%` }} />
                </div>
                <strong>{item.value || 0}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
};

export default ProfileAnalytics;
