import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, hashPassword } from "@/lib/auth";

async function changePasswordAction(formData: FormData) {
  "use server";

  const user = await requireUser();

  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!password || password.length < 6 || password !== confirm) {
    redirect("/change-password?error=invalid");
  }

  const hashed = hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      mustChangePassword: false,
    },
  });

  redirect("/dashboard");
}

export default function ChangePasswordPage({ searchParams }: { searchParams?: { error?: string } }) {
  return (
    <div className="min-h-screen bg-[#0e0f14] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-[#13151e] border border-[#2a2d3e] rounded-2xl p-8">
        <h1 className="text-xl font-bold text-white mb-4">Change Password</h1>

        {searchParams?.error && (
          <div className="mb-4 text-red-400 text-sm">
            Passwords must match and be at least 6 characters
          </div>
        )}

        <form action={changePasswordAction} className="space-y-4">
          <input
            name="password"
            type="password"
            placeholder="New password"
            className="w-full p-2 bg-black border border-gray-700 text-white rounded"
          />
          <input
            name="confirm"
            type="password"
            placeholder="Confirm password"
            className="w-full p-2 bg-black border border-gray-700 text-white rounded"
          />
          <button className="w-full bg-indigo-600 py-2 rounded text-white">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
