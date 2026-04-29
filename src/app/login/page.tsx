import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setSession, verifyPassword } from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.password)) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  setSession({
    id: user.id,
    role: user.role,
    roles: user.roles?.length ? user.roles : [user.role],
    email: user.email,
  });

  if (user.mustChangePassword) {
    redirect(`/change-password?next=${encodeURIComponent(next)}`);
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string };
}) {
  return (
    <div className="min-h-screen bg-[#0e0f14] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-[#13151e] border border-[#2a2d3e] rounded-2xl p-8 shadow-xl">
        <div className="mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20 flex items-center justify-center text-sm font-bold text-white mb-4">
            A
          </div>

          <h1 className="text-2xl font-bold text-white">Annotation Studio</h1>
          <p className="text-[11px] text-emerald-400 tracking-wider uppercase mt-1">
            Powered By <span className="font-semibold">FABRIC</span>
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Sign in to access your annotation workspace.
          </p>
        </div>

        {searchParams?.error === "invalid" && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            Email or password is incorrect.
          </div>
        )}

        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="next" value={searchParams?.next || "/dashboard"} />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg bg-[#0e0f14] border border-[#2a2d3e] px-3 py-2 text-white outline-none focus:border-emerald-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-lg bg-[#0e0f14] border border-[#2a2d3e] px-3 py-2 text-white outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <button className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 text-white font-medium py-2.5 transition-all">
            Sign in
          </button>
        </form>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 text-xs text-gray-500 border-t border-[#2a2d3e] pt-4">
            Default admin after seed:{" "}
            <span className="text-gray-300">admin@fabric.local</span> /{" "}
            <span className="text-gray-300">admin123</span>
          </div>
        )}
      </div>
    </div>
  );
}
