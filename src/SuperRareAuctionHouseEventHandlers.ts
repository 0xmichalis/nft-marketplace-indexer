import { SuperRareAuctionHouse, Sale } from "generated";

import {
  getOrCreateAccount,
  extractNFTIds,
  updateNFTEntitiesWithSale,
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
  const { contractIds, tokenIds } = extractNFTIds(
    [2], // ERC721
    [event.params.contractAddress], // Original NFT contract address
    [tokenId],
    [0], // ETH
    ["0x0000000000000000000000000000000000000000"], // ETH address
    ["0"] // no identifier for ETH
  );

  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: event.transaction.hash,
    market: "SuperRare",

    // Account relationships (use _id fields to establish relationships)
    offerer_id: event.params.seller.toLowerCase(),
    recipient_id: event.params.bidder.toLowerCase(),

    // NFT arrays for easy querying
    nftContractIds: contractIds,
    nftTokenIds: tokenIds,

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

  // Update NFT entities with this sale
  await updateNFTEntitiesWithSale(context, saleId, contractIds, tokenIds);

  // Save the Sale entity
  context.Sale.set(saleEntity);
});
