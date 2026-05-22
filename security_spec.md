# Security Specification - Techno Power POS

## 1. Data Invariants
- Only the admin (`m7mdshipl@gmail.com`) can manage licenses, system settings, and global notifications.
- Financial records (treasury, accounts) are restricted to the admin.
- HR records (personnel, payroll) are restricted to the admin.
- Operation records (work orders, manufacturing) are restricted to the admin.
- Users can create suggestions/support tickets but cannot read those of others.
- Devices can be registered by clients but blocked only by admins.
- Trials are bound to a unique Hardware ID (deviceId).

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a license with a fake `createdAt` or `status='active'`.
2. **Identity Spoofing**: Attempt to read `hr_personnel` as an unverified user.
3. **Privilege Escalation**: Attempt to update `adminSettings` as a non-admin.
4. **State Shortcutting**: Attempt to change a license status directly from `pending` to `active` without admin intervention.
5. **Resource Poisoning**: Inject a 1MB string into a `suggestionText`.
6. **Query Scraping**: Attempt to list all `customers` without filtering by a specific ID.
7. **Orphaned Write**: Create a `referral` for a non-existent `affiliate`.
8. **PII Leak**: Read a `CustomerIdentity` document belonging to another user.
9. **Admin Spoofing**: Attempt to access admin routes with `email_verified = false`.
10. **Shadow Field**: Add a `isVerified: true` field to a device registration.
11. **Cost Attack**: Repeatedly query the entire `sales` collection.
12. **Immortality Bypass**: Attempt to change `createdAt` on an existing installment.

## 3. Test Runner (Planned)
The `firestore.rules.test.ts` will verify that all the above payloads return `PERMISSION_DENIED`.
