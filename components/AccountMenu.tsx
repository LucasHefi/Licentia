"use client";

import { useEffect, useRef, useState } from "react";
import type { AppIdentity } from "./types";

export default function AccountMenu({ account }: { account: AppIdentity }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  const initials = account.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("cs") || "U";

  async function signOut() {
    setNotice("Odhlašuji…");
    try {
      const { authClient } = await import("../lib/auth-client");
      const result = await authClient.signOut();
      if (result.error) {
        setNotice("Odhlášení se nepodařilo.");
        return;
      }
    } catch {
      setNotice("Odhlášení se nepodařilo.");
      return;
    }
    window.location.assign("/");
  }

  async function portableSignOut() {
    if (!account.signOutPath || !account.csrfToken) return;
    setNotice("Odhlašuji…");
    try {
      const response = await fetch(account.signOutPath, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": account.csrfToken } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      window.location.assign("./");
    } catch {
      setNotice("Odhlášení se nepodařilo.");
    }
  }

  async function addPasskey() {
    setNotice("Potvrďte passkey v zařízení…");
    try {
      const { authClient } = await import("../lib/auth-client");
      const result = await authClient.passkey.addPasskey({ name: "Licentia passkey" });
      setNotice(result?.error ? "Passkey se nepodařilo přidat." : "Passkey je přidaný.");
    } catch {
      setNotice("Passkey se nepodařilo přidat.");
    }
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button className="account-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open}>
        <span>{initials}</span><i>{account.name}</i><b aria-hidden="true">⌄</b>
      </button>
      {open && (
        <div className="account-popover" role="menu">
          <div className="account-summary"><span>{initials}</span><div><strong>{account.name}</strong><small>{account.email}</small><em>{account.providerLabel}</em></div></div>
          {account.canAddPasskey && <button type="button" role="menuitem" onClick={addPasskey}>⌁ Přidat passkey</button>}
          {account.signOutPath && account.signOutMethod === "POST" ? (
            <button type="button" role="menuitem" className="danger" onClick={portableSignOut}>Odhlásit se</button>
          ) : account.signOutPath ? (
            <a role="menuitem" className="danger" href={account.signOutPath}>Odhlásit se</a>
          ) : (
            <button type="button" role="menuitem" className="danger" onClick={signOut}>Odhlásit se</button>
          )}
          {notice && <p role="status">{notice}</p>}
        </div>
      )}
    </div>
  );
}
