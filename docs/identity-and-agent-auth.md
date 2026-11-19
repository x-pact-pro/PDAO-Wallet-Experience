# Identity and agent authorization

## Provider roles

- **Auth0** authenticates a person into the wallet on web and Android. Its browser token cache is memory-only. It does not receive wallet signing keys or recovery phrases.
- **Descope** is the selected identity and authorization provider for machine agents and agent-facing APIs. It is separate from human sign-in. The wallet surfaces Descope branding in the Bots workspace and links to the Resource Server documentation.
- **Persona** is an optional identity/business verification provider. It does not gate wallet creation, wallet connection, or ordinary payments.

## Current rollout state

The current Auth0 client belongs to the `dev-xojmajo443e15z7n` development
tenant. `public/pdao-config.js` marks it as `environment: 'development'`.
On `wallet.privatedao.org`, Chrome extension pages, and all Android app builds,
the app refuses to start Auth0 or Dock redirects while that marker is not
`production`; wallet connection and the rest of the app remain available. The
development tenant is still usable on non-production browser previews and
local origins. Do not flip the marker to bypass this guard.

Before production sign-in is enabled, provision and verify the production
Auth0 tenant and its separate web and native clients. Set the production
domain/client IDs, callback and logout URLs, Android deep link, and mark the
runtime config `environment: 'production'`. Run Auth0 Production Readiness
Checks before publishing that configuration. The web callback must include
`https://wallet.privatedao.org/auth/callback`; the native callback must match
the Android package and Auth0 native-client settings. Never put a client
secret in this public runtime file.

The connected Descope project is named `PrivateDAO`. It currently has SSO, flows, roles, permissions, and access keys; tenant setup is listed as a gap. The project has no API Resources or agentic clients yet, and its FGA schema is empty. Runtime `descope.enabled` remains `false` in `public/pdao-config.js`.

A PDAO-owned HTTP API is deployed in AWS `us-east-1` at `https://nnnx1tvyqb.execute-api.us-east-1.amazonaws.com`. API Gateway has a native Descope JWT authorizer configured with issuer `https://api.descope.com/P3LeEm9CWaHUiGrt0hNS1Xglk2Mt`, the API URL as the exact audience, and a protected `GET /v1/agent/identity` route requiring `agent.identity.read`. Live evidence: `GET /health` returns 200; the protected identity route returns 401 without a bearer token. The Descope Resource, client grants, and valid scoped-token acceptance check are pending, so the API does not yet accept an agent token; the UI reports **Descope Resource binding pending**.

The existing Stockholm Agent Exchange API owns its route contract. Public catalog and x402 payment flows retain their current behavior; wallet-signed x402 authorization remains separate from agent identity. Do not attach a mandatory Descope check to those user payment routes or change the Stockholm Lambda as part of this wallet release.

## Resource-server contract and rollout

The CloudFormation source is `infra/agent-gateway/template.yaml`. The initial route set has no unauthenticated agent operation. API Gateway's native JWT authorizer checks the Descope issuer, signature, expiry, and audience; route-level `AuthorizationScopes` requires each route's permission. The identity route is a validation/introspection endpoint only; team-bot trade execution and paid job execution are not implemented by this route.

To activate authorized agents:

1. Create a Descope API Resource named `PDAO Wallet Agent Gateway`, with URI exactly `https://nnnx1tvyqb.execute-api.us-east-1.amazonaws.com` and scope `agent.identity.read`.
2. Associate only approved agent clients with that Resource and grant the identity scope through Descope policies. The project currently has no agentic clients; keep any client secret in AWS Secrets Manager and never ship it to the SPA, Chrome extension, or Android bundle.
3. Configure the Descope AWS API Gateway JWT template if required, then verify that Descope issues tokens with the gateway URI in `aud` and `agent.identity.read` in `scope`.
4. Verify rejection for missing, expired, malformed, wrong-audience, and insufficient-scope tokens, and acceptance for an authorized short-lived token. Check `azp` where client restriction is required.
5. Add audited, scoped agent endpoints as each capability is implemented. Do not make a Descope bearer token a substitute for a user's explicit wallet signature, a fresh x402 quote, payment authorization, or settlement receipt.
6. Keep audit records free of bearer tokens, private keys, and recovery phrases. Only then enable `descope.enabled` and use “secured by Descope” branding.

The SPA, extension, and Android app use the same gateway audience and server-side policy; none can enforce authorization locally or embed a client secret. The existing Stockholm Agent Exchange and PrivatePAY routes retain their contracts and were not modified.

## Branding and provider disclosures

Use the provider name **Descope** with the linked official documentation in agent-security surfaces. Only display “secured by Descope” or “Powered by Descope” after the API Resource, scoped clients, and token acceptance/rejection checks are configured and verified. Until then, show **Gateway deployed / Descope Resource binding pending**. Keep Auth0 attribution tied only to enabled human sign-in.

## References

- [Descope Resources and OAuth resource servers](https://docs.descope.com/resources)
- [Descope session validation](https://docs.descope.com/sessions/validation)
- [Descope JWTs with AWS API Gateway](https://docs.descope.com/sessions/validation/jwt-authorizers/aws-jwt-authorizer)
- [Descope Agentic Identity Hub](https://docs.descope.com/agentic-identity-hub)
- [Descope Access Keys](https://docs.descope.com/access-keys)
