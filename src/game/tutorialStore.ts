const STORAGE_KEY = "ld59:tutorial-completed";
const RESET_PARAM = "tutorial";

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function isTutorialCompleted(): boolean {
  return safeStorage()?.getItem(STORAGE_KEY) === "1";
}

export function markTutorialCompleted(): void {
  safeStorage()?.setItem(STORAGE_KEY, "1");
}

export function resetTutorial(): void {
  safeStorage()?.removeItem(STORAGE_KEY);
}

export function applyUrlResetFlag(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (params.get(RESET_PARAM) === "1") resetTutorial();
}
