/** Returns why a passcode is rejected, or null when it is fine. */
export function passcodeProblem(p: string): string | null {
  if (!/^\d{6}$/.test(p)) return "Enter all 6 digits.";
  if (/^(\d)\1{5}$/.test(p)) return "Too simple: avoid one repeated digit.";
  const d = p.split("").map(Number);
  const step = (d[1] ?? 0) - (d[0] ?? 0);
  if ((step === 1 || step === -1) && d.every((x, i) => i === 0 || x - (d[i - 1] ?? 0) === step)) {
    return "Too simple: avoid sequences like 123456.";
  }
  return null;
}
