/**
 * Helper functions for creating and updating entities with relationships
 */
import { Account, NFTContract, NFTToken } from "generated";

/**
 * Get or create an Account entity
 */
export async function getOrCreateAccount(context: any, address: string): Promise<Account> {
  const accountId = address.toLowerCase();
  let account = await context.Account.get(accountId);

  if (!account) {
    account = {
      id: accountId,
      address: address,
    };
    context.Account.set(account);
  }

  return account;
}

/**
 * Get or create an NFTContract entity
 */
export async function getOrCreateNFTContract(
  context: any,
  contractAddress: string
): Promise<NFTContract> {
  const contractId = contractAddress.toLowerCase();
  let contract = await context.NFTContract.get(contractId);

  if (!contract) {
    contract = {
      id: contractId,
      address: contractAddress,
      sales_id: [],
    };
    context.NFTContract.set(contract);
  }

  return contract;
}

/**
 * Get or create an NFTToken entity
 */
export async function getOrCreateNFTToken(
  context: any,
  contractAddress: string,
  tokenId: string
): Promise<NFTToken> {
  const contractId = contractAddress.toLowerCase();
  const tokenKey = `${contractId}:${tokenId}`;
  let token = await context.NFTToken.get(tokenKey);

  if (!token) {
    token = {
      id: tokenKey,
      contract_id: contractId, // This will establish the relationship to NFTContract
      tokenId: tokenId,
      sales_id: [],
    };
    context.NFTToken.set(token);
  }

  return token;
}

/**
 * Update NFTContract entity with new sale information
 */
export function updateNFTContractWithSale(contract: NFTContract, saleId: string): NFTContract {
  return {
    ...contract,
    sales_id: [...contract.sales_id, saleId],
  };
}

/**
 * Update NFTToken entity with new sale information
 */
export function updateNFTTokenWithSale(token: NFTToken, saleId: string): NFTToken {
  return {
    ...token,
    sales_id: [...token.sales_id, saleId],
  };
}

/**
 * Extract all NFT contract and token IDs from offer/consideration arrays
 */
export function extractNFTIds(
  offerItemTypes: number[],
  offerTokens: string[],
  offerIdentifiers: string[],
  considerationItemTypes: number[],
  considerationTokens: string[],
  considerationIdentifiers: string[]
): {
  contractIds: string[];
  tokenIds: string[];
  nftItems: Array<{ contractAddress: string; tokenId: string; itemType: number }>;
} {
  const contractIds = new Set<string>();
  const tokenIds = new Set<string>();
  const nftItems: Array<{ contractAddress: string; tokenId: string; itemType: number }> = [];

  // Process offer items
  for (let i = 0; i < offerItemTypes.length; i++) {
    const itemType = offerItemTypes[i];

    // Only process NFTs (ERC721 = 2, ERC1155 = 3)
    if (itemType === 2 || itemType === 3) {
      const contractAddress = offerTokens[i].toLowerCase();
      const tokenId = offerIdentifiers[i];

      contractIds.add(contractAddress);
      tokenIds.add(`${contractAddress}:${tokenId}`);
      nftItems.push({ contractAddress, tokenId, itemType });
    }
  }

  // Process consideration items
  for (let i = 0; i < considerationItemTypes.length; i++) {
    const itemType = considerationItemTypes[i];

    // Only process NFTs (ERC721 = 2, ERC1155 = 3)
    if (itemType === 2 || itemType === 3) {
      const contractAddress = considerationTokens[i].toLowerCase();
      const tokenId = considerationIdentifiers[i];

      contractIds.add(contractAddress);
      tokenIds.add(`${contractAddress}:${tokenId}`);
      nftItems.push({ contractAddress, tokenId, itemType });
    }
  }

  return {
    contractIds: Array.from(contractIds),
    tokenIds: Array.from(tokenIds),
    nftItems,
  };
}

/**
 * Update NFT entities with new sale information
 */
export async function updateNFTEntitiesWithSale(
  context: any,
  saleId: string,
  contractIds: string[],
  tokenIds: string[]
): Promise<void> {
  // Update NFT contracts
  for (const contractId of contractIds) {
    const contract = await getOrCreateNFTContract(context, contractId);
    const updatedContract = updateNFTContractWithSale(contract, saleId);
    context.NFTContract.set(updatedContract);
  }

  // Update NFT tokens
  for (const tokenId of tokenIds) {
    const [contractAddress, tokenIdOnly] = tokenId.split(":");
    const token = await getOrCreateNFTToken(context, contractAddress, tokenIdOnly);
    const updatedToken = updateNFTTokenWithSale(token, saleId);
    context.NFTToken.set(updatedToken);
  }
}
