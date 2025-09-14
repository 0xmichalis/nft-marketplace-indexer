# GraphQL Query Integration Testing

This directory contains integration tests that run real GraphQL queries against your deployed indexer endpoint. These tests serve as both validation and documentation for supported query patterns.

## Quick Start

### Set Up Environment

**Option 1: Using .env file (Recommended)**
```bash
# Copy the example file
cp env.example .env

# Edit .env and set your endpoint
# GRAPH_API_URL=https://your-indexer-endpoint.com/graphql
```

**Option 2: Direct environment variable**
```bash
export GRAPH_API_URL="https://your-indexer-endpoint.com/graphql"
```

### Run Tests
```bash
# Run all tests
pnpm test

# Run only GraphQL integration tests
pnpm test:queries

# Run only unit tests (mocks)
pnpm test:unit
```

## Test Structure

```
test/
├── QueryIntegration.ts     # Real GraphQL query tests
├── GraphQLClient.ts        # GraphQL client utilities
├── Test.ts                 # Unit tests with mocks
├── TestUtils.ts            # Mock utilities (for unit tests)
└── README.md              # This file
```

## Environment Configuration

### Required Environment Variables

- **`GRAPH_API_URL`**: Your deployed indexer GraphQL endpoint
  - Example: `https://indexer-abc123.envio.dev/graphql`
  - Example: `http://localhost:8080/graphql`

### Test Behavior

- ✅ **With `GRAPH_API_URL`**: Tests run against real endpoint
- ⚠️ **Without `GRAPH_API_URL`**: Tests are automatically skipped

## Documented Query Patterns

### 1. User Activity Queries

**Find orders by user address (offerer or recipient)**
```graphql
query OrdersByUser($userAddress: String!, $limit: Int) {
  Seaport_OrderFulfilled(
    where: {
      _or: [
        { offerer: { _ilike: $userAddress } },
        { recipient: { _ilike: $userAddress } }
      ]
    }
    order_by: { timestamp: desc }
    limit: $limit
  ) {
    id
    orderHash
    offerer
    recipient
    timestamp
    blockNumber
    # ... all fields
  }
}
```

**Test Coverage:**
- ✅ Finds orders where user is offerer or recipient
- ✅ Case-insensitive address matching
- ✅ Timestamp ordering validation
- ✅ Data structure validation

### 2. NFT-Specific Queries

  **Find orders by specific NFT contract (in offer OR consideration)**
  ```graphql
  query OrdersByNFTContract($contractAddress: String!, $limit: Int) {
    Seaport_OrderFulfilled(
      where: {
        _or: [
          { offerTokens: { _contains: [$contractAddress] } },
          { considerationTokens: { _contains: [$contractAddress] } }
        ]
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      # ... fields
    }
  }
  ```
  
  **Use Cases:**
  - NFT sales: Contract appears in `offerTokens` (seller offering NFT)
  - NFT purchases/trades: Contract appears in `considerationTokens` (buyer requesting NFT)
  - Complex trades: NFT-for-NFT swaps where contract could be in either position
