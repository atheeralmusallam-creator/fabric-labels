import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    const users = await prisma.user.findMany({
      where:
        role === "ANNOTATOR" || role === "MANAGER" || role === "ADMIN"
          ? { role }
          : {},
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
