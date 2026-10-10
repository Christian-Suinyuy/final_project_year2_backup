"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, CheckCircle2, LoaderCircle, MessageCircle, ShieldCheck } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
      if (result?.error) throw new Error("That email and password don’t match. Check them and try again.");
      window.location.assign(result?.url ?? "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="auth-visual-inner">
          <Link href="/" className="brand auth-brand" aria-label="Relay home">
            <span className="brand-mark"><MessageCircle size={17} /></span>
            relay<span className="brand-period">.</span>
          </Link>

          <div className="auth-copy-wrap">
            <div className="eyebrow auth-kicker"><span className="eyebrow-dot" />YOUR SHOP, IN EVERY CHAT</div>
            <h1>Turn every customer message into a sales opportunity.</h1>
            <p>
              Your shop, product knowledge, and customer conversations stay connected in one calmer, smarter workspace.
            </p>
          </div>

          <div className="auth-proof-list">
            <span><CheckCircle2 size={15} /> Live product guidance</span>
            <span><ShieldCheck size={15} /> Secure business data</span>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-heading">
            <p className="eyebrow-small">WELCOME BACK</p>
            <h2>Sign in to Relay</h2>
            <p>Pick up right where your shop left off.</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            <label className="auth-field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@yourshop.com"
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? <LoaderCircle size={15} className="spin" /> : <ArrowRight size={15} />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="auth-cta">
            New to Relay? <Link href="/auth/signup">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
