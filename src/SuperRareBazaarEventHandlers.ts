import { SuperRareBazaar, Sale, AccountBuy, AccountSell } from "generated";

import {
  getOrCreateAccount,
  extractNFTIds,
  createSaleNFTJunctions,
} from "./entities/EntityHelpers";

SuperRareBazaar.AcceptOffer.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;
  const tokenId = event.params.tokenId.toString();
  const paymentAmount = event.params.amount.toString();
  const isETH = event.params.currencyAddress === "0x0000000000000000000000000000000000000000";

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.seller);
  await getOrCreateAccount(context, event.params.bidder);

  // Extract NFT IDs from the sale
  const { nftItems: offerNftItems } = extractNFTIds(
    [2], // ERC721
    [event.params.originContract], // Original NFT contract address
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

    // For SuperRareBazaar AcceptOffer:
    // Offer: NFT from the original contract
    offerItemTypes: [2], // ERC721
    offerTokens: [event.params.originContract], // Original NFT contract address
    offerIdentifiers: [tokenId],
    offerAmounts: ["1"], // quantity 1 for NFT

    // Consideration: Payment in the specified currency
    // Note: currencyAddress of 0x0 typically means ETH
    considerationItemTypes: [isETH ? 0 : 1], // ETH (0) or ERC20 (1)
    considerationTokens: [event.params.currencyAddress],
    considerationIdentifiers: ["0"], // no identifier for currency
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

SuperRareBazaar.Sold.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;
  const tokenId = event.params.tokenId.toString();
  const paymentAmount = event.params.amount.toString();
  const isETH = event.params.currencyAddress === "0x0000000000000000000000000000000000000000";

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.seller);
  await getOrCreateAccount(context, event.params.buyer);

  // Extract NFT IDs from the sale
  const { nftItems: offerNftItems } = extractNFTIds(
    [2], // ERC721
    [event.params.originContract], // Original NFT contract address
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

    // For SuperRareBazaar Sold:
    // Offer: NFT from the original contract
    offerItemTypes: [2], // ERC721
    offerTokens: [event.params.originContract], // Original NFT contract address
    offerIdentifiers: [tokenId],
    offerAmounts: ["1"], // quantity 1 for NFT

    // Consideration: Payment in the specified currency
    // Note: currencyAddress of 0x0 typically means ETH
    considerationItemTypes: [isETH ? 0 : 1], // ETH (0) or ERC20 (1)
    considerationTokens: [event.params.currencyAddress],
    considerationIdentifiers: ["0"], // no identifier for currency
    considerationAmounts: [paymentAmount],
    considerationRecipients: [event.params.seller], // seller receives payment
  };

  // Create SaleNFT junction entities for offer NFTs
  await createSaleNFTJunctions(context, saleId, offerNftItems, true);

  // Save the Sale entity
  context.Sale.set(saleEntity);

  // Account-level classification
  {
    const sellerId = event.params.seller.toLowerCase();
    const buyerId = event.params.buyer.toLowerCase();
    const seller: AccountSell = {
      id: `${sellerId}:${saleId}`,
      account_id: sellerId,
      sale_id: saleId,
    };
    const buyer: AccountBuy = { id: `${buyerId}:${saleId}`, account_id: buyerId, sale_id: saleId };
    context.AccountSell.set(seller);
    context.AccountBuy.set(buyer);
  }
});

SuperRareBazaar.AuctionSettled.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;
  const tokenId = event.params.tokenId.toString();
  const paymentAmount = event.params.amount.toString();
  const isETH = event.params.currencyAddress === "0x0000000000000000000000000000000000000000";

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.seller);
  await getOrCreateAccount(context, event.params.bidder);

  // Extract NFT IDs from the sale
  const { nftItems: offerNftItems } = extractNFTIds(
    [2], // ERC721
    [event.params.contractAddress], // Contract address for the NFT
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

    // For SuperRareBazaar AuctionSettled:
    // Offer: NFT from the contract
    offerItemTypes: [2], // ERC721
    offerTokens: [event.params.contractAddress], // Contract address for the NFT
    offerIdentifiers: [tokenId],
    offerAmounts: ["1"], // quantity 1 for NFT

    // Consideration: Payment in the specified currency
    // Note: currencyAddress of 0x0 typically means ETH
    considerationItemTypes: [isETH ? 0 : 1], // ETH (0) or ERC20 (1)
    considerationTokens: [event.params.currencyAddress],
    considerationIdentifiers: ["0"], // no identifier for currency
    considerationAmounts: [paymentAmount],
    considerationRecipients: [event.params.seller], // seller receives payment
  };

  // Create SaleNFT junction entities for offer NFTs
  await createSaleNFTJunctions(context, saleId, offerNftItems, true);

  // Save the Sale entity
  context.Sale.set(saleEntity);

  // Account-level classification
  {
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
  }
});
