"use client";

import React, { useState, useEffect } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import Auth from "./Auth";
import App from "./App";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: "sans-serif", padding: "2rem", color: "#c00" }}>
          <h2>App error</h2>
          <pre style={{ fontSize: 13, whiteSpace: "pre-wrap", background: "#fef2f2", padding: "1rem", borderRadius: 8 }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function Session() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="loading">loading your space...</div>;
  if (!session) return <Auth />;
  return <App user={session.user} />;
}

export default function Root() {
  if (!supabaseConfigured) {
    return (
      <div style={{ fontFamily: "sans-serif", padding: "2rem", color: "#c00" }}>
        <h2>Missing Supabase config</h2>
        <p>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          (in <code>.env.local</code> or your Vercel project settings), then redeploy / restart.
        </p>
      </div>
    );
  }
  return (
    <ErrorBoundary>
      <Session />
    </ErrorBoundary>
  );
}
