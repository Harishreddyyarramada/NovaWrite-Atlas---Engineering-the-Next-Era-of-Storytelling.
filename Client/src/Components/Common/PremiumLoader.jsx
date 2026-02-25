import React from "react";
import "./PremiumLoader.css";

const PremiumLoader = ({ label = "Loading..." }) => {
  return (
    <div className="premium-loader-wrap">
      <div className="premium-loader-ring" />
      <p>{label}</p>
    </div>
  );
};

export default PremiumLoader;
