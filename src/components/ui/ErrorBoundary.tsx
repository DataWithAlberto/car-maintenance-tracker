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
          {this.state.error && (
            <details style={{ marginTop: 12, textAlign: 'left', maxWidth: '100%' }}>
              <summary
                className="font-mono"
                style={{ fontSize: 11, color: '#a1a1a6', cursor: 'pointer' }}
              >
                Detalles del error
              </summary>
              <pre
                style={{
                  marginTop: 8,
                  padding: '10px 12px',
                  background: '#f5f5f7',
                  borderRadius: 8,
                  fontSize: 11,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#b64400',
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack?.split('\n').slice(0, 6).join('\n')}
              </pre>
            </details>
          )}
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
