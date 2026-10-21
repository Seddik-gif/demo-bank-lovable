import { Component, type ReactNode } from "react";
import { track } from "@/lib/bank/monitor";

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error) {
    track("error", `Render error: ${error.message}`);
  }

  override componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  override render() {
    if (this.state.error) {
      return (
        <div role="alert" className="glass mx-auto max-w-md p-8 text-center">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">This section hit an error. It has been recorded in Monitor.</p>
          <button className="btn btn-primary mt-5" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
