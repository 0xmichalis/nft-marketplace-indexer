import { KnownOrigin, Sale } from "generated";

import {
  getOrCreateAccount,
  extractNFTIds,
  createSaleNFTJunctions,
} from "./entities/EntityHelpers";

KnownOrigin.BuyNowPurchased.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;
  const tokenId = event.params.tokenId.toString();
  const price = event.params.price.toString();

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.buyer);
  await getOrCreateAccount(context, event.params.currentOwner);

  // Extract NFT IDs from the sale
  // For KnownOrigin, the NFT is from the KnownOrigin contract itself
  const { nftItems: offerNftItems } = extractNFTIds(
    [2], // ERC721
    [event.srcAddress], // KnownOrigin contract address
    [tokenId],
    [], // empty consideration arrays for offer-only extraction
    [],
    []
  );

  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: event.transaction.hash,
    market: "KnownOrigin",

    // Account relationships (use _id fields to establish relationships)
    offerer_id: event.params.currentOwner.toLowerCase(), // seller
    recipient_id: event.params.buyer.toLowerCase(), // buyer

    // For KnownOrigin BuyNowPurchased:
    // Offer: NFT from the KnownOrigin contract
    offerItemTypes: [2], // ERC721
    offerTokens: [event.srcAddress], // KnownOrigin contract address
    offerIdentifiers: [tokenId],
    offerAmounts: ["1"], // quantity 1 for NFT

    // Consideration: ETH payment
    considerationItemTypes: [0], // ETH
    considerationTokens: ["0x0000000000000000000000000000000000000000"], // ETH address
    considerationIdentifiers: ["0"], // no identifier for ETH
    considerationAmounts: [price],
    considerationRecipients: [event.params.currentOwner], // seller receives payment
  };

  // Create SaleNFT junction entities for offer NFTs
  await createSaleNFTJunctions(context, saleId, offerNftItems, true);

  // Save the Sale entity
  context.Sale.set(saleEntity);
});
