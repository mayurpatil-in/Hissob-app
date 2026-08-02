import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error in Component Tree:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F8FAFC', padding: 24 }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle={this.state.error?.message || "An unexpected error occurred in the application UI."}
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload} style={{ background: '#0F172A', borderColor: '#0F172A', borderRadius: 8, fontWeight: 700 }}>
                Reload Application
              </Button>,
              <Button key="dashboard" onClick={() => window.location.href = '/dashboard'} style={{ borderRadius: 8 }}>
                Go to Dashboard
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
