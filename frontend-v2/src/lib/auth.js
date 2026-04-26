export function getToken() {
  return localStorage.getItem('fluxscale.token');
}

export function setToken(token) {
  localStorage.setItem('fluxscale.token', token);
}

export function clearToken() {
  localStorage.removeItem('fluxscale.token');
  localStorage.removeItem('fluxscale.user');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('fluxscale.user') || 'null');
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem('fluxscale.user', JSON.stringify(user));
}

export function isAuthenticated() {
  return Boolean(getToken());
}
