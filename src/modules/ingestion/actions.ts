"use server";

import { auth } from "@/modules/auth";
import { MembershipRepository } from "@/modules/auth";
import { GitHubService } from "./services/github.service";
import { revalidatePath } from "next/cache";

export async function fetchAccessibleRepositoriesAction() {
  console.log("SERVER ACTION: fetchAccessibleRepositoriesAction START");
  const session = await auth();
  if (!session?.user?.id) {
    console.log(
      "SERVER ACTION: fetchAccessibleRepositoriesAction Unauthorized",
    );
    throw new Error("Unauthorized");
  }

  const result = await GitHubService.getAccessibleRepositories(session.user.id);
  console.log(
    "SERVER ACTION: fetchAccessibleRepositoriesAction DONE, repos:",
    result?.length,
  );
  return result;
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

  // Connect repo (pass userId so the OAuth token gets stored on the Integration)
  const repo = await GitHubService.connectRepository(
    organizationId,
    session.user.id,
    repoData,
  );

  revalidatePath("/dashboard/repos");

  return repo;
}

export async function getConnectedRepositoriesAction() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const memberships = await MembershipRepository.findByUserId(session.user.id);
  if (memberships.length === 0) {
    throw new Error("No organization found for user");
  }

  const organizationId = memberships[0].organizationId;

  // Import prisma dynamically here to avoid issues in Edge if actions are run there
  const prisma = (await import("@/lib/db")).default;

  const connectedRepos = await prisma.repository.findMany({
    where: {
      integration: {
        organizationId,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // Calculate open findings per repository
  const reposWithCounts = await Promise.all(
    connectedRepos.map(async (repo) => {
      const findingsCount = await prisma.finding.count({
        where: {
          pullRequest: { repositoryId: repo.id },
          status: "open",
        },
      });

      return {
        ...repo,
        _count: { findings: findingsCount },
      };
    }),
  );

  return reposWithCounts;
}
