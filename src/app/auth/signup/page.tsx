"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoaderCircle, MessageCircle, Sparkles } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setSubmitError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        router.push("/auth/signin");
      } else {
        const err = await res.json();
        setSubmitError(err.message || "We couldn't create your account. Please try again.");
      }
    } catch {
      setSubmitError("We couldn't reach the account service. Check your connection and try again.");
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
            <div className="eyebrow auth-kicker"><span className="eyebrow-dot" />START SELLING IN CHAT</div>
            <h1>Open your storefront in less than five minutes.</h1>
            <p>
              Everything your shop needs — products, AI guidance, and customer conversations — stays in one polished workspace.
            </p>
          </div>

          <div className="auth-proof-list">
            <span><Sparkles size={15} /> AI-powered recommendations</span>
            <span><MessageCircle size={15} /> WhatsApp-ready workflows</span>
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <div className="auth-panel auth-panel-form">
          <div className="auth-heading">
            <p className="eyebrow-small">CREATE ACCOUNT</p>
            <h2>Set up your shop</h2>
            <p>Start with a secure account, then build your storefront.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <label className="auth-field">
              <span>Full name</span>
              <input {...register("name")} placeholder="Jane Doe" />
            </label>
            {errors.name && <p className="auth-field-error">{errors.name.message}</p>}

            <label className="auth-field">
              <span>Email address</span>
              <input {...register("email")} type="email" placeholder="jane@example.com" />
            </label>
            {errors.email && <p className="auth-field-error">{errors.email.message}</p>}

            <label className="auth-field">
              <span>Password</span>
              <input {...register("password")} type="password" placeholder="At least 8 characters" />
            </label>
            {errors.password && <p className="auth-field-error">{errors.password.message}</p>}

            {submitError && <div className="auth-error">{submitError}</div>}

            <button type="submit" className="auth-button" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle size={15} className="spin" /> : <ArrowRight size={15} />}
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-cta">
            Already have an account? <Link href="/auth/signin">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
