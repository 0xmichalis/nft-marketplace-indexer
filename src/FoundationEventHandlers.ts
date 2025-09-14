import { Foundation, Sale } from "generated";

import { getOrCreateAccount, createSaleNFTJunctions } from "./entities/EntityHelpers";

Foundation.BuyPriceAccepted.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;
  const tokenId = event.params.tokenId.toString();
  const nftContract = event.params.nftContract;
  const creatorRev = event.params.creatorRev.toString();
  const sellerRev = event.params.sellerRev.toString();

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.buyer);
  await getOrCreateAccount(context, event.params.seller);

  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: event.transaction.hash,
    market: "Foundation",

    // Account relationships (use _id fields to establish relationships)
    offerer_id: event.params.seller.toLowerCase(), // seller
    recipient_id: event.params.buyer.toLowerCase(), // buyer

    // For Foundation BuyPriceAccepted:
    // Offer: NFT from the specified contract
    offerItemTypes: [2], // ERC721
    offerTokens: [nftContract], // NFT contract address
    offerIdentifiers: [tokenId],
    offerAmounts: ["1"], // quantity 1 for NFT

    // Consideration: ETH payment split between seller and creator
    considerationItemTypes: [0, 0], // ETH for both seller and creator
    considerationTokens: [
      "0x0000000000000000000000000000000000000000", // ETH address
      "0x0000000000000000000000000000000000000000", // ETH address
    ],
    considerationIdentifiers: ["0", "0"], // no identifier for ETH
    considerationAmounts: [sellerRev, creatorRev], // seller and creator amounts
    considerationRecipients: [event.params.seller, event.params.seller], // both go to seller (Foundation handles creator split internally)
  };

  // Create SaleNFT junction entities for the NFT in the offer
  await createSaleNFTJunctions(
    context,
    saleId,
    [{ contractAddress: nftContract, tokenId, itemType: 2 }],
    true
  );

  // Save the Sale entity
  context.Sale.set(saleEntity);
});
