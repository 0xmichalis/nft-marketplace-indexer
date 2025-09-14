import { GraphQLClient } from 'graphql-request';

/**
 * GraphQL client for querying the deployed indexer endpoint
 */
export class IndexerGraphQLClient {
  private client: GraphQLClient;
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.client = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Execute a GraphQL query
   */
  async query<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    try {
      return await this.client.request<T>(query, variables);
    } catch (error) {
      console.error('GraphQL query failed:', error);
      throw error;
    }
  }

  /**
   * Get the endpoint URL
   */
  getEndpoint(): string {
    return this.endpoint;
  }
}

/**
 * Create a GraphQL client from environment variable
 * Returns null if GRAPH_API_URL is not set
 */
export function createGraphQLClient(): IndexerGraphQLClient | null {
  const endpoint = process.env.GRAPH_API_URL;
  
  if (!endpoint) {
    return null;
  }

  return new IndexerGraphQLClient(endpoint);
}

/**
 * Check if GraphQL endpoint is available
 */
export function isGraphQLEndpointAvailable(): boolean {
  return !!process.env.GRAPH_API_URL;
}

/**
 * GraphQL query fragments and common queries
 */
export const QUERY_FRAGMENTS = {
  orderFullDetails: `
    id
    orderHash
    offerer
    recipient
    transactionHash
    timestamp
    blockNumber
    offerTokens
    offerIdentifiers
    offerAmounts
    offerItemTypes
    considerationTokens
    considerationIdentifiers
    considerationAmounts
    considerationItemTypes
    considerationRecipients
  `,
};

/**
 * Common GraphQL queries
 */
export const QUERIES = {
  /**
   * Find orders by user address (offerer or recipient)
   */
  ordersByUser: `
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
        ${QUERY_FRAGMENTS.orderFullDetails}
      }
    }
  `,

  /**
   * Find orders by specific NFT contract (in offer OR consideration)
   */
  ordersByNFTContract: `
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
        ${QUERY_FRAGMENTS.orderFullDetails}
      }
    }
  `,
};

/**
 * Type definitions for query responses
 */
export interface OrderFulfilledResponse {
  id: string;
  orderHash: string;
  offerer: string;
  recipient: string;
  transactionHash: string;
  timestamp: string;
  blockNumber: string;
  offerTokens: string[];
  offerIdentifiers: string[];
  offerAmounts: string[];
  offerItemTypes: number[];
  considerationTokens: string[];
  considerationIdentifiers: string[];
  considerationAmounts: string[];
  considerationItemTypes: number[];
  considerationRecipients: string[];
}

export interface OrdersByUserResponse {
  Seaport_OrderFulfilled: OrderFulfilledResponse[];
}

export interface OrderStatsResponse {
  Seaport_OrderFulfilled_aggregate: {
    aggregate: {
      count: number;
    };
  };
}
