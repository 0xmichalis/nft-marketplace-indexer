import { GraphQLClient } from "graphql-request";

/**
 * GraphQL client for querying the deployed indexer endpoint
 */
export class IndexerGraphQLClient {
  readonly #client: GraphQLClient;
  private readonly hostname: string;

  constructor(endpoint: string) {
    this.hostname = URL.parse(endpoint)?.hostname || "unknown hostname";
    this.#client = new GraphQLClient(endpoint, {
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
      return await this.#client.request<T>(query, variables);
    } catch {
      // Transport and GraphQL errors can include credentials in nested request or response details.
      const message = `GraphQL query failed for ${this.hostname}`;
      console.error(message);
      throw new Error(message);
    }
  }

  /**
   * Get the endpoint hostname for diagnostics
   */
  getEndpoint(): string {
    return this.hostname;
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
