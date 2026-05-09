import type { ErrorInfo, ReactNode } from 'react';
import { Component, Fragment } from 'react';
import { AppErrorFallback } from './AppErrorFallback';
import { logAppError } from './errorLogging';

type GlobalErrorBoundaryProps = {
  children: ReactNode;
};

type GlobalErrorBoundaryState = {
  error: Error | null;
  retryCount: number;
};

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = {
    error: null,
    retryCount: 0,
  };

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return {
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logAppError(
      error,
      'global-boundary',
      errorInfo.componentStack ?? undefined,
    );
  }

  handleRetry = () => {
    this.setState((currentState) => ({
      error: null,
      retryCount: currentState.retryCount + 1,
    }));
  };

  render() {
    const { children } = this.props;
    const { error, retryCount } = this.state;

    if (error) {
      return (
        <AppErrorFallback
          title="Algo ha fallado en la aplicación"
          description="Hemos aislado el error para que el resto del sistema no quede inutilizable."
          errorMessage={error.message}
          onRetry={this.handleRetry}
        />
      );
    }

    return <Fragment key={retryCount}>{children}</Fragment>;
  }
}
