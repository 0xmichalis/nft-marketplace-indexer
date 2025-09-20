import { SuperRareV1, Sale } from "generated";

import {
  getOrCreateAccount,
  getNFTItems,
  createSaleNFTJunctions,
  createAccountBuy,
  createAccountSell,
} from "./entities/EntityHelpers";

SuperRareV1.Sold.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;
  const tokenId = event.params.tokenId.toString();
  const paymentAmount = event.params.amount.toString();

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.seller);
  await getOrCreateAccount(context, event.params.buyer);

  // Extract NFT IDs from the sale
  const { offerNftItems } = getNFTItems(
    [2], // ERC721
    [event.srcAddress], // SuperRare contract address
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
    recipient_id: event.params.buyer.toLowerCase(),

    // For SuperRare, we have a simple sale structure
    // Offer: NFT (token ID)
    offerItemTypes: [2], // ERC721
    offerTokens: [event.srcAddress], // SuperRare contract address
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
  await createSaleNFTJunctions(context, saleId, offerNftItems);

  // Save the Sale entity
  context.Sale.set(saleEntity);

  // Account-level sale classification
  createAccountSell(context, saleEntity.offerer_id, saleId);
  createAccountBuy(context, saleEntity.recipient_id, saleId);
});
