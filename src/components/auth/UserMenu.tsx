import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth";

async function logoutAction() {
  "use server";
  clearSession();
  redirect("/login");
}

export function UserMenu({ user }: { user: { name: string | null; email: string; role: string } }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-right hidden sm:block">
        <div className="text-gray-200 font-medium">{user.name || user.email}</div>
        <div className="text-xs text-gray-500">{user.role.toLowerCase()}</div>
      </div>
      <form action={logoutAction}>
        <button className="text-gray-400 hover:text-white transition-colors">Logout</button>
      </form>
    </div>
  );
}
