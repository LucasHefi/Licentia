"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";
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
    const result = await authClient.signOut();
    if (result.error) {
      setNotice("Odhlášení se nepodařilo.");
      return;
    }
    window.location.assign("/");
  }

  async function addPasskey() {
    setNotice("Potvrďte passkey v zařízení…");
    const result = await authClient.passkey.addPasskey({ name: "Licentia passkey" });
    setNotice(result?.error ? "Passkey se nepodařilo přidat." : "Passkey je přidaný.");
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button className="account-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open}>
        <span>{initials}</span><i>{account.name}</i><b aria-hidden="true">⌄</b>
      </button>
      {open && (
        <div className="account-popover" role="menu">
          <div className="account-summary"><span>{initials}</span><div><strong>{account.name}</strong><small>{account.email}</small><em>{account.providerLabel}</em></div></div>
          {account.authSource === "licentia" && <button type="button" role="menuitem" onClick={addPasskey}>⌁ Přidat passkey</button>}
          {account.authSource === "chatgpt" ? (
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
