const AUTH_KEYS = [
  "token",
  "email",
  "userId",
  "user",
  "total-users",
  "profilePic",
  "authProvider",
  "emailVerified",
  "bio",
  "website",
  "location",
  "linkedin",
  "role",
];

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch (_error) {
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
};

export const clearAuthSession = () => {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const getReloginPath = () => {
  const role = localStorage.getItem("role");
  return role === "admin" ? "/admin" : "/";
};

export const forceRelogin = () => {
  const targetPath = getReloginPath();
  clearAuthSession();
  if (window.location.pathname !== targetPath) {
    window.location.replace(`${targetPath}?session=expired`);
  }
};
