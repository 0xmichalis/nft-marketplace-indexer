## NFT Marketplace Indexer

[![CI](https://github.com/0xmichalis/nft-marketplace-indexer/actions/workflows/ci.yml/badge.svg)](https://github.com/0xmichalis/nft-marketplace-indexer/actions/workflows/ci.yml)

Indexer for various NFT marketplaces on Ethereum (Seaport, SuperRare, KnownOrigin, etc.). Envio is used as the indexer framework. Please refer to the [Envio documentation website](https://docs.envio.dev) for a thorough guide on all [Envio](https://envio.dev) indexer features.

### Pre-requisites

- [Node.js (use v22.15 or newer; v24 recommended)](https://nodejs.org/en/download/current)
- [pnpm (use v10)](https://pnpm.io/installation)
- [Podman](https://podman.io/) (for deployments—this is a drop-in replacement for Docker so Docker should also work fine but you have to run the docker compose commands on your own instead of the documented `pnpm` commands in the `Deployment` and `Upgrades` sections)

## Example queries

### 1. User Activity Queries

**Find buys, sells, or swaps by user address**

The following query returns `buys`. Simply replace `buys` with `sells` or `swaps` for the other two types of trades.

```graphql
query SalesByUser($userAddress: String!) {
  Account(where: { address: { _ilike: $userAddress } }) {
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
  NFTContract(where: { address: { _ilike: $contractAddress } }) {
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
    where: { contract: { address: { _ilike: $contractAddress } }, tokenId: { _eq: $tokenId } }
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

Install dependencies with `pnpm install`, then run `pnpm codegen` before building or testing.
This project uses Envio HyperIndex 3.14.0. Unit tests use its in-memory test indexer and
run without Docker or a database.

### Generate files from `config.yaml` or `schema.graphql`

```sh
pnpm codegen
```

### Test

A Graph URL (`GRAPH_API_URL`) needs to be provided in order to run test queries against a deployed Graph. If not provided, the query tests will be skipped.

```sh
# Run all tests
pnpm test

# Run only GraphQL integration tests
pnpm test:queries

# Run only unit tests
pnpm test:unit
```

## Deployment

Copy the following `.env.*.example` files to `.env.*` and update as you see fit:

```sh
cp .env.postgres.example .env.postgres
cp .env.hasura.example .env.hasura
cp .env.indexer.example .env.indexer
```

Then you should be able to start a local deployment with:

```sh
pnpm start
```

Visit http://localhost:8080 and navigate to `Data` and click to track all database tables. Then you should be able to start using the playground.

Track the deployment status and other metadata about the indexer by running the following query in the playground:

```graphql
{
  _meta {
    chainId
    progressBlock
    eventsProcessed
    bufferBlock
    firstEventBlock
    sourceBlock
    readyAt
    isReady
    startBlock
    endBlock
  }
}
```

### Upgrades

When upgrading from Envio V2, use Node.js 22.15+ and provide `ENVIO_API_TOKEN`
for HyperSync. Rename `TUI_OFF=true` to `ENVIO_TUI=false`,
`ENVIO_PG_PUBLIC_SCHEMA` to `ENVIO_PG_SCHEMA`, and `CONFIG_FILE` to `ENVIO_CONFIG`
in any external deployment configuration. Envio 3.14.0 cannot resume V2 storage;
reindexing is required. `pnpm envio start --restart` clears the configured indexer
schema and rebuilds it from the configured start block.
See the [V3 migration guide](https://docs.envio.dev/docs/HyperIndex/migrate-to-v3).

If there are schema updates, currently the simplest approach is to restart with a clean slate.
TODO: Use [`envio local db-migrate up`](https://docs.envio.dev/docs/HyperIndex/cli-commands#envio-local-db-migrate-up) instead.

```sh
pnpm restart:clean
```

If there is no re-indexing to be done, you can simply restart with:

```sh
pnpm restart
```
