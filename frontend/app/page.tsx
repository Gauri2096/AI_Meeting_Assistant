"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api/meetings";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const [bankEmpId, setBankEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refreshUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankEmpId.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = await loginUser(bankEmpId.trim(), password);

      console.log("LOGIN DATA", data);
      console.log("TOKEN", data.access_token);

      setToken(data.access_token);

      console.log(
        "LOCAL STORAGE",
        localStorage.getItem("access_token")
      );
      // Refresh context user state.
      await refreshUser();
      // Redirect
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Invalid Bank Employee ID or Password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute publicOnly={true}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground font-sans transition-colors duration-150">
        <div className="w-full max-w-md rounded-2xl border border-card-border bg-card-bg p-8 shadow-xl transition-all duration-300">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-accent-primary">
              MeetIntel
            </h1>
            <p className="mt-2 text-sm text-muted-text">
              Sign in with your Bank Employee credentials.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-600 dark:text-rose-400 animate-fadeIn flex items-center space-x-2">
              <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bank Employee ID Field */}
            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1.5 uppercase tracking-wider">
                Bank Employee ID
              </label>
              <input
                type="text"
                required
                value={bankEmpId}
                onChange={(e) => setBankEmpId(e.target.value)}
                placeholder="e.g. EMP12345"
                className="w-full rounded-lg bg-background border border-card-border px-3.5 py-2.5 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-background border border-card-border px-3.5 py-2.5 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-xl bg-accent-primary py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center space-x-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Logging in...</span>
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-8 text-center border-t border-card-border pt-5">
            <p className="text-xs text-muted-text">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-bold text-accent-primary hover:underline transition-colors ml-1"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
