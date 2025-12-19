import React from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 p-6 font-sans">
                    <div className="text-center max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                        <div className="p-4 bg-red-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center animate-pulse">
                            <AlertTriangle className="h-10 w-10 text-red-500" />
                        </div>

                        <h2 className="text-2xl font-bold mb-3 text-gray-800">Something went wrong</h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            We're sorry, but an unexpected error has occurred. Our team has been notified.
                        </p>

                        {/* Dev details - hidden in production could be better, but useful for now */}
                        {this.state.error && (
                            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-left text-xs font-mono overflow-auto max-h-48 mb-6 w-full opacity-90">
                                <p className="font-bold text-red-300 mb-2">{this.state.error.toString()}</p>
                                {this.state.errorInfo?.componentStack}
                            </div>
                        )}

                        <button
                            onClick={this.handleRetry}
                            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-blue-500/30 transition-all active:scale-95 duration-200"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
