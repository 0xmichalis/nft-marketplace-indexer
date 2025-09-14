import { GraphQLClient } from "graphql-request";

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
        "Content-Type": "application/json",
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
      console.error("GraphQL query failed:", error);
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
