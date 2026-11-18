/* oxlint-disable react/only-export-components */
import React, { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "../components/layout/RootLayout";

const HomePage = lazy(() =>
  import("../pages/HomePage").then((m) => ({ default: m.HomePage }))
);
const ShopPage = lazy(() =>
  import("../pages/ShopPage").then((m) => ({ default: m.ShopPage }))
);
const MiningPage = lazy(() =>
  import("../pages/MiningPage").then((m) => ({ default: m.MiningPage }))
);
const CollectionPage = lazy(() =>
  import("../pages/CollectionPage").then((m) => ({ default: m.CollectionPage }))
);
const EvolutionPage = lazy(() =>
  import("../pages/EvolutionPage").then((m) => ({ default: m.EvolutionPage }))
);
const SettingsPage = lazy(() =>
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
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
        element: withSuspense(CollectionPage),
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
