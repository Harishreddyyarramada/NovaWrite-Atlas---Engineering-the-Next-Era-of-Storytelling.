import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const AdminProtected = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  return token && role === "admin" ? <Outlet /> : <Navigate to="/admin" replace />;
};

export default AdminProtected;
