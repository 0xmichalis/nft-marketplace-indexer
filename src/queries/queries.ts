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
  timestamp: string;
  transactionHash: string;

  offerer: string;
  recipient: string;

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
