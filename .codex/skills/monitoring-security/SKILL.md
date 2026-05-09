---

name: monitoring-security
description: Security rules for NestJS + Prisma monitoring SaaS.
----------------------------------------------------------------

Always review:

* JWT validation
* refresh token flow
* role authorization
* Prisma query safety
* DTO validation
* rate limiting
* XSS risks
* SQL injection risks
* secure cookies
* CORS
* sensitive data exposure

Prefer:

* class-validator
* DTO validation
* Prisma safe queries
* explicit authorization checks
* typed responses

Avoid:

* trusting frontend role checks
* exposing stack traces
* returning sensitive DB fields
* missing ownership validation
* unsafe raw SQL
