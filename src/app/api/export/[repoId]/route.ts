import { auth, MembershipRepository } from "@/modules/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ repoId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { repoId } = await context.params;

  // Verify access
  const memberships = await MembershipRepository.findByUserId(session.user.id);
  const organizationIds = memberships.map((m) => m.organizationId);

  const repository = await prisma.repository.findFirst({
    where: {
      id: repoId,
      organizationId: {
        in: organizationIds,
      },
    },
  });

  if (!repository) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Fetch all findings
  const findings = await prisma.finding.findMany({
    where: {
      pullRequest: {
        repositoryId: repository.id,
      },
    },
    include: {
      pullRequest: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Generate CSV
  // Header: ID, Source, Author, Depth Score, AI Confidence, Status, Created At, URL
  const headers = [
    "ID",
    "Source",
    "Author",
    "Review Depth Score",
    "Is Critical",
    "AI Authorship Confidence",
    "Status",
    "Created At",
    "URL"
  ];

  const escapeCsv = (str: string | number | null | undefined) => {
    if (str == null) return "";
    const stringified = String(str);
    if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n")) {
      return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
  };

  const rows = findings.map((f) => {
    const sourceTitle = f.pullRequest ? `PR #${f.pullRequest.externalId}` : "Unknown";
    const author = f.pullRequest?.authorName || "Unknown";
    const url = f.pullRequest?.url || "";
    
    return [
      f.id,
      sourceTitle,
      author,
      f.reviewDepthScore,
      f.isCritical ? "Yes" : "No",
      f.aiAuthorshipConfidence !== null ? f.aiAuthorshipConfidence : "N/A",
      f.status,
      f.createdAt.toISOString(),
      url
    ]
      .map(val => escapeCsv(val))
      .join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="findings-${repository.name.replace(/\//g, "-")}.csv"`,
    },
  });
}
