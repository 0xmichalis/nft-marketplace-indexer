/**
 * Helper functions for creating and updating entities with relationships
 */
import {
  Account,
  NFTContract,
  NFTToken,
  SaleNFT,
  AccountBuy,
  AccountSell,
  AccountSwap,
} from "generated";

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
 * Create SaleNFT junction entities for a sale
 */
export async function createSaleNFTJunctions(
  context: any,
  saleId: string,
  nftItems: Array<{ contractAddress: string; tokenId: string; itemType: number }>,
  isOffer: boolean
): Promise<void> {
  for (const nftItem of nftItems) {
    const { contractAddress, tokenId } = nftItem;

    // Ensure NFT contract and token exist
    await getOrCreateNFTContract(context, contractAddress);
    const nftToken = await getOrCreateNFTToken(context, contractAddress, tokenId);

    // Create SaleNFT junction entity
    const saleNftId = `${saleId}:${nftToken.id}`;
    const saleNft: SaleNFT = {
      id: saleNftId,
      sale_id: saleId,
      nftToken_id: nftToken.id,
      isOffer: isOffer,
    };

    context.SaleNFT.set(saleNft);
  }
}

/**
 * Create an AccountBuy junction for a given account and sale
 */
export function createAccountBuy(context: any, accountId: string, saleId: string): void {
  const buy: AccountBuy = {
    id: `${accountId}:${saleId}`,
    account_id: accountId,
    sale_id: saleId,
  };
  context.AccountBuy.set(buy);
}

/**
 * Create an AccountSell junction for a given account and sale
 */
export function createAccountSell(context: any, accountId: string, saleId: string): void {
  const sell: AccountSell = {
    id: `${accountId}:${saleId}`,
    account_id: accountId,
    sale_id: saleId,
  };
  context.AccountSell.set(sell);
}

/**
 * Create an AccountSwap junction for a given account and sale
 */
export function createAccountSwap(context: any, accountId: string, saleId: string): void {
  const swap: AccountSwap = {
    id: `${accountId}:${saleId}`,
    account_id: accountId,
    sale_id: saleId,
  };
  context.AccountSwap.set(swap);
}

/**
 * Classify a sale into account-level buy/sell/swap junctions
 * based on where NFTs appear (offer vs consideration) and the primary
 * participants (offerer, recipient).
 */
export function createAccountJunctionsForSale(
  context: any,
  params: {
    saleId: string;
    offererId: string;
    recipientId: string;
    hasOfferNfts: boolean;
    hasConsiderationNfts: boolean;
  }
): void {
  const { saleId, offererId, recipientId, hasOfferNfts, hasConsiderationNfts } = params;

  if (hasOfferNfts && hasConsiderationNfts) {
    // Swap for both parties
    createAccountSwap(context, offererId, saleId);
    createAccountSwap(context, recipientId, saleId);
    return;
  }

  if (hasOfferNfts) {
    // NFTs in offer: offerer sells, recipient buys
    createAccountSell(context, offererId, saleId);
    createAccountBuy(context, recipientId, saleId);
    return;
  }

  if (hasConsiderationNfts) {
    // NFTs in consideration: offerer buys, recipient sells (best-effort)
    createAccountBuy(context, offererId, saleId);
    createAccountSell(context, recipientId, saleId);
  }
}
