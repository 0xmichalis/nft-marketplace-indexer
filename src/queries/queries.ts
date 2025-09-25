/**
 * GraphQL query fragments and common queries
 */
export const QUERY_FRAGMENTS = {
  orderFullDetails: `
      id
      offerer {
        address
      }
      recipient {
        address
      }
      transactionHash
      timestamp
      market
      offerTokens
      offerIdentifiers
      offerAmounts
      offerItemTypes
      considerationTokens
      considerationIdentifiers
      considerationAmounts
      considerationItemTypes
      considerationRecipients
      nfts {
        id
        nftToken {
          id
          tokenId
          contract {
            id
            address
          }
        }
      }
    `,
};

/**
 * Common GraphQL queries
 */
export const QUERIES = {
  /**
   * Find sales by user address
   */
  salesByUser: `
      query SalesByUser($userAddress: String!, $limit: Int) {
        Account(where: { address: { _eq: $userAddress } }) {
          id
          address
          buys(order_by: { sale: { timestamp: desc } }, limit: $limit) {
            sale { ${QUERY_FRAGMENTS.orderFullDetails} }
          }
          sells(order_by: { sale: { timestamp: desc } }, limit: $limit) {
            sale { ${QUERY_FRAGMENTS.orderFullDetails} }
          }
          swaps(order_by: { sale: { timestamp: desc } }, limit: $limit) {
            sale { ${QUERY_FRAGMENTS.orderFullDetails} }
          }
        }
      }
    `,

  /**
   * Find sales by NFT contract
   */
  salesByNFTContract: `
      query SalesByNFTContract($contractAddress: String!, $limit: Int) {
        NFTContract(where: { address: { _eq: $contractAddress } }) {
          id
          address
          tokens {
            sales(order_by: { sale: { timestamp: desc } }, limit: $limit) {
              sale {
                ${QUERY_FRAGMENTS.orderFullDetails}
              }
            }
          }
        }
      }
    `,

  /**
   * Find sales by specific NFT token
   */
  salesByNFTToken: `
      query SalesByNFTToken($contractAddress: String!, $tokenId: String!, $limit: Int) {
        NFTToken(
          where: { 
            contract: { address: { _eq: $contractAddress } },
            tokenId: { _eq: $tokenId }
          }
        ) {
          id
          tokenId
          contract {
            id
            address
          }
          sales(order_by: { sale: { timestamp: desc } }, limit: $limit) {
            sale {
              ${QUERY_FRAGMENTS.orderFullDetails}
            }
          }
        }
      }
    `,
};

/**
 * Type definitions for query responses
 */
export interface SaleNFT {
  id: string;
  nftToken: {
    id: string;
    tokenId: string;
    contract: {
      id: string;
      address: string;
    };
  };
}

export interface Sale {
  id: string;
  timestamp: string;
  transactionHash: string;
  market: string;

  offerer: {
    address: string;
  };
  recipient: {
    address: string;
  };

  nfts: SaleNFT[];

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
  Account: Array<{
    id: string;
    address: string;
    buys: Array<{ sale: Sale }>;
    sells: Array<{ sale: Sale }>;
    swaps: Array<{ sale: Sale }>;
  }>;
}

/**
 * Optimized response types using @derivedFrom relationships
 */
export interface AccountWithSalesResponse {
  id: string;
  address: string;
  buys: Array<{ sale: Sale }>;
  sells: Array<{ sale: Sale }>;
  swaps: Array<{ sale: Sale }>;
}

export interface NFTContractWithSalesResponse {
  NFTContract: Array<{
    id: string;
    address: string;
    tokens: Array<{
      sales: Array<{
        sale: Sale;
      }>;
    }>;
  }>;
}

export interface NFTTokenWithSalesResponse {
  NFTToken: Array<{
    id: string;
    tokenId: string;
    contract: {
      id: string;
      address: string;
    };
    sales: Array<{
      sale: Sale;
    }>;
  }>;
}

export type SalesByNFTContractResponse = NFTContractWithSalesResponse;
export type SalesByNFTTokenResponse = NFTTokenWithSalesResponse;

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
    buys: Array<{ sale: Sale }>;
    sells: Array<{ sale: Sale }>;
    swaps: Array<{ sale: Sale }>;
  }>;
}
