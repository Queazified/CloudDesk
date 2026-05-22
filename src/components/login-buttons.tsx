"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { mockUsers } from "@/lib/constants";

export function LoginButtons({
  providers,
}: {
  providers: Array<{ id: string; name: string; kind: "mock" | "sso" }>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleMockLogin(email: string) {
    setBusyId(email);
    try {
      const result = await signIn("credentials", {
        email,
        callbackUrl: "/dashboard",
      });
      // signIn() with redirect: true (default) behaves as follows:
      // - If login succeeds: redirects and doesn't return (page unloads)
      // - If login fails: returns an object with error/status info
      // Therefore, if result is truthy, login failed and we should reset busy state
      if (result) {
        setBusyId(null);
      }
    } catch (error) {
      console.error("Mock login error:", error);
      setBusyId(null);
    }
  }

  async function handleSsoLogin(providerId: string) {
    setBusyId(providerId);
    try {
      const result = await signIn(providerId, { callbackUrl: "/dashboard" });
      // signIn() with redirect: true (default) behaves as follows:
      // - If login succeeds: redirects and doesn't return (page unloads)
      // - If login fails: returns an object with error/status info
      // Therefore, if result is truthy, login failed and we should reset busy state
      if (result) {
        setBusyId(null);
      }
    } catch (error) {
      console.error("SSO login error:", error);
      setBusyId(null);
    }
  }

  const hasMock = providers.some((provider) => provider.kind === "mock");
  const ssoProviders = providers.filter((provider) => provider.kind === "sso");

  return (
    <div className="space-y-4">
      {hasMock ? (
        <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div>
            <h2 className="text-sm font-semibold text-blue-900">Mock login for local development</h2>
            <p className="mt-1 text-sm text-blue-800">
              Use the seeded test users to explore the standard user and admin experiences.
            </p>
          </div>
          <div className="grid gap-3">
            {mockUsers.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => handleMockLogin(user.email)}
                disabled={busyId === user.email}
                className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="block text-sm font-semibold text-slate-900">{user.label}</span>
                <span className="mt-1 block text-sm text-slate-600">{user.helper}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {ssoProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleSsoLogin(provider.id)}
            disabled={busyId === provider.id}
            className="flex w-full items-center justify-between rounded-xl border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>Continue with {provider.name}</span>
            <span aria-hidden>→</span>
          </button>
        ))}
      </div>

      {providers.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No login providers are configured yet. Enable mock login or add an SSO provider in your environment settings.
        </div>
      ) : null}
    </div>
  );
}
