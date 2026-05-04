import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [mode, setMode]       = useState("signin"); // "signin" | "signup" | "reset"
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [message, setMessage] = useState(null);

  // Apply rose theme on auth screen
  useEffect(() => {
    document.documentElement.style.setProperty("--app-bg", "linear-gradient(135deg,#fdf2f8 0%,#fce7f3 60%,#fbcfe8 100%)");
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  const submit = async e => {
    e.preventDefault();
    if (!email.trim()) return;
    if (mode !== "reset" && !password.trim()) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account, then sign in.");
    } else if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setError(error.message);
      else setMessage("Password reset email sent. Check your inbox.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--app-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 380,
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(20px)",
        borderRadius: 20,
        border: "1px solid rgba(212,83,126,0.15)",
        padding: "2.5rem 2rem",
        boxShadow: "0 8px 40px rgba(212,83,126,0.12)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 56, height: 56,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <svg width="56" height="56" viewBox="0 0 32 32">
              <defs>
                <linearGradient id="authLogo" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#D4537E"/>
                  <stop offset="100%" stopColor="#9B8EC4"/>
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="8" fill="url(#authLogo)"/>
              <ellipse cx="16" cy="16" rx="11" ry="4.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeOpacity="0.55" transform="rotate(-28 16 16)"/>
              <circle cx="16" cy="16" r="4.2" fill="#fff"/>
              <circle cx="25" cy="11.5" r="1.9" fill="#fff"/>
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a2e", letterSpacing: -0.3 }}>Orbit</h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa", letterSpacing: 1.5, textTransform: "uppercase" }}>your life, in one place</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
          </p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 12px", borderRadius: 10,
                border: "1px solid rgba(212,83,126,0.25)",
                background: "rgba(255,255,255,0.8)",
                fontSize: 14, color: "#1a1a2e",
                outline: "none",
              }}
            />
          </div>

          {mode !== "reset" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px", borderRadius: 10,
                  border: "1px solid rgba(212,83,126,0.25)",
                  background: "rgba(255,255,255,0.8)",
                  fontSize: 14, color: "#1a1a2e",
                  outline: "none",
                }}
              />
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => { setMode("reset"); setError(null); setMessage(null); }}
                  style={{ background: "none", border: "none", color: "#D4537E", fontSize: 11, cursor: "pointer", marginTop: 4, padding: 0, float: "right" }}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          {error && (
            <p style={{ margin: 0, fontSize: 12, color: "#D4537E", background: "rgba(212,83,126,0.08)", padding: "8px 12px", borderRadius: 8 }}>
              {error}
            </p>
          )}
          {message && (
            <p style={{ margin: 0, fontSize: 12, color: "#6BAA84", background: "rgba(107,170,132,0.1)", padding: "8px 12px", borderRadius: 8 }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "11px", borderRadius: 10,
              background: loading ? "rgba(212,83,126,0.5)" : "linear-gradient(135deg,#D4537E,#9B8EC4)",
              color: "white", border: "none", fontSize: 14, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "..." : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: 13, color: "#888" }}>
          {mode === "reset" ? "Remember your password? " : mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setMode(m => m === "signup" ? "signin" : m === "reset" ? "signin" : "signup"); setError(null); setMessage(null); }}
            style={{ background: "none", border: "none", color: "#D4537E", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
