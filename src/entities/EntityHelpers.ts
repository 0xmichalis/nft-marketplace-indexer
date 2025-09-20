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
  HandlerContext,
} from "generated";

/**
 * Get or create an Account entity
 */
export async function getOrCreateAccount(
  context: HandlerContext,
  address: string
): Promise<Account> {
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
  context: HandlerContext,
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
  context: HandlerContext,
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
 * Get all NFT contract and token IDs from offer/consideration arrays
 */
export function getNFTItems(
  offerItemTypes: number[],
  offerTokens: string[],
  offerIdentifiers: string[],
  considerationItemTypes: number[],
  considerationTokens: string[],
  considerationIdentifiers: string[]
): {
  offerNftItems: Array<{ contractAddress: string; tokenId: string; itemType: number }>;
  considerationNftItems: Array<{ contractAddress: string; tokenId: string; itemType: number }>;
} {
  const offerNftItems: Array<{ contractAddress: string; tokenId: string; itemType: number }> = [];
  const considerationNftItems: Array<{
    contractAddress: string;
    tokenId: string;
    itemType: number;
  }> = [];

  // Process offer items
  for (let i = 0; i < offerItemTypes.length; i++) {
    const itemType = offerItemTypes[i];

    // Only process NFTs (ERC721 = 2, ERC1155 = 3)
    if (itemType === 2 || itemType === 3) {
      const contractAddress = offerTokens[i].toLowerCase();
      const tokenId = offerIdentifiers[i];

      offerNftItems.push({ contractAddress, tokenId, itemType });
    }
  }

  // Process consideration items
  for (let i = 0; i < considerationItemTypes.length; i++) {
    const itemType = considerationItemTypes[i];

    // Only process NFTs (ERC721 = 2, ERC1155 = 3)
    if (itemType === 2 || itemType === 3) {
      const contractAddress = considerationTokens[i].toLowerCase();
      const tokenId = considerationIdentifiers[i];

      considerationNftItems.push({ contractAddress, tokenId, itemType });
    }
  }

  return {
    offerNftItems,
    considerationNftItems,
  };
}

/**
 * Create SaleNFT junction entities for a sale
 */
export async function createSaleNFTJunctions(
  context: HandlerContext,
  saleId: string,
  nftItems: Array<{ contractAddress: string; tokenId: string; itemType: number }>
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
    };

    context.SaleNFT.set(saleNft);
  }
}

/**
 * Create an AccountBuy junction for a given account and sale
 */
export function createAccountBuy(context: HandlerContext, accountId: string, saleId: string): void {
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
export function createAccountSell(
  context: HandlerContext,
  accountId: string,
  saleId: string
): void {
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
export function createAccountSwap(
  context: HandlerContext,
  accountId: string,
  saleId: string
): void {
  const swap: AccountSwap = {
    id: `${accountId}:${saleId}`,
    account_id: accountId,
    sale_id: saleId,
  };
  context.AccountSwap.set(swap);
}

/**
 * Classify a sale into account-level buy/sell/swap junctions based on:
 * 1. Payment presence determines sale vs swap
 * 2. Payment flow determines buyer/seller roles (who offers vs receives payments)
 * 3. Focus on main counterparties (offerer/recipient), not fee recipients
 *
 * Logic:
 * - No payments = Swap
 * - Payments in consideration = Offerer sells, recipient buys
 * - Payments in offer = Offerer buys, recipient sells
 */
export function createAccountJunctionsForSale(
  context: HandlerContext,
  params: {
    saleId: string;
    offererId: string;
    recipientId: string;
    offerItemTypes: number[];
    considerationItemTypes: number[];
  }
): void {
  const { saleId, offererId, recipientId, offerItemTypes, considerationItemTypes } = params;

  // Check for payments (ETH = 0, ERC20 = 1)
  const hasOfferPayments = offerItemTypes.some((type) => type === 0 || type === 1);
  const hasConsiderationPayments = considerationItemTypes.some((type) => type === 0 || type === 1);
  const hasPayments = hasOfferPayments || hasConsiderationPayments;

  // If no payments involved, classify as swap
  if (!hasPayments) {
    createAccountSwap(context, offererId, saleId);
    createAccountSwap(context, recipientId, saleId);
    return;
  }

  // If the consideration has payments, the recipient is buying from the offerer
  if (hasConsiderationPayments) {
    createAccountSell(context, offererId, saleId);
    createAccountBuy(context, recipientId, saleId);
  } else {
    createAccountBuy(context, offererId, saleId);
    createAccountSell(context, recipientId, saleId);
  }
}
