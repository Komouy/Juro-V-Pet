import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { persistenceService } from "../services/persistenceService";

export const App: React.FC = () => {
  useEffect(() => {
    persistenceService.initialize();
  }, []);

  return <RouterProvider router={router} />;
};
