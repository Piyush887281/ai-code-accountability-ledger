/**
 * Authentication Module
 *
 * Provides:
 * 1. OAuth integration via Auth.js
 * 2. Tenant isolation (Organization model)
 * 3. Role-based access (Membership model)
 *
 * This module is initialized in PHASE-1.4.
 */
export { auth, signIn, signOut, handlers } from "../../../auth";
export { OrganizationRepository } from "./repositories/organization.repository";
export { MembershipRepository } from "./repositories/membership.repository";
export * from "./actions";
