"use server";

import { redirect } from "next/navigation";
import { auth } from "./index";
import { OrganizationRepository } from "./repositories/organization.repository";
import { MembershipRepository } from "./repositories/membership.repository";

export async function createOrganizationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  if (!name || name.trim() === "") {
    throw new Error("Organization name is required");
  }

  // Generate a basic slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let slug = baseSlug;

  // Basic collision handling for V1
  const existingOrg = await OrganizationRepository.findBySlug(slug);
  if (existingOrg) {
    slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
  }

  // Create org
  const org = await OrganizationRepository.create({
    name,
    slug,
  });

  // Create membership (org_admin)
  await MembershipRepository.createMembership({
    organizationId: org.id,
    userId: session.user.id,
    role: "org_admin",
  });

  // Redirect to dashboard (which we'll build in Phase 2)
  redirect("/dashboard");
}
