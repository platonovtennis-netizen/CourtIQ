import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surfaced in the browser console too, but this keeps it on-screen so it's
    // not lost/missed — a blank screen with no visible error is the worst UX.
    console.error('Court IQ crashed:', error, info.componentStack);
    this.setState({ info: info.componentStack || null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl bg-slate-900 border border-red-500/30 rounded-2xl p-6 space-y-4">
            <div className="text-red-400 font-black uppercase tracking-widest text-sm">Something crashed</div>
            <div className="font-mono text-sm text-red-300 whitespace-pre-wrap break-words">
              {this.state.error.message}
            </div>
            {this.state.info && (
              <pre className="font-mono text-[11px] text-slate-500 whitespace-pre-wrap break-words max-h-64 overflow-y-auto border-t border-white/10 pt-3">
                {this.state.info}
              </pre>
            )}
            <p className="text-slate-400 text-xs">
              Copy the text above and share it — that's exactly what's needed to fix this.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
