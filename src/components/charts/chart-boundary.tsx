"use client";

import { Component, type ReactNode } from "react";
import { ErrorState } from "@/components/ui/error-state";

interface ChartBoundaryProps {
  children: ReactNode;
}

/**
 * Contains a chart that fails to draw in the browser. The panel's text summary
 * and data table are server-rendered outside this boundary, so the figures stay
 * readable even when the drawing does not.
 */
export class ChartBoundary extends Component<ChartBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <ErrorState
          title="This chart could not be drawn"
          description="The summary and data table below still show the figures."
          className="h-full justify-center py-6"
        />
      );
    }
    return this.props.children;
  }
}
