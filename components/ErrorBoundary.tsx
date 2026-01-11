
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("NEON_CORE_CRITICAL_FAILURE:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#060214] flex items-center justify-center p-8 text-center text-cyan-400 font-mono overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div className="relative z-10 max-w-xl cyber-panel p-12 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <div className="mb-6 text-red-500 animate-pulse text-6xl">⚠️</div>
                <h1 className="text-3xl font-orbitron font-black text-white mb-4 uppercase tracking-tighter">System Integrity Failure</h1>
                <div className="bg-black/40 p-4 border border-red-500/20 text-left text-[10px] mb-8 overflow-auto max-h-40">
                  <p className="text-red-400 font-bold mb-2">> EXCEPTION_CAUGHT:</p>
                  <p className="text-red-200/60 leading-relaxed">{this.state.error?.stack || this.state.error?.message}</p>
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-4 bg-red-500/10 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all font-orbitron font-bold uppercase tracking-[0.2em]"
                >
                    Hard Reboot Sequence
                </button>
            </div>
        </div>
      );
    }

    // Explicitly destructuring props to help TS resolution
    const { children } = this.props;
    return children;
  }
}
