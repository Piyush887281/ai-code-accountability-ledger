import prisma from "../src/lib/db";
async function main() {
  const repos = await prisma.repository.findMany();
  console.log("REPOS:", JSON.stringify(repos, null, 2));
}
main().finally(() => prisma.$disconnect());
