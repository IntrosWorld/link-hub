import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error Boundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-black text-white p-8">
                    <div className="max-w-2xl w-full bg-zinc-900 border border-red-500 rounded-lg p-6">
                        <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
                        <p className="text-zinc-300 mb-4">
                            The application encountered an error. Please check the browser console for details.
                        </p>

                        <details className="mb-4">
                            <summary className="cursor-pointer text-brand-green hover:underline">
                                Show error details
                            </summary>
                            <pre className="mt-2 p-4 bg-black rounded text-xs overflow-auto">
                                {this.state.error && this.state.error.toString()}
                                {'\n\n'}
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </details>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-brand-green text-black rounded-lg font-bold hover:bg-green-400"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
