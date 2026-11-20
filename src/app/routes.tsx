/* oxlint-disable react/only-export-components */
import React, { Suspense, lazy, useEffect } from "react";
import { Navigate, createBrowserRouter, useRouteError } from "react-router-dom";
import { RootLayout } from "../components/layout/RootLayout";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/Button";

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const module = await factory();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("juro_chunk_retry");
      }
      return module;
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");

      if (isChunkError && typeof window !== "undefined") {
        const hasReloaded = sessionStorage.getItem("juro_chunk_retry") === "true";
        if (!hasReloaded) {
          sessionStorage.setItem("juro_chunk_retry", "true");
          window.location.reload();
          return { default: (() => null) as unknown as T };
        }
      }
      throw err;
    }
  });
}

const HomePage = lazyWithRetry(() =>
  import("../pages/HomePage").then((m) => ({ default: m.HomePage }))
);
const ShopPage = lazyWithRetry(() =>
  import("../pages/ShopPage").then((m) => ({ default: m.ShopPage }))
);
const MiningPage = lazyWithRetry(() =>
  import("../pages/MiningPage").then((m) => ({ default: m.MiningPage }))
);
const EvolutionPage = lazyWithRetry(() =>
  import("../pages/EvolutionPage").then((m) => ({ default: m.EvolutionPage }))
);
const SettingsPage = lazyWithRetry(() =>
  import("../pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);

const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
    <div className="w-5 h-5 bg-juro-orange border-2 border-charcoal animate-bounce shadow-[2px_2px_0px_#171717]" />
    <span className="pixel-text text-[10px] text-charcoal dark:text-neutral-200 uppercase tracking-wider">
      Memuat Halaman...
    </span>
  </div>
);

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const errorMessage = error instanceof Error ? error.message : String(error);

  const isChunkError =
    errorMessage.includes("Failed to fetch dynamically imported module") ||
    errorMessage.includes("Importing a module script failed") ||
    errorMessage.includes("error loading dynamically imported module");

  useEffect(() => {
    if (isChunkError && typeof window !== "undefined") {
      const hasRetried = sessionStorage.getItem("juro_chunk_retry") === "true";
      if (!hasRetried) {
        sessionStorage.setItem("juro_chunk_retry", "true");
        window.location.reload();
      }
    }
  }, [isChunkError]);

  return (
    <div className="min-h-screen bg-sand dark:bg-charcoal flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 border-2 border-charcoal dark:border-neutral-700 shadow-[4px_4px_0px_#171717] p-6 text-center space-y-4">
        <div className="w-12 h-12 mx-auto bg-amber-100 dark:bg-amber-950/40 border-2 border-charcoal flex items-center justify-center">
          <AlertTriangle className="text-amber-600 dark:text-amber-400" size={24} />
        </div>
        <h1 className="pixel-text text-sm font-bold text-charcoal dark:text-white uppercase tracking-wider">
          {isChunkError ? "Pembaruan Versi Baru" : "Terjadi Kendala Memuat"}
        </h1>
        <p className="pixel-text text-[9.5px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {isChunkError
            ? "Aplikasi baru saja diperbarui ke versi terbaru. Halaman akan dimuat ulang secara otomatis."
            : "Halaman ini mengalami kendala sementara saat dimuat."}
        </p>
        <div className="pt-2">
          <Button
            label="Muat Ulang Halaman"
            icon={RotateCcw}
            variant="primary"
            size="md"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("juro_chunk_retry");
                window.location.reload();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: withSuspense(HomePage),
      },
      {
        path: "shop",
        element: withSuspense(ShopPage),
      },
      {
        path: "mine",
        element: withSuspense(MiningPage),
      },
      {
        path: "collection",
        element: <Navigate to="/shop?tab=skins" replace />,
      },
      {
        path: "evolution",
        element: withSuspense(EvolutionPage),
      },
      {
        path: "settings",
        element: withSuspense(SettingsPage),
      },
      {
        path: "*",
        element: withSuspense(HomePage),
      },
    ],
  },
]);
