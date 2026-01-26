import { Auth } from 'firebase/auth';

window.addEventListener('error', (event: ErrorEvent) => {
  console.error('Unhandled Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

export const monitorAuth = (auth: Auth): void => {
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('Auth State: User logged in', {
        uid: user.uid,
        email: user.email
      });
    } else {
      console.log('Auth State: User logged out');
    }
  });
};

const originalFetch = window.fetch;

window.fetch = function(...args: Parameters<typeof fetch>): Promise<Response> {
  const [url, options] = args;

  console.log('Fetch Request:', {
    url,
    method: options?.method || 'GET',
    headers: options?.headers
  });

  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Fetch Response:', {
        url,
        status: response.status,
        ok: response.ok
      });
      return response;
    })
    .catch((error: Error) => {
      console.error('Fetch Error:', {
        url,
        error: error.message
      });
      throw error;
    });
};

console.log('Diagnostics enabled - All errors and requests will be logged');
