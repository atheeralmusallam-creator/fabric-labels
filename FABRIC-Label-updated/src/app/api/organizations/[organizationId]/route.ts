// src/app/api/organizations/[organizationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description =
      body.description === undefined
        ? undefined
        : String(body.description ?? "");

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.update({
      where: { id: params.organizationId },
      data: {
        name,
        ...(description !== undefined ? { description } : {}),
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("PUT /api/organizations/[organizationId] error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    await prisma.organization.delete({
      where: { id: params.organizationId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/organizations/[organizationId] error:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
