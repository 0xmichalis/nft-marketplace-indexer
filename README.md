## NFT Marketplace Indexer

[![CI](https://github.com/0xmichalis/nft-marketplace-indexer/actions/workflows/ci.yml/badge.svg)](https://github.com/0xmichalis/nft-marketplace-indexer/actions/workflows/ci.yml)

Indexer for various NFT marketplaces on Ethereum (Seaport, SuperRare, KnownOrigin, etc.). Envio is used as the indexer framework. Please refer to the [Envio documentation website](https://docs.envio.dev) for a thorough guide on all [Envio](https://envio.dev) indexer features.

### Pre-requisites

- [Node.js (use v18 or newer)](https://nodejs.org/en/download/current)
- [pnpm (use v9 or newer)](https://pnpm.io/installation)
- [Podman](https://podman.io/) (for deployments)

## Example queries

### 1. User Activity Queries

**Find buys, sells, or swaps by user address**

The following query returns `buys`. Simply replace `buys` with `sells` or `swaps` for the other two types of trades.

```graphql
query SalesByUser($userAddress: String!) {
  Account(where: { address: { _eq: $userAddress } }) {
    id
    address
    buys(order_by: { sale: { timestamp: desc } }) {
      sale {
        id
        timestamp
        transactionHash
        market
        offerer {
          address
        }
        recipient {
          address
        }
        offerTokens
        offerIdentifiers
        offerAmounts
        considerationTokens
        considerationIdentifiers
        considerationAmounts
      }
    }
  }
}
```

### 2. NFT Contract Queries

**Find all sales involving a specific NFT contract**

```graphql
query SalesByNFTContract($contractAddress: String!) {
  NFTContract(where: { address: { _eq: $contractAddress } }) {
    id
    address
    tokens {
      sales(order_by: { sale: { timestamp: desc } }) {
        sale {
          id
          timestamp
          transactionHash
          market
          offerer {
            address
          }
          recipient {
            address
          }
          offerTokens
          offerIdentifiers
          offerAmounts
          considerationTokens
          considerationIdentifiers
          considerationAmounts
        }
      }
    }
  }
}
```

### 3. NFT Token Queries

**Find all sales of a specific NFT token**

```graphql
query SalesByNFTToken($contractAddress: String!, $tokenId: String!) {
  NFTToken(
    where: { contract: { address: { _eq: $contractAddress } }, tokenId: { _eq: $tokenId } }
  ) {
    id
    tokenId
    contract {
      id
      address
    }
    sales(order_by: { sale: { timestamp: desc } }) {
      sale {
        id
        timestamp
        transactionHash
        market
        offerer {
          address
        }
        recipient {
          address
        }
        offerTokens
        offerIdentifiers
        offerAmounts
        considerationTokens
        considerationIdentifiers
        considerationAmounts
      }
    }
  }
}
```

## Development

### Generate files from `config.yaml` or `schema.graphql`

```bash
pnpm codegen
```

### Test

A Graph URL (`GRAPH_API_URL`) needs to be provided in order to run test queries against a deployed Graph. If not provided, the query tests will be skipped.

```bash
# Run all tests
pnpm test

# Run only GraphQL integration tests
pnpm test:queries

# Run only unit tests
pnpm test:unit
```

## Deployment

The following command will run the indexer and Hasura. It assumes a Postgres database runs at `0.0.0.0:5432` (or whatever is the host that has been configured in `.env.hasura` and `.env.indexer`). You have to create the `enviouser` user and `enviodb` database with `enviouser` as the owner manually beforehand.

```bash
pnpm start
```

Visit http://localhost:8080 and navigate to `Data` and click to track all database tables. Then you should be able to start using the playground.

### Upgrades

Stop both the indexer and Hasura.

```
pnpm stop
```

If there are schema changes, drop all tables from the database across both schemas (the indexer is using a different schema from Hasura). TODO: Use [`envio local db-migrate up`](https://docs.envio.dev/docs/HyperIndex/cli-commands#envio-local-db-migrate-up) instead.

Restart the services and track the tables in Hasura.

```
pnpm start
```
