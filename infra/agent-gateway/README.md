# PDAO agent gateway

This separate API Gateway in `us-east-1` is for agent identity and future
agent-only operations. It does not replace or proxy the Stockholm Agent
Exchange and does not handle user PrivatePAY settlement.

## Descope contract

The API uses API Gateway's native JWT authorizer with the Descope project
issuer and the exact API Gateway URL as its audience. The protected identity
route requires `agent.identity.read`. Its handler returns only the authenticated
agent subject, client ID, granted scopes, and token expiry. It never logs or
returns a bearer token.

The `GET /health` route is public and contains no account or configuration
details. All agent routes must use JWT authorization and route-specific scopes.
Do not add a permissive default route.

Before agents can obtain acceptable tokens, create a Descope API Resource whose
URI is the stack output `AgentApiUrl`, add `agent.identity.read`, associate only
approved agent clients, and configure an AWS API Gateway-compatible JWT
template. The project issuer is `https://api.descope.com/<project-id>`. Until
then the protected route must reject calls; do not weaken the authorizer or
accept the Descope project ID as a substitute audience.

## Deploy

```sh
aws cloudformation deploy \
  --template-file infra/agent-gateway/template.yaml \
  --stack-name pdao-wallet-agent-gateway \
  --region us-east-1 \
  --capabilities CAPABILITY_NAMED_IAM
```

After registering the Resource and agent clients, verify health, rejection
without a token, rejection with a wrong audience/scope, and acceptance with a
short-lived scoped Descope access token before displaying an active security
badge in the product.
