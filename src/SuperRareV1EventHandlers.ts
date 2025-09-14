import { SuperRareV1, Sale } from "generated";

SuperRareV1.Sold.handler(async ({ event, context }) => {
  const saleEntity: Sale = {
    id: `${event.chainId}_${event.transaction.hash}`,
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
    market: "SuperRare",

    offerer: event.params.seller,
    recipient: event.params.buyer,

    // For SuperRare, we have a simple sale structure
    // Offer: NFT (token ID)
    offerItemTypes: [2], // ERC721
    offerTokens: [event.srcAddress], // SuperRare contract address
    offerIdentifiers: [event.params.tokenId.toString()],
    offerAmounts: ["1"], // quantity 1 for NFT

    // Consideration: ETH payment
    considerationItemTypes: [0], // ETH
    considerationTokens: ["0x0000000000000000000000000000000000000000"], // ETH address
    considerationIdentifiers: ["0"], // no identifier for ETH
    considerationAmounts: [event.params.amount.toString()],
    considerationRecipients: [event.params.seller], // seller receives payment
  };

  context.Sale.set(saleEntity);
});
