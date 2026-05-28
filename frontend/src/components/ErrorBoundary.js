/* Author: Harshali Tambadkar (25543582) */
import React from 'react';
import '../styles/ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <h1>⚠️ Something went wrong</h1>
            <p className="error-message">
              {this.state.error?.toString()}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Technical Details</summary>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
            <button 
              onClick={this.resetError}
              className="error-reset-button"
            >
              🔄 Try Again
            </button>
            <p className="error-help">
              Troubleshooting steps:
              <ul>
                <li>Verify backend server is running on port 5000</li>
                <li>Verify database connection is established</li>
                <li>Check browser console for detailed error information</li>
              </ul>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
