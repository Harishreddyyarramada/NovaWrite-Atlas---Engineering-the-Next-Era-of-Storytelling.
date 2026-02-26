import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { forceRelogin, isTokenExpired } from "../../Utils/authSession.js";

const AdminProtected = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (isTokenExpired(token)) {
    forceRelogin();
    return null;
  }

  return <Outlet />;
};

export default AdminProtected;
