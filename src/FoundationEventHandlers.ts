import { Foundation, Sale } from "generated";

import {
  getOrCreateAccount,
  createSaleNFTJunctions,
  createAccountBuy,
  createAccountSell,
} from "./entities/EntityHelpers";

const FOUNDATION_TREASURY = "0x67Df244584b67E8C51B10aD610aAfFa9a402FdB6";

Foundation.BuyPriceAccepted.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;
  const tokenId = event.params.tokenId.toString();
  const nftContract = event.params.nftContract;
  const creatorRev = event.params.creatorRev.toString();
  const sellerRev = event.params.sellerRev.toString();
  const foundationRev = event.params.totalFees.toString();

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.buyer);
  await getOrCreateAccount(context, event.params.seller);

  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: event.transaction.hash,
    market: "Foundation",

    // Account relationships (use _id fields to establish relationships)
    offerer_id: event.params.seller.toLowerCase(),
    recipient_id: event.params.buyer.toLowerCase(),

    // For Foundation BuyPriceAccepted:
    // Offer: NFT from the specified contract
    offerItemTypes: [2],
    offerTokens: [nftContract],
    offerIdentifiers: [tokenId],
    offerAmounts: ["1"],

    considerationItemTypes: [0, 0, 0],
    considerationTokens: [
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
    ],
    considerationIdentifiers: ["0", "0", "0"],
    considerationAmounts: [sellerRev, creatorRev, foundationRev],
    // TODO: Need to add the creator address to the considerationRecipients (instead of nftContract)
    considerationRecipients: [event.params.seller, nftContract, FOUNDATION_TREASURY],
  };

  // Create SaleNFT junction entities for the NFT in the offer
  await createSaleNFTJunctions(context, saleId, [
    { contractAddress: nftContract, tokenId, itemType: 2 },
  ]);

  // Save the Sale entity
  context.Sale.set(saleEntity);

  // Account-level sale classification
  createAccountSell(context, saleEntity.offerer_id, saleId);
  createAccountBuy(context, saleEntity.recipient_id, saleId);
});
