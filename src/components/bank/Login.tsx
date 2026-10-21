import { useState, type FormEvent } from "react";
import { checkCredentials } from "@/lib/bank/data";
import { track } from "@/lib/bank/monitor";
import { Logo } from "./Layout";
import { Register } from "./Register";

/** onSuccess gets the first name when a new account was just created, so the welcome tour can greet the user. */
export function Login({ onSuccess }: { onSuccess: (newFirstName?: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
      setPassword("");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <form onSubmit={submit} className="glass page-fade w-full max-w-sm space-y-5 p-7" aria-labelledby="login-title">
        <Logo />
        <div>
          <h1 id="login-title" className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">A demo bank with mock data only. No real money.</p>
        </div>
        <label className="block space-y-1.5 text-sm font-medium">
          <span>Username</span>
          <input className="field" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          <span>Password</span>
          <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
        )}
        <button type="submit" className="btn btn-primary w-full">Sign in</button>
        <button type="button" className="btn btn-ghost w-full" onClick={() => setRegistering(true)}>Create an account</button>
        <p className="text-center text-xs text-muted-foreground">
          Demo credentials: <strong className="text-foreground">demo</strong> / <strong className="text-foreground">demo-pass</strong>
        </p>
      </form>
    </div>
  );
}
