import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="px-6 sm:px-10 py-10">
        <div className="bg-snow border border-silver-mist rounded-[28px] p-10 flex flex-col items-center text-center max-w-md mx-auto">
          <div className="h-12 w-12 rounded-full bg-fog flex items-center justify-center mb-5">
            <AlertTriangle className="h-6 w-6" strokeWidth={1.6} style={{ color: '#b64400' }} />
          </div>
          <h2
            className="font-display text-ink"
            style={{ fontWeight: 600, fontSize: 22, letterSpacing: '-0.3px' }}
          >
            Algo ha fallado
          </h2>
          <p className="font-text text-graphite mt-2" style={{ fontSize: 15, lineHeight: 1.45 }}>
            Esta sección ha encontrado un error inesperado. Puedes reintentar o recargar la página.
          </p>
          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={() => this.setState({ error: null })}>
              Reintentar
            </Button>
            <Button variant="accent" onClick={() => window.location.reload()}>
              Recargar
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
