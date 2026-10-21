import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, LogIn, Sparkles, UserRound } from "lucide-react";
import { checkCredentials } from "@/lib/bank/data";
import { track } from "@/lib/bank/monitor";
import { Logo } from "./Layout";
import { Register } from "./Register";

const DEMO_USER = "demo";
const DEMO_PASS = "demo-pass";

/** onSuccess gets the first name when a new account was just created, so the welcome tour can greet the user. */
export function Login({ onSuccess }: { onSuccess: (newFirstName?: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  // Changes on every wrong attempt, so the shake plays again each time.
  const [attempt, setAttempt] = useState(0);
  const [registering, setRegistering] = useState(false);

  if (registering) {
    return (
      <div className="grid min-h-screen place-items-center px-4 py-10">
        <Register onCancel={() => setRegistering(false)} onDone={onSuccess} />
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (checkCredentials(username, password)) {
      track("login", `Signed in as "${username.trim()}"`);
      onSuccess();
    } else {
      // Never record the password.
      track("login_failed", `Failed sign-in for "${username.trim() || "(empty)"}"`);
      setError("Wrong username or password.");
      setAttempt((n) => n + 1);
      setPassword("");
    }
  };

  const useDemo = () => {
    setUsername(DEMO_USER);
    setPassword(DEMO_PASS);
    setError("");
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      {/* Soft colour behind the card, so the first screen has the same mood as the app. */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-gradient opacity-30 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-sm space-y-6">
        <div className="page-fade text-center">
          <div className="mx-auto mb-4 flex justify-center"><Logo /></div>
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your demo bank. Mock data only, no real money.</p>
        </div>

        <form
          key={attempt}
          onSubmit={submit}
          className={`glass page-fade space-y-5 p-6 ${attempt > 0 && error ? "shake" : ""}`}
          aria-labelledby="login-title"
        >
          <h2 id="login-title" className="sr-only">Sign in</h2>

          <label className="block space-y-1.5 text-sm font-medium">
            <span>Username</span>
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                className="field pl-9"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
              />
            </span>
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            <span>Password</span>
            <span className="relative block">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                className="field pl-9 pr-11"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </span>
          </label>

          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

          <button type="submit" className="btn btn-primary w-full py-3">
            <LogIn className="h-4 w-4" aria-hidden /> Sign in
          </button>

          <button type="button" onClick={useDemo} className="btn btn-ghost w-full">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden /> Fill in the demo login
          </button>
        </form>

        <div className="page-fade space-y-3 text-center">
          <p className="text-sm text-muted-foreground">New here?</p>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setRegistering(true)}>Create an account</button>
          <p className="text-xs text-muted-foreground">
            Demo credentials: <strong className="text-foreground">{DEMO_USER}</strong> / <strong className="text-foreground">{DEMO_PASS}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
