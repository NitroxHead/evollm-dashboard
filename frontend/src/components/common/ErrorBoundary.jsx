import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ margin: 20, textAlign: 'center' }}>
          <h3 style={{ color: 'var(--red)', marginBottom: 8 }}>Something went wrong</h3>
          <pre style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => this.setState({ error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
