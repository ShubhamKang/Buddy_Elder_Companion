import React from 'react';
import Skeleton from './Skeleton';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.props.isLoading) {
      return <Skeleton />;
    }
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div style={styles.errorContainer}>
          <div style={styles.errorCard}>
            <h2 style={styles.errorTitle}>🚨 Something went wrong</h2>
            <p style={styles.errorMessage}>
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            
            <div style={styles.errorActions}>
              <button 
                style={styles.refreshButton}
                onClick={() => window.location.reload()}
              >
                🔄 Refresh Page
              </button>
              
              <button 
                style={styles.homeButton}
                onClick={() => window.location.href = '/'}
              >
                🏠 Go Home
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details style={styles.errorDetails}>
                <summary style={styles.errorSummary}>Error Details (Development)</summary>
                <pre style={styles.errorStack}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

const styles = {
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  errorCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
  },
  errorTitle: {
    color: '#e74c3c',
    fontSize: '24px',
    marginBottom: '16px',
    fontWeight: 'bold'
  },
  errorMessage: {
    color: '#555',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '30px'
  },
  errorActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  refreshButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '25px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
  },
  homeButton: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '25px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)'
  },
  errorDetails: {
    marginTop: '30px',
    textAlign: 'left',
    background: '#f8f9fa',
    borderRadius: '10px',
    padding: '15px'
  },
  errorSummary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#666',
    marginBottom: '10px'
  },
  errorStack: {
    fontSize: '12px',
    color: '#e74c3c',
    overflow: 'auto',
    maxHeight: '200px',
    background: '#fff',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ddd'
  }
};

export default ErrorBoundary;
