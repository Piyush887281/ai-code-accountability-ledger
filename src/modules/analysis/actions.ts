"use server";

import { auth, MembershipRepository } from "@/modules/auth";
import { CriticalityService } from "./services/criticality.service";
import { revalidatePath } from "next/cache";

export async function updateCriticalityPolicyAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // RBAC Check: Must be org_admin
  const memberships = await MembershipRepository.findByUserId(session.user.id);
  if (memberships.length === 0) {
    throw new Error("No organization found");
  }

  const membership = memberships[0];
  if (membership.role !== "org_admin") {
    throw new Error("Forbidden: Only organization admins can update the criticality policy");
  }

  const keywordsString = formData.get("keywords") as string;
  
  // Parse comma-separated keywords
  const keywords = keywordsString
    ? keywordsString.split(",").map(k => k.trim()).filter(k => k.length > 0)
    : [];

  await CriticalityService.updateOrgPolicy(membership.organizationId, keywords);
  
  revalidatePath("/dashboard/settings");
}

export async function getCriticalityPolicyAction() {
  const session = await auth();
  if (!session?.user?.id) return { keywords: [] };

  const memberships = await MembershipRepository.findByUserId(session.user.id);
  if (memberships.length === 0) return { keywords: [] };

  // Just fetch the org policy (null repositoryId)
  return CriticalityService.getPolicyForRepository(memberships[0].organizationId, "null_repo_fallback");
}
