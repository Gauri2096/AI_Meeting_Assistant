"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  publicOnly?: boolean;
}

export default function ProtectedRoute({ children, publicOnly = false }: ProtectedRouteProps) {
  const { loading, authenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (publicOnly && authenticated) {
      router.push("/dashboard");
    } else if (!publicOnly && !authenticated) {
      router.push("/");
    }
  }, [loading, authenticated, publicOnly, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground font-sans transition-colors duration-150">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
          <p className="text-sm text-muted-text font-semibold tracking-wide">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (publicOnly && authenticated) {
    return null;
  }
  if (!publicOnly && !authenticated) {
    return null;
  }

  return <>{children}</>;
}
