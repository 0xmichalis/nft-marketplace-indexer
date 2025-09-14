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
 * Common GraphQL queries - optimized using @derivedFrom relationships
 */
export const QUERIES = {
  /**
   * Find sales by user address - OPTIMIZED using @derivedFrom relationships
   */
  salesByUser: `
      query SalesByUser($userAddress: String!, $limit: Int) {
        Account(where: { id: { _eq: $userAddress } }) {
          id
          address
          salesAsOfferer(order_by: { timestamp: desc }, limit: $limit) {
            ${QUERY_FRAGMENTS.orderFullDetails}
          }
          salesAsRecipient(order_by: { timestamp: desc }, limit: $limit) {
            ${QUERY_FRAGMENTS.orderFullDetails}
          }
        }
      }
    `,

  /**
   * Find sales by NFT contract - OPTIMIZED using array contains
   */
  salesByNFTContract: `
      query SalesByNFTContract($contractAddress: String!, $limit: Int) {
        NFTContract(where: { id: { _eq: $contractAddress } }) {
          id
          address
          sales_id
        }
        Sale(
          where: { nftContractIds: { _contains: [$contractAddress] } }
          order_by: { timestamp: desc }
          limit: $limit
        ) {
          ${QUERY_FRAGMENTS.orderFullDetails}
        }
      }
    `,

  /**
   * Find sales by specific NFT token - OPTIMIZED using array contains
   */
  salesByNFTToken: `
      query SalesByNFTToken($contractAddress: String!, $tokenId: String!, $limit: Int) {
        NFTToken(
          where: { 
            contract: { id: { _eq: $contractAddress } },
            tokenId: { _eq: $tokenId }
          }
        ) {
          id
          tokenId
          contract {
            id
            address
          }
          sales_id
        }
        Sale(
          where: { nftTokenIds: { _contains: [$tokenId] } }
          order_by: { timestamp: desc }
          limit: $limit
        ) {
          ${QUERY_FRAGMENTS.orderFullDetails}
        }
      }
    `,

  /**
   * Get all tokens for an NFT contract with their recent sales
   */
  nftContractWithTokens: `
      query NFTContractWithTokens($contractAddress: String!, $limit: Int) {
        NFTContract(where: { id: { _eq: $contractAddress } }) {
          id
          address
          tokens(limit: $limit) {
            id
            tokenId
            sales(order_by: { timestamp: desc }, limit: 5) {
              ${QUERY_FRAGMENTS.orderFullDetails}
            }
          }
        }
      }
    `,

  /**
   * Get user's complete trading activity in one query
   */
  userCompleteActivity: `
      query UserCompleteActivity($userAddress: String!, $limit: Int) {
        Account(where: { id: { _eq: $userAddress } }) {
          id
          address
          salesAsOfferer(order_by: { timestamp: desc }, limit: $limit) {
            ${QUERY_FRAGMENTS.orderFullDetails}
            nftContract {
              id
              address
            }
            nftToken {
              id
              tokenId
            }
          }
          salesAsRecipient(order_by: { timestamp: desc }, limit: $limit) {
            ${QUERY_FRAGMENTS.orderFullDetails}
            nftContract {
              id
              address
            }
            nftToken {
              id
              tokenId
            }
          }
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

/**
 * Optimized response types using @derivedFrom relationships
 */
export interface AccountWithSalesResponse {
  id: string;
  address: string;
  salesAsOfferer: OrderFulfilledResponse[];
  salesAsRecipient: OrderFulfilledResponse[];
}

export interface NFTContractWithSalesResponse {
  id: string;
  address: string;
  sales: OrderFulfilledResponse[];
}

export interface NFTTokenWithSalesResponse {
  id: string;
  tokenId: string;
  contract: {
    id: string;
    address: string;
  };
  sales: OrderFulfilledResponse[];
}

export interface SalesByUserResponse {
  Account: AccountWithSalesResponse[];
}

export interface SalesByNFTContractResponse {
  NFTContract: NFTContractWithSalesResponse[];
  Sale: OrderFulfilledResponse[];
}

export interface SalesByNFTTokenResponse {
  NFTToken: NFTTokenWithSalesResponse[];
  Sale: OrderFulfilledResponse[];
}

export interface NFTContractWithTokensResponse {
  NFTContract: Array<{
    id: string;
    address: string;
    tokens: Array<{
      id: string;
      tokenId: string;
      sales: OrderFulfilledResponse[];
    }>;
  }>;
}

export interface UserCompleteActivityResponse {
  Account: Array<{
    id: string;
    address: string;
    salesAsOfferer: Array<
      OrderFulfilledResponse & {
        nftContract?: { id: string; address: string };
        nftToken?: { id: string; tokenId: string };
      }
    >;
    salesAsRecipient: Array<
      OrderFulfilledResponse & {
        nftContract?: { id: string; address: string };
        nftToken?: { id: string; tokenId: string };
      }
    >;
  }>;
}
