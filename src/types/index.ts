/**
 * Shared Type Definitions
 *
 * Types shared between frontend and backend.
 * Per blueprint Section 16's entity definitions.
 *
 * Entity types will be added as their respective modules are implemented:
 * - User, Organization, Membership (PHASE-1.5)
 * - Repository, Integration, Commit, PullRequest (PHASE-2)
 * - CriticalityPolicy, Finding (PHASE-3)
 * - Action, AuditLog, Report (PHASE-5)
 */

/** Role enum for Organization Membership per blueprint Section 2 personas */
export enum MembershipRole {
  OrgAdmin = "org_admin",
  TeamLead = "team_lead",
  Developer = "developer",
  ReadOnly = "read_only",
}
