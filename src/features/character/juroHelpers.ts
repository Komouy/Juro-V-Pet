/**
 * Menentukan apakah daun pelindung hujan perlu ditampilkan di atas kepala Juro.
 * Daun pelindung hujan hanya muncul saat hujan DAN Juro tidak sedang mengenakan topi apapun.
 */
export function shouldShowRainLeaf(isRaining: boolean, activeHat?: string | null): boolean {
  if (!isRaining) return false;
  if (!activeHat || activeHat === "hat-none") {
    return true;
  }
  return false;
}
