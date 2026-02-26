import React from 'react'
import { Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { forceRelogin, isTokenExpired } from '../../Utils/authSession.js';
const Protectedroute = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to='/' replace />;
  }

  if (isTokenExpired(token)) {
    forceRelogin();
    return null;
  }

  return <Outlet />;
}

export default Protectedroute
