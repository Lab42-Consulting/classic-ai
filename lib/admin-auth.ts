import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export interface ManagerContext {
  id: string;
  role: string;
  gymId: string;
  name: string;
}

/**
 * Resolve the staff session and require an admin or owner role (case-insensitive).
 * Shared by the admin catalog/order endpoints. Lives outside lib/auth (which is
 * fully mocked in tests) so its real logic runs against the mocked getSession/prisma.
 */
export async function requireManager(): Promise<
  { staff: ManagerContext } | { error: string; status: number }
> {
  const session = await getSession();
  if (!session || session.userType !== "staff") {
    return { error: "Unauthorized", status: 401 };
  }
  const staff = await prisma.staff.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, gymId: true, name: true },
  });
  if (!staff || !["owner", "admin"].includes(staff.role.toLowerCase())) {
    return { error: "Admin or owner access required", status: 403 };
  }
  return { staff };
}
