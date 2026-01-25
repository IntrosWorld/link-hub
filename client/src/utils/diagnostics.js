/**
 * Diagnostic utilities to help debug issues
 */

// Log all unhandled errors
window.addEventListener('error', (event) => {
    console.error('🔴 Unhandled Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

// Log all unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('🔴 Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise
    });
});

// Monitor Firebase auth state
export function monitorAuth(auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('✅ Auth State: User logged in', {
                uid: user.uid,
                email: user.email
            });
        } else {
            console.log('⚠️ Auth State: User logged out');
        }
    });
}

// Log fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const [url, options] = args;
    console.log('🌐 Fetch Request:', {
        url,
        method: options?.method || 'GET',
        headers: options?.headers
    });

    return originalFetch.apply(this, args)
        .then(response => {
            console.log('✅ Fetch Response:', {
                url,
                status: response.status,
                ok: response.ok
            });
            return response;
        })
        .catch(error => {
            console.error('❌ Fetch Error:', {
                url,
                error: error.message
            });
            throw error;
        });
};

console.log('🔍 Diagnostics enabled - All errors and requests will be logged');
