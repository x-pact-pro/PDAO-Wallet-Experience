# Identity and agent authorization

## Provider roles

- **Auth0** authenticates a person into the wallet on web and Android. Its browser token cache is memory-only. It does not receive wallet signing keys or recovery phrases.
- **Descope** is the selected identity and authorization provider for machine agents and agent-facing APIs. It is separate from human sign-in. The wallet surfaces Descope branding in the Bots workspace and links to the Resource Server documentation.
- **Persona** is an optional identity/business verification provider. It does not gate wallet creation, wallet connection, or ordinary payments.

## Current rollout state

The connected Descope project is named `PrivateDAO`. Its project currently has SSO, flows, roles, permissions, and access keys configured; tenant setup is listed as a gap. Runtime `descope.enabled` remains `false` in `public/pdao-config.js`. The product therefore displays **Project connected / server enforcement pending** and does not claim that current Agent Exchange or PrivatePAY routes validate Descope tokens.

The existing Stockholm Agent Exchange API owns its route contract. Public catalog and x402 payment flows retain their current behavior; wallet-signed x402 authorization remains separate from agent identity. Do not attach a mandatory Descope check to those user payment routes or change the Stockholm Lambda as part of this wallet release.

## Resource-server design for agent routes

Before marking an agent route as protected:

1. Create a Descope API Resource for a new PDAO-owned agent gateway/API, with a dedicated audience and least-privilege scopes (for example `agent.catalog.read`, `agent.strategy.read`, `agent.trade.request`, `agent.payment.request`). Keep settlement and transfer execution behind their existing user-signature and policy controls.
2. Register only the relevant agent clients against that Resource and use Descope policy to grant their scopes. Keep OAuth client credentials server-side in AWS Secrets Manager; never ship them in the SPA, Chrome extension, or Android bundle.
3. On the server, validate JWT signature against the Descope project JWKs, plus `iss`, `exp`, the exact Resource `aud`, required `scope`, and an allowed `azp` where applicable. Fail closed for missing, expired, malformed, wrong-audience, or insufficient-scope tokens.
4. Keep separate agent-only endpoints. Do not make a Descope bearer token a substitute for a user's explicit wallet signature, a fresh x402 quote, payment authorization, or settlement receipt.
5. Add audit events for the agent identity, requested capability, policy decision, and result. Never record bearer tokens, private keys, or recovery phrases.
6. Test both acceptance and rejection paths before enabling `descope.enabled`; the app-side flag alone is not security enforcement.

The SPA and extension can display agent identity state, but cannot protect an API by themselves. The enforcement boundary must be the AWS gateway/service that owns the agent route. Android uses the same server-side policy and must not embed a client secret.

## Branding and provider disclosures

Use the provider name **Descope** with the linked official documentation in agent-security surfaces. Only display “secured by Descope” or “Powered by Descope” after the API-side resource and token checks are deployed and verified. Until then, state that the project is connected and enforcement is pending. Keep Auth0 attribution tied only to enabled human sign-in.

## References

- [Descope Resources and OAuth resource servers](https://docs.descope.com/resources)
- [Descope session validation](https://docs.descope.com/sessions/validation)
- [Descope Agentic Identity Hub](https://docs.descope.com/agentic-identity-hub)
- [Descope Access Keys](https://docs.descope.com/access-keys)
