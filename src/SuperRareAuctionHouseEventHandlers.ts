import { SuperRareAuctionHouse, Sale, AccountBuy, AccountSell } from "generated";

import {
  getOrCreateAccount,
  extractNFTIds,
  createSaleNFTJunctions,
} from "./entities/EntityHelpers";

SuperRareAuctionHouse.AuctionSettled.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;
  const tokenId = event.params.tokenId.toString();
  const paymentAmount = event.params.amount.toString();

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.seller);
  await getOrCreateAccount(context, event.params.bidder);

  // Extract NFT IDs from the sale
  const { nftItems: offerNftItems } = extractNFTIds(
    [2], // ERC721
    [event.params.contractAddress], // Original NFT contract address
    [tokenId],
    [], // empty consideration arrays for offer-only extraction
    [],
    []
  );

  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: event.transaction.hash,
    market: "SuperRare",

    // Account relationships (use _id fields to establish relationships)
    offerer_id: event.params.seller.toLowerCase(),
    recipient_id: event.params.bidder.toLowerCase(),

    // For SuperRareAuctionHouse AuctionSettled:
    // Offer: NFT from the original contract
    offerItemTypes: [2], // ERC721
    offerTokens: [event.params.contractAddress], // Original NFT contract address
    offerIdentifiers: [tokenId],
    offerAmounts: ["1"], // quantity 1 for NFT

    // Consideration: ETH payment
    considerationItemTypes: [0], // ETH
    considerationTokens: ["0x0000000000000000000000000000000000000000"], // ETH address
    considerationIdentifiers: ["0"], // no identifier for ETH
    considerationAmounts: [paymentAmount],
    considerationRecipients: [event.params.seller], // seller receives payment
  };

  // Create SaleNFT junction entities for offer NFTs
  await createSaleNFTJunctions(context, saleId, offerNftItems, true);

  // Save the Sale entity
  context.Sale.set(saleEntity);

  // Account-level classification
  const sellerId = event.params.seller.toLowerCase();
  const buyerId = event.params.bidder.toLowerCase();
  const seller: AccountSell = {
    id: `${sellerId}:${saleId}`,
    account_id: sellerId,
    sale_id: saleId,
  };
  const buyer: AccountBuy = { id: `${buyerId}:${saleId}`, account_id: buyerId, sale_id: saleId };
  context.AccountSell.set(seller);
  context.AccountBuy.set(buyer);
});
