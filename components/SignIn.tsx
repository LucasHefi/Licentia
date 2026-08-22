"use client";

import { FormEvent, useState } from "react";
import { authClient } from "../lib/auth-client";

type Props = {
  providers: { google: boolean; github: boolean };
  chatGPTSignInPath: string;
};

function authErrorMessage(message?: string) {
  if (!message) return "Přihlášení se nepodařilo. Zkuste to prosím znovu.";
  if (/invalid.*email|email.*invalid/i.test(message)) return "Zadejte platnou e-mailovou adresu.";
  if (/password/i.test(message)) return "E-mail nebo heslo nesouhlasí. Heslo musí mít alespoň 12 znaků.";
  if (/user.*exist|already/i.test(message)) return "Účet s tímto e-mailem už existuje.";
  return message;
}

export default function SignIn({ providers, chatGPTSignInPath }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function social(provider: "google" | "github") {
    setError("");
    setBusy(provider);
    const result = await authClient.signIn.social({ provider, callbackURL: "/" });
    if (result.error) {
      setError(authErrorMessage(result.error.message));
      setBusy("");
    }
  }

  async function passkey() {
    setError("");
    setBusy("passkey");
    const result = await authClient.signIn.passkey();
    if (result?.error) {
      setError(authErrorMessage(result.error.message));
      setBusy("");
      return;
    }
    window.location.assign("/");
  }

  async function emailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy("email");

    const result = mode === "signin"
      ? await authClient.signIn.email({ email, password, callbackURL: "/" })
      : await authClient.signUp.email({ name: name.trim() || email.split("@")[0], email, password, callbackURL: "/" });

    if (result.error) {
      setError(authErrorMessage(result.error.message));
      setBusy("");
      return;
    }
    window.location.assign("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="O aplikaci Licentia">
        <div className="auth-brand" aria-label="Licentia">
          <span className="brand-mark">L</span><span>Licentia</span>
        </div>
        <div className="auth-story-copy">
          <span className="section-kicker light">Váš licenční pracovní prostor</span>
          <h1>Správná licence.<br />Bez hádání.</h1>
          <p>Prohledejte 811 SPDX položek, porovnejte povinnosti a projděte rozhodnutí krok za krokem.</p>
          <div className="auth-proof"><span>727 licencí</span><span>84 výjimek</span><span>Web + desktop</span></div>
        </div>
        <p className="auth-legal">Účet chrání vaše budoucí uložené výběry a nastavení. Licentia neposkytuje právní radu.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-heading">
            <span className="section-kicker">Přihlášení</span>
            <h2>Pokračujte do Licentie</h2>
            <p>Vyberte účet, který chcete používat pro práci v Licentii.</p>
          </div>

          <div className="auth-provider-list">
            <a className="auth-provider featured" href={chatGPTSignInPath}>
              <span className="provider-icon chatgpt">✦</span><strong>Pokračovat přes ChatGPT</strong><i>nativní</i>
            </a>
            <button className="auth-provider" type="button" onClick={() => social("google")} disabled={!providers.google || Boolean(busy)}>
              <span className="provider-icon google">G</span><strong>Pokračovat přes Google</strong>{!providers.google && <i>čeká na klíče</i>}
            </button>
            <button className="auth-provider" type="button" onClick={() => social("github")} disabled={!providers.github || Boolean(busy)}>
              <span className="provider-icon github">GH</span><strong>Pokračovat přes GitHub</strong>{!providers.github && <i>čeká na klíče</i>}
            </button>
            <button className="auth-provider" type="button" onClick={passkey} disabled={Boolean(busy)}>
              <span className="provider-icon passkey">⌁</span><strong>Přihlásit se passkey</strong>
            </button>
          </div>

          <div className="auth-divider"><span>nebo e-mailem</span></div>

          <div className="auth-mode" role="tablist" aria-label="Přihlášení nebo registrace">
            <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); }}>Přihlásit</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Vytvořit účet</button>
          </div>

          <form className="auth-form" onSubmit={emailSubmit}>
            {mode === "signup" && <label>Jméno<input name="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Jak vám máme říkat?" /></label>}
            <label>E-mail<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email username webauthn" placeholder="vy@firma.cz" required /></label>
            <label>Heslo<input type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signin" ? "current-password webauthn" : "new-password"} minLength={12} maxLength={128} placeholder="Alespoň 12 znaků" required /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={Boolean(busy)}>{busy === "email" ? "Pracuji…" : mode === "signin" ? "Přihlásit se" : "Vytvořit účet"}</button>
          </form>

          <p className="auth-terms">Pokračováním souhlasíte s použitím nezbytných cookies pro bezpečné přihlášení. OAuth tokeny jsou na serveru šifrované.</p>
        </div>
      </section>
    </main>
  );
}
