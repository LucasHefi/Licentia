import { FormEvent, useEffect, useState } from "react";
import LicenseStudio from "./LicenseStudio";
import type { AppIdentity } from "./types";

type SessionResponse = { user: AppIdentity | null; csrfToken?: string; providers?: { google?: boolean; github?: boolean } };

export default function PortableApp() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("./api/auth/session", { credentials: "include" })
      .then(response => response.ok ? response.json() as Promise<SessionResponse> : Promise.reject())
      .then(setSession)
      .catch(() => setSession({ user: null }));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`./api/auth/${mode === "signin" ? "login" : "register"}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": session?.csrfToken ?? "" }, body: JSON.stringify(Object.fromEntries(form)) });
    const value = await response.json().catch(() => ({} as { error?: string })) as { error?: string };
    if (!response.ok) { setError(value.error ?? "Přihlášení se nepodařilo."); setBusy(false); return; }
    window.location.reload();
  }

  if (!session) return <main className="portable-loading">Načítám Licentii…</main>;
  if (anonymous) return <LicenseStudio />;
  if (session.user) return <LicenseStudio account={{ ...session.user, authSource: "licentia", providerLabel: session.user.providerLabel || "Apache účet", signOutPath: "./api/auth/logout", signOutMethod: "POST", csrfToken: session.csrfToken }} />;

  return <main className="auth-page">
    <section className="auth-story" aria-label="O aplikaci Licentia"><div className="auth-brand"><span className="brand-mark">L</span><span>Licentia</span></div><div className="auth-story-copy"><span className="section-kicker light">Přenosný licenční pracovní prostor</span><h1>Správná licence.<br />Bez hádání.</h1><p>Úplný katalog SPDX, průvodce, API i MCP na vašem vlastním Apache hostingu.</p><div className="auth-proof"><span>727 licencí</span><span>84 výjimek</span><span>REST + MCP</span></div></div><p className="auth-legal">Data účtu zůstávají na vašem hostingu. Licentia neposkytuje právní radu.</p></section>
    <section className="auth-panel"><div className="auth-card"><div className="auth-heading"><span className="section-kicker">Přihlášení</span><h2>Pokračujte do Licentie</h2><p>Použijte účet uložený na tomto hostingu.</p></div>
      <div className="auth-provider-list"><a className={`auth-provider ${session.providers?.google ? "" : "disabled"}`} href={session.providers?.google ? "./api/auth/oauth/google" : undefined}><span className="provider-icon google">G</span><strong>Pokračovat přes Google</strong>{!session.providers?.google && <i>čeká na klíče</i>}</a><a className={`auth-provider ${session.providers?.github ? "" : "disabled"}`} href={session.providers?.github ? "./api/auth/oauth/github" : undefined}><span className="provider-icon github">GH</span><strong>Pokračovat přes GitHub</strong>{!session.providers?.github && <i>čeká na klíče</i>}</a></div>
      <div className="auth-divider"><span>nebo e-mailem</span></div><div className="auth-mode" role="tablist"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Přihlásit</button><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Vytvořit účet</button></div>
       <form className="auth-form" onSubmit={submit}>{mode === "signup" && <label>Jméno<input name="name" autoComplete="name" required /></label>}<label>E-mail<input type="email" name="email" autoComplete="email" required /></label><label>Heslo<input type="password" name="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={12} required /></label>{error && <p className="auth-error">{error}</p>}<button className="auth-submit" disabled={busy}>{busy ? "Pracuji…" : mode === "signin" ? "Přihlásit se" : "Vytvořit účet"}</button></form>
       <p className="auth-terms">ChatGPT přihlášení je dostupné pouze na OpenAI Sites. Google a GitHub aktivujete vlastními OAuth klíči.</p>
       <button type="button" className="auth-anonymous" onClick={() => setAnonymous(true)}>Pokračovat bez registrace a přihlášení</button>
     </div></section>
  </main>;
}
