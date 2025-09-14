/**
 * GraphQL query fragments and common queries
 */
export const QUERY_FRAGMENTS = {
  orderFullDetails: `
      id
      offerer
      recipient
      transactionHash
      timestamp
      offerTokens
      nftContractIds
      nftTokenIds
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
};

/**
 * Type definitions for query responses
 */
export interface Sale {
  id: string;
  timestamp: string;
  transactionHash: string;
  market: string;

  offerer: string;
  recipient: string;

  nftContractIds: string[];
  nftTokenIds: string[];

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

export interface SalesByUserResponse {
  sales: Sale[];
}

/**
 * Optimized response types using @derivedFrom relationships
 */
export interface AccountWithSalesResponse {
  id: string;
  address: string;
  salesAsOfferer: Sale[];
  salesAsRecipient: Sale[];
}

export interface NFTContractWithSalesResponse {
  id: string;
  address: string;
  sales: Sale[];
}

export interface NFTTokenWithSalesResponse {
  id: string;
  tokenId: string;
  contract: {
    id: string;
    address: string;
  };
  sales_id: string[];
}

export interface SalesByUserResponse {
  account: AccountWithSalesResponse[];
}

export interface SalesByNFTContractResponse {
  nftContract: NFTContractWithSalesResponse[];
  sales: Sale[];
}

export interface SalesByNFTTokenResponse {
  nftToken: NFTTokenWithSalesResponse[];
  sales: Sale[];
}

export interface NFTContractWithTokensResponse {
  nftContract: Array<{
    id: string;
    address: string;
    tokens: Array<{
      id: string;
      tokenId: string;
      sales: Sale[];
    }>;
  }>;
}

export interface UserCompleteActivityResponse {
  account: Array<{
    id: string;
    address: string;
    salesAsOfferer: Array<Sale>;
    salesAsRecipient: Array<Sale>;
  }>;
}
