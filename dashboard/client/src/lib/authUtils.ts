export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message) || 
         error.message.includes('Unauthorized') ||
         error.message.includes('Invalid token');
}

export function handleUnauthorizedError() {
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}

export function redirectToLogin(message?: string) {
  if (message) {
    // Store message in sessionStorage to show after redirect
    sessionStorage.setItem('loginMessage', message);
  }
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}