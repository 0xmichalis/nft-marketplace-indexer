## NFT Marketplace Indexer

_Please refer to the [documentation website](https://docs.envio.dev) for a thorough guide on all [Envio](https://envio.dev) indexer features_

### Pre-requisites

- [Node.js (use v18 or newer)](https://nodejs.org/en/download/current)
- [pnpm (use v8 or newer)](https://pnpm.io/installation)
- [Docker desktop](https://www.docker.com/products/docker-desktop/) (for local deployments)

## Example queries

### 1. User Activity Queries

**Find orders by user address (offerer or recipient)**

```graphql
query OrdersByUser($userAddress: String!) {
  Seaport_OrderFulfilled(
    where: { _or: [{ offerer: { _ilike: $userAddress } }, { recipient: { _ilike: $userAddress } }] }
    order_by: { timestamp: desc }
  ) {
    id
    timestamp
    transactionHash
    market
    offerer
    recipient
    offerTokens
    offerIdentifiers
    offerAmounts
    considerationTokens
    considerationIdentifiers
    considerationAmounts
  }
}
```

### 2. NFT-Specific Queries

**Find orders by specific NFT contract**

```graphql
query OrdersByNFTContract($contractAddress: String!) {
  Seaport_OrderFulfilled(
    where: {
      _or: [
        { offerTokens: { _contains: [$contractAddress] } }
        { considerationTokens: { _contains: [$contractAddress] } }
      ]
    }
    order_by: { timestamp: desc }
  ) {
    id
    timestamp
    transactionHash
    market
    offerer
    recipient
    offerTokens
    offerIdentifiers
    offerAmounts
    considerationTokens
    considerationIdentifiers
    considerationAmounts
  }
}
```

## Development

### Generate files from `config.yaml` or `schema.graphql`

```bash
pnpm codegen
```

### Run

```bash
pnpm dev
```

Visit http://localhost:8080 to see the GraphQL Playground, local password is `testing`.

### Test

A Graph URL (`GRAPH_API_URL`) needs to be provided in order to run test queries against a deployed Graph.

```bash
# Run all tests; define GRAPH_API_URL to include the query tests
pnpm test

# Run only GraphQL integration tests
GRAPH_API_URL=https://your-indexer-endpoint.com/graphql pnpm test:queries

# Run only unit tests (mocks)
pnpm test:unit
```
