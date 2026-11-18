# Identity and agent authorization

## Human sessions

Auth0 remains the human sign-in provider for this wallet. Its SPA token cache is memory-only. Auth0 is currently disabled in runtime configuration until the new production origin and callback have been registered.

## Agent sessions

Descope is separate from Auth0 and is reserved for machine and agent authorization to Agent Exchange, PrivatePAY agent access, and trading-agent APIs. The connected Descope project is `PrivateDAO`; its public Project ID is configured through the Descope connection, not copied from chat. Existing human flows include `sign-in` and `step-up`; they are not the agent resource authorization contract.

The Agent Exchange source currently exposes public catalog and x402 routes, where wallet-signed payment authorization is an independent control. Do not require an agent bearer token on those wallet flows until a distinct agent-only route and its OAuth resource/scopes have been configured. Do not send a wallet recovery phrase or private key to Auth0, Descope, or Agent Exchange.

## Required work before production enforcement

1. Configure a Descope MCP/API Resource for the Agent Exchange service URL.
2. Define separate least-privilege scopes for read-only discovery, paid service execution, trading-agent actions, and PrivatePAY agent operations.
3. Validate Descope tokens server-side against the exact audience, expiry, and required scope on agent-only routes.
4. Preserve the existing local wallet signature, exact x402 challenge binding, and settlement verification for payments.
5. Add the Descope Access Key or OAuth client credential only through AWS Secrets Manager. Rotate any credential value shared in chat before use.
6. Deploy the Stockholm Lambda only through its guarded production workflow and verify each protected route against valid, missing, wrong-audience, expired, and insufficient-scope tokens.
