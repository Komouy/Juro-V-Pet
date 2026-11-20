import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const CollectionPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/shop?tab=skins", { replace: true });
  }, [navigate]);

  return null;
};
