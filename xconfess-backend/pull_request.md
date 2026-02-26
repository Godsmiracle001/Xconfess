# Reliable Notification Dispatch via Transactional Outbox

## Summary

This PR implements the **Transactional Outbox pattern** to ensure reliable notification dispatch across the system. It eliminates the risk of "lost notifications" that occurred when database writes succeeded but the subsequent immediate enqueuing to the message queue failed.

## Key Changes

### 1. Infrastructure
- **`OutboxEvent` Entity**: New entity to persist notification intents transactionally with domain data.
- **`OutboxDispatcherService`**: A scheduled worker that polls `PENDING` outbox events and safely relays them to the `NotificationQueue`.
- **`NotificationModule`**: Configured to provide the dispatcher and register the new entity.

### 2. Domain & Entity Refactoring
- **`User` Entity**: Added `getEmail()` method to handle AES-256-GCM decryption of user emails for notification dispatch.
- **`AnonymousUser` Entity**: Fixed missing `userLinks` relation to allow correct resolution of the associated account user.
- **Transactional Writes**: Refactored the following services to use `dataSource.transaction` and persist outbox records:
    - `CommentService`
    - `MessagesService`
    - `ReactionService`
    - `ReportsService`

### 3. Notification Logic
- **`NotificationQueue`**: Generalized processing logic to handle multiple notification types (comments, messages, replies, reactions, reports).
- **`EmailService`**: Added `sendGenericNotification` for unified template resolution and email delivery.

## Verification

- [x] **Transactional Integrity**: Verified that `OutboxEvent` records are saved within the same database transaction as the domain entity.
- [x] **Decryption & Relations**: Verified that recipient emails are correctly resolved via the new `userLinks` relation and decrypted before dispatch.
- [x] **Idempotency**: Implemented unique `idempotencyKey` on outbox events to prevent duplicate notification processing.
- [x] **Error Handling**: Implemented retry logic and failure logging in the dispatcher.

#XXX
