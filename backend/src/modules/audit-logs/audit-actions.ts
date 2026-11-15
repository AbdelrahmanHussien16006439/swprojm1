/**
 * Action names used in the audit log (GEN-07).
 * Member 2: add your actions here too (provider deactivate/reactivate, report resolution, content hide/delete).
 */
export const AuditAction = {
  // Member 1 — admin accounts
  MODERATOR_CREATED: 'MODERATOR_CREATED', // ACC-13
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED', // ACC-15, ACC-16
  ACCOUNT_REACTIVATED: 'ACCOUNT_REACTIVATED', // ACC-15, ACC-16
  PASSWORD_RESET: 'PASSWORD_RESET', // ACC-07a
} as const;

export const AuditTargetType = {
  USER: 'user',
} as const;
