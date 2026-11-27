import React from "react";
import { RotateCcw } from "lucide-react";

interface SceneErrorBoundaryProps {
  children: React.ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary isolating the WebGL 3D Canvas so a renderer or Three.js error
 * shows a friendly 2D fallback with a recovery button instead of crashing the app.
 */
export class SceneErrorBoundary extends React.Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  constructor(props: SceneErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("Kesalahan tampilan 3D Juro Living:", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center p-6 bg-amber-50 dark:bg-neutral-900">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-800 dark:border-neutral-700 shadow-lg p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 dark:bg-neutral-800 border-2 border-neutral-800 dark:border-neutral-700 flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 16 16" shapeRendering="crispEdges">
                <rect x="4" y="4" width="8" height="8" fill="#F97316" />
                <rect x="3" y="6" width="10" height="5" fill="#F97316" />
                <rect x="5" y="3" width="6" height="1" fill="#F97316" />
                <rect x="5" y="5" width="2" height="2" fill="#FDBA74" />
                <rect x="5" y="8" width="2" height="2" fill="#171717" />
                <rect x="9" y="8" width="2" height="2" fill="#171717" />
                <rect x="5" y="8" width="1" height="1" fill="#FFFFFF" />
                <rect x="9" y="8" width="1" height="1" fill="#FFFFFF" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Tampilan 3D Mengalami Gangguan
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Sistem grafis WebGL tidak dapat dimuat sementara. Data Juro tetap aman dan Anda dapat mencoba memuat ulang layar.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-juro-orange text-white text-xs font-semibold hover:bg-orange-600 active:scale-[0.98] cursor-pointer transition-all"
            >
              <RotateCcw size={14} strokeWidth={2} />
              Muat Ulang Tampilan 3D
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
