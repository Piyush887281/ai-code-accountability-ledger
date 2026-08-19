import prisma from "@/lib/db";
import { Organization } from "@prisma/client";

export class OrganizationRepository {
  /**
   * Creates a new organization.
   */
  static async create(data: {
    name: string;
    slug: string;
  }): Promise<Organization> {
    return prisma.organization.create({
      data,
    });
  }

  /**
   * Finds an organization by its unique slug.
   */
  static async findBySlug(slug: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { slug },
    });
  }

  /**
   * Finds an organization by its ID.
   */
  static async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id },
    });
  }
}
