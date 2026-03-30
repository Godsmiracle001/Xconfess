// Global test env defaults for crypto utilities.
// These keys are ONLY for tests.
process.env.EMAIL_ENCRYPTION_KEY =
  process.env.EMAIL_ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes
process.env.CONFESSION_ENCRYPTION_KEY =
  process.env.CONFESSION_ENCRYPTION_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

