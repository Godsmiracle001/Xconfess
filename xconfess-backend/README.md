# xConfess Backend

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

> NestJS-based backend for the xConfess anonymous confession platform.

## Active Modules

| Module | Path | Description |
|--------|------|-------------|
| Auth | `src/auth/` | JWT authentication, guards, decorators |
| User | `src/user/` | User + anonymous user management |
| Confession | `src/confession/` | Confession CRUD, search, tags, encryption |
| Reaction | `src/reaction/` | Emoji reactions with WebSocket |
| Comment | `src/comment/` | Nested commenting system |
| Messages | `src/messages/` | Anonymous messaging (author-reply) |
| Report | `src/report/` | Report creation & resolution |
| Admin | `src/admin/` | Admin panel with RBAC |
| Moderation | `src/moderation/` | AI content moderation (OpenAI) |
| Audit Log | `src/audit-log/` | Comprehensive audit trail |
| Logger | `src/logger/` | Structured logging with PII masking |
| Stellar | `src/stellar/` | Stellar blockchain integration |
| Tipping | `src/tipping/` | XLM micro-tipping |
| Encryption | `src/encryption/` | Field-level confession encryption |
| Cache | `src/cache/` | Redis/in-memory caching |
| Analytics | `src/analytics/` | View counts, trending |
| Data Export | `src/data-export/` | GDPR data export |
| WebSocket | `src/websocket/` | Real-time event gateway |
| Notifications | `src/notifications/` | Notification system (Bull/Redis — disabled by default) |

## Project Setup

```bash
npm install
```

## Compile and Run

```bash
# development
npm run start:dev

# production mode
npm run build
npm run start:prod
```

## Run Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## CORS Configuration

The backend uses environment-based CORS to securely manage cross-origin requests from the frontend.

### Environment Variables

| Variable               | Default                                       | Description                                               |
| ---------------------- | --------------------------------------------- | --------------------------------------------------------- |
| `CORS_ORIGINS`         | `http://localhost:3000,http://localhost:3001` | Comma-separated list of allowed origins                   |
| `CORS_CREDENTIALS`     | `true`                                        | Allow credentials (cookies/auth headers) in CORS requests |
| `CORS_METHODS`         | `GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS`      | Allowed HTTP methods                                      |
| `CORS_ALLOWED_HEADERS` | `Content-Type,Authorization,Accept`           | Allowed request headers                                   |
| `CORS_EXPOSE_HEADERS`  | `Authorization,Content-Range,X-Content-Range` | Headers exposed to the frontend                           |
| `CORS_MAX_AGE`         | `3600`                                        | Preflight cache duration in seconds                       |

### Local Development Setup

For local development with frontend running on `http://localhost:3000`:

```bash
# .env (or copy from .env.sample)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
```

Then start the backend:

```bash
$ npm run start:dev
```

The frontend at `http://localhost:3000` will now be able to make cross-origin requests to the backend.

### Production Setup

For production deployments, configure the allowed origins strictly:

```bash
# .env.production
CORS_ORIGINS=https://xconfess.example.com,https://www.xconfess.example.com
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400
```

### How CORS Works

1. **Preflight Request**: Browser sends an `OPTIONS` request with the origin to check permissions
2. **Server Validation**: Server checks if the origin is in the `CORS_ORIGINS` list
3. **Response Headers**: If allowed, the server includes CORS headers in the response
4. **Credentials**: When `CORS_CREDENTIALS=true`, cookies and authorization headers are included in requests

### Testing CORS Behavior

#### Test preflight request from allowed origin:

```bash
curl -X OPTIONS http://localhost:3000/confessions \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

Expected response includes:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,Accept
Access-Control-Allow-Credentials: true
```

#### Test preflight request from disallowed origin:

```bash
curl -X OPTIONS http://localhost:3000/confessions \
  -H "Origin: http://malicious.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Expected: No `Access-Control-Allow-Origin` header in response (request blocked by browser).

#### Test with credentials from frontend:

```javascript
// Browser will automatically reject if origin not allowed
fetch('http://localhost:3000/confessions', {
  method: 'GET',
  credentials: 'include', // Include cookies/auth headers
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer <token>',
  },
}).then((res) => res.json());
```

## Deployment

Copy `.env.example` to `.env` and update the values:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/xconfess
JWT_SECRET=your-secret-key
PORT=5000
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

## Database Migrations

```bash
npm run migration:run
```

## API Documentation

When running locally, Swagger docs are available at `/api/api-docs`.

## 📄 License

[MIT licensed](../LICENSE)
