# Centralize Config Validation & Typed ConfigService Access

## Summary

Replaces all raw `process.env` reads in runtime service files with a centralized Joi validation schema and typed `ConfigService` accessors. The app now **fails fast** on startup if required environment variables are missing or invalid, with actionable error messages.

## Changes

### New Files
- **`src/config/env.validation.ts`** — Joi schema validating all env vars at bootstrap
- **`src/config/app.config.ts`** — Typed `app.*` config namespace (`port`, `frontendUrl`, `backendUrl`, `appSecret`, `confessionAesKey`)
- **`src/utils/confession-encryption.ts`** — Refactored encryption utility (pure functions, key as parameter)

### Modified Files

| File | Change |
|------|--------|
| `app.module.ts` | Wired `envValidationSchema` + `appConfig` into `ConfigModule.forRoot()` |
| `confession.service.ts` | Injected `ConfigService`, added `aesKey` getter, updated 13 encrypt/decrypt calls |
| `confession-draft.service.ts` | Injected `ConfigService`, added `aesKey` getter, updated 5 calls |
| `admin.service.ts` | Injected `ConfigService`, added `aesKey` getter, updated 1 call |
| `data-export.controller.ts` | Replaced `process.env.APP_SECRET` → `app.appSecret` |
| `data-export.service.ts` | Replaced `process.env.APP_SECRET` and `BACKEND_URL` → typed accessors |
| `export.processor.ts` | Replaced `process.env.FRONTEND_URL` → `app.frontendUrl` |
| `email.service.ts` | Replaced 5 `FRONTEND_URL` references → `app.frontendUrl` |
| `stellar.config.ts` | Refactored to `registerAs('stellar', ...)` |
| `throttle.config.ts` | Parsed values as integers for typed retrieval |
| `rate-limit.config.ts` | Replaced raw constant with `registerAs('rateLimit', ...)` |
| `dlq-retention.config.ts` | Removed duplicate constant |
| `package.json` | Added `joi: ^17.13.3` |
| `.env.sample` | Expanded with all env vars grouped by category |

### Spec Files Updated
- `confession-encryption.spec.ts` — Pure function tests, no `process.env` manipulation
- `confession.service.spec.ts` — Added `ConfigService` mock provider
- `confession.view-count.integration.spec.ts` — Added `ConfigService` mock + key parameter
- `confession.view-count.service.spec.ts` — Added `ConfigService` mock + key parameter

## How It Works

1. **Startup validation**: `env.validation.ts` defines a Joi schema applied via `ConfigModule.forRoot({ validationSchema })`. Missing or invalid vars cause immediate failure with clear messages.
2. **Typed access**: `app.config.ts` uses `registerAs('app', ...)` so services access config via `this.configService.get<string>('app.frontendUrl')` instead of raw `process.env.FRONTEND_URL`.
3. **Pure encryption**: `encryptConfession(text, key)` and `decryptConfession(text, key)` now accept the key as a parameter. Services use a private `aesKey` getter backed by `ConfigService`.

## Testing

- [ ] Run `npm install` to install `joi`
- [ ] Run `npm test` to verify all tests pass
- [ ] Verify startup fails with missing required vars (e.g., remove `DB_HOST`)
- [ ] Verify startup succeeds with valid `.env`

Closes #374
