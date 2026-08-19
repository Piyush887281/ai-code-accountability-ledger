import prisma from "@/lib/db";
import { Membership, Organization, User } from "@prisma/client";

export class MembershipRepository {
  /**
   * Adds a user to an organization with a specific role.
   */
  static async createMembership(data: {
    organizationId: string;
    userId: string;
    role: string;
  }): Promise<Membership> {
    return prisma.membership.create({
      data,
    });
  }

  /**
   * Gets all memberships for a specific user, including the organization details.
   */
  static async findByUserId(
    userId: string,
  ): Promise<(Membership & { organization: Organization })[]> {
    return prisma.membership.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });
  }

  /**
   * Gets all memberships for a specific organization, including user details.
   */
  static async findByOrganizationId(
    organizationId: string,
  ): Promise<(Membership & { user: User })[]> {
    return prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: true,
      },
    });
  }

  /**
   * Checks if a user has a specific role in an organization.
   */
  static async checkRole(
    organizationId: string,
    userId: string,
    requiredRole: string,
  ): Promise<boolean> {
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    // In a real implementation, this would handle hierarchy (e.g., org_admin > developer)
    return membership?.role === requiredRole;
  }
}
