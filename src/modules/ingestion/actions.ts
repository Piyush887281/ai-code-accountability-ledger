"use server";

import { auth } from "@/modules/auth";
import { MembershipRepository } from "@/modules/auth";
import { GitHubService } from "./services/github.service";
import { revalidatePath } from "next/cache";

export async function fetchAccessibleRepositoriesAction() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return GitHubService.getAccessibleRepositories(session.user.id);
}

export async function connectRepositoryAction(repoData: any) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Get user's org
  const memberships = await MembershipRepository.findByUserId(session.user.id);
  if (memberships.length === 0) {
    throw new Error("No organization found for user");
  }

  const organizationId = memberships[0].organizationId;

  // Connect repo
  const repo = await GitHubService.connectRepository(organizationId, repoData);
  
  revalidatePath("/dashboard/repos");
  
  return repo;
}
