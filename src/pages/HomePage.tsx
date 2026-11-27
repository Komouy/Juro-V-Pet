import React, { useEffect } from "react";
import { PetViewport } from "../components/pet/PetViewport";
import { usePetStore } from "../stores/petStore";

export interface HomePageProps {
  isPaused?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ isPaused = false }) => {
  const { recalculateFromTimestamp } = usePetStore();

  useEffect(() => {
    // Hitung status pet saat halaman pertama kali dimuat (berdasarkan timestamp terakhir)
    recalculateFromTimestamp();
  }, [recalculateFromTimestamp]);

  return (
    <main className="flex-1 min-h-0 w-full flex flex-col">
      <PetViewport isPaused={isPaused} />
    </main>
  );
};
