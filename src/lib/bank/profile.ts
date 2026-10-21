// The name shown in the profile. Sign-up saves the name the user typed; the default is the demo user.

const KEY = "demo-bank:name";
export const DEFAULT_NAME = "Demo User";

export function getProfileName(): string {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved && saved.trim()) return saved;
  } catch {
    // Storage blocked: fall back to the default.
  }
  return DEFAULT_NAME;
}

export function setProfileName(name: string): void {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return;
  try {
    window.localStorage.setItem(KEY, clean);
  } catch {
    // Storage blocked: the name lasts for this visit only.
  }
}

/** "Jane Doe" -> "@jane-doe" */
export const handleFor = (name: string) => "@" + name.trim().toLowerCase().replace(/\s+/g, "-");
