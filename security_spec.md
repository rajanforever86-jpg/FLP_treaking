# Security Specification - TRAKZY AI

## Data Invariants
1. A Lead must always have a `userId` matching the creator's UID.
2. A Schedule task must always belong to the creator (`userId`).
3. Monthly Targets can only be set or modified by the owner.
4. Users can only read and write their own data.

## The Dirty Dozen (Test Payloads)
1. **Identity Spoofing**: Attempt to create a user profile with a different UID than `auth.uid`.
2. **Lead Poisoning**: Attempt to create a lead for another user's `userId`.
3. **Status Shortcut**: Attempt to update a lead's status directly to 'signup_done' without following the pipeline (if enforced).
4. **Mass Lead Query**: Attempt to list all leads without a filter on `userId`.
5. **Ghost Fields**: Attempt to add a `verified: true` field to a user document.
6. **Resource Exhaustion**: Attempt to write a 1MB string into the `name` field of a lead.
7. **Schedule Hijack**: Attempt to delete another user's schedule item.
8. **Target Tampering**: Attempt to modify another user's leads target.
9. **Admin Escalation**: Attempt to set `rank: "Admin"` on own profile.
10. **Historical Backdating**: Attempt to set `createdAt` to a past date.
11. **Phone Hijacking**: Attempt to update another user's phone number.
12. **Anonymous Write**: Attempt to write to any collection without being authenticated.

## Rules Design
- `isValidUser`, `isValidLead`, `isValidSchedule`, `isValidTarget` helpers for validation.
- `isOwner(userId)` helper for identity checks.
- `affectedKeys()` for strict update control.
