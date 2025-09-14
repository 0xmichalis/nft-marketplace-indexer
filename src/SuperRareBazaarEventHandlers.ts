import { SuperRareBazaar, Sale } from "generated";

SuperRareBazaar.AcceptOffer.handler(async ({ event, context }) => {
  const saleEntity: Sale = {
    id: `${event.chainId}_${event.transaction.hash}`,
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
    market: "SuperRare",

    offerer: event.params.seller,
    recipient: event.params.bidder,

    // For SuperRareBazaar AcceptOffer:
    // Offer: NFT from the original contract
    offerItemTypes: [2], // ERC721
    offerTokens: [event.params.originContract], // Original NFT contract address
    offerIdentifiers: [event.params.tokenId.toString()],
    offerAmounts: ["1"], // quantity 1 for NFT

    // Consideration: Payment in the specified currency
    // Note: currencyAddress of 0x0 typically means ETH
    considerationItemTypes: [
      event.params.currencyAddress === "0x0000000000000000000000000000000000000000" ? 0 : 1,
    ], // ETH (0) or ERC20 (1)
    considerationTokens: [event.params.currencyAddress],
    considerationIdentifiers: ["0"], // no identifier for currency
    considerationAmounts: [event.params.amount.toString()],
    considerationRecipients: [event.params.seller], // seller receives payment
  };

  context.Sale.set(saleEntity);
});
