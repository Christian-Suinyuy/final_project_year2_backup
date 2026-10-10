"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Store, ArrowRight, Sparkles } from 'lucide-react';

const onboardingSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  businessEmail: z.string().email("Valid business email is required"),
  industry: z.string().min(2, "Industry is required"),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
  });

  const onSubmit = async (data: OnboardingValues) => {
    setSubmitError("");
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        await fetch('/api/auth/session', { cache: 'no-store' });
        router.replace('/dashboard');
        router.refresh();
      } else {
        const err = await res.json();
        setSubmitError(err.message || "We couldn't create your shop. Please try again.");
      }
    } catch {
      setSubmitError("We couldn't reach the shop setup service. Check your connection and try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-slate-100"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-6">
            <Store size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Welcome to the future <br />
            <span className="text-indigo-600">of commerce.</span>
          </h1>
          <p className="text-slate-500 text-lg">
            Let&apos;s set up your shop so your AI assistant can start selling.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="group">
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1 transition-colors group-focus-within:text-indigo-600">
              Business Name
            </label>
            <input
              {...register('businessName')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
              placeholder="e.g. Luxe Electronics"
            />
            {errors.businessName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.businessName.message}</p>}
          </div>

          <div className="group">
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1 transition-colors group-focus-within:text-indigo-600">
              Business Email
            </label>
            <input
              {...register('businessEmail')}
              type="email"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
              placeholder="hello@business.com"
            />
            {errors.businessEmail && <p className="text-red-500 text-xs mt-1 ml-1">{errors.businessEmail.message}</p>}
          </div>

          <div className="group">
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1 transition-colors group-focus-within:text-indigo-600">
              Industry / Niche
            </label>
            <input
              {...register('industry')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
              placeholder="e.g. Consumer Electronics"
            />
            {errors.industry && <p className="text-red-500 text-xs mt-1 ml-1">{errors.industry.message}</p>}
          </div>
          {submitError && <p role="alert" className="text-red-600 text-sm rounded-lg bg-red-50 p-3">{submitError}</p>}

          <motion.button
            whileHover={{ scale: 1.01, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:bg-indigo-400"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating your shop...</span>
              </div>
            ) : (
              <>
                <span>Create My Shop</span>
                <ArrowRight size={20} />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Sparkles size={16} className="text-indigo-400" />
          <span>Powered by Gemini AI Commerce</span>
        </div>
      </motion.div>
    </div>
  );
}
