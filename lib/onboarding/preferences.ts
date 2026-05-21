const KEY = "migiude-onboarding-complete";

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY) === "true";
}

export function setOnboardingComplete(): void {
  localStorage.setItem(KEY, "true");
  window.dispatchEvent(new Event("migiude-onboarding"));
}

export function subscribeOnboarding(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener("migiude-onboarding", handler);
  return () => window.removeEventListener("migiude-onboarding", handler);
}
