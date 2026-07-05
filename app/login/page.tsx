"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cssx } from "@/components/ui";

export default function LoginPage() {
  const { configured, signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    if (!email.trim() || !password) {
      setErr("Enter your email and password.");
      return;
    }
    setBusy(true);
    if (mode === "signin") {
      const { error } = await signIn(email.trim(), password);
      setBusy(false);
      if (error) setErr(error);
      else router.push("/");
    } else {
      const { error, needsConfirm } = await signUp(email.trim(), password);
      setBusy(false);
      if (error) setErr(error);
      else if (needsConfirm) setMsg("Check your email to confirm your account, then sign in.");
      else router.push("/");
    }
  };

  return (
    <div
      className="sem light"
      style={cssx(
        "min-height:100vh;background:var(--bg);color:var(--ink);font-family:'Instrument Sans',ui-sans-serif,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px"
      )}
    >
      <div style={cssx("width:100%;max-width:400px")}>
        <div style={cssx("display:flex;align-items:center;gap:12px;margin-bottom:22px")}>
          <div style={cssx("width:38px;height:38px;border-radius:11px;background:var(--acc);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-family:'Bricolage Grotesque',sans-serif;font-size:20px")}>
            S
          </div>
          <div>
            <div style={cssx("font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px;line-height:1.05")}>Seminary Hub</div>
            <div style={cssx("color:var(--mut);font-size:12.5px;font-weight:600")}>Sign in to your class</div>
          </div>
        </div>

        {!configured ? (
          <div style={cssx("background:var(--card);border:1px solid var(--line);border-radius:var(--rad);padding:22px")}>
            <div style={cssx("font-weight:700;font-size:15px;margin-bottom:6px")}>Demo mode</div>
            <div style={cssx("color:var(--mut);font-size:13.5px;line-height:1.55;margin-bottom:16px")}>
              Supabase isn&apos;t configured yet, so sign-in is disabled. Explore the seeded demo — your changes save to this device.
            </div>
            <button onClick={() => router.push("/")} style={cssx("width:100%;background:var(--acc);color:#fff;border:none;border-radius:999px;padding:12px;font-weight:700;font-size:14px;cursor:pointer")}>
              Enter the demo →
            </button>
          </div>
        ) : (
          <div style={cssx("background:var(--card);border:1px solid var(--line);border-radius:var(--rad);padding:22px")}>
            <div style={cssx("display:flex;gap:6px;margin-bottom:16px")}>
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setErr(null); setMsg(null); }}
                  style={cssx(
                    `flex:1;background:${mode === m ? "var(--acc)" : "var(--bg)"};color:${mode === m ? "#fff" : "var(--mut)"};border:1px solid ${mode === m ? "var(--acc)" : "var(--line)"};border-radius:999px;padding:9px;font-weight:700;font-size:13px;cursor:pointer`
                  )}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              style={cssx("width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px 13px;font-size:14px;color:var(--ink);margin-bottom:9px")}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              style={cssx("width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px 13px;font-size:14px;color:var(--ink);margin-bottom:14px")}
            />
            {err && <div style={cssx("color:var(--bad);font-size:13px;margin-bottom:12px")}>{err}</div>}
            {msg && <div style={cssx("color:var(--acc);font-size:13px;margin-bottom:12px")}>{msg}</div>}
            <button
              onClick={submit}
              disabled={busy}
              style={cssx(`width:100%;background:var(--acc);color:#fff;border:none;border-radius:999px;padding:12px;font-weight:700;font-size:14px;cursor:${busy ? "default" : "pointer"};opacity:${busy ? 0.7 : 1}`)}
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
