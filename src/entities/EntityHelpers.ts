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
    };
    context.NFTToken.set(token);
  }

  return token;
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
 * Ensure NFT entities exist for a sale (relationships are handled via @derivedFrom)
 */
export async function updateNFTEntitiesWithSale(
  context: any,
  saleId: string,
  contractIds: string[],
  tokenIds: string[]
): Promise<void> {
  // Ensure NFT contracts exist
  for (const contractId of contractIds) {
    await getOrCreateNFTContract(context, contractId);
  }

  // Ensure NFT tokens exist
  for (const tokenId of tokenIds) {
    const [contractAddress, tokenIdOnly] = tokenId.split(":");
    await getOrCreateNFTToken(context, contractAddress, tokenIdOnly);
  }
}
