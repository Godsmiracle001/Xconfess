<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
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

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
