import { Foundation, Sale, HandlerContext, FoundationAuction } from "generated";

import {
  getOrCreateAccount,
  createSaleNFTJunctions,
  createAccountBuy,
  createAccountSell,
} from "./entities/EntityHelpers";

const FOUNDATION_TREASURY = "0x67Df244584b67E8C51B10aD610aAfFa9a402FdB6";

async function handleFoundationSale(
  context: HandlerContext,
  params: {
    chainId: number;
    transactionHash: string;
    blockTimestamp: number;
    nftContract: string;
    tokenId: string;
    buyer: string;
    seller: string;
    protocolFee: string;
    creatorFee: string;
    sellerRev: string;
  }
): Promise<void> {
  const timestamp = BigInt(params.blockTimestamp);
  const saleId = `${params.chainId}_${params.transactionHash}`;

  await getOrCreateAccount(context, params.buyer);
  await getOrCreateAccount(context, params.seller);

  // Build consideration arrays dynamically to exclude zero-value entries for creator and fees
  const considerationItemTypes: number[] = [0];
  const considerationTokens: string[] = ["0x0000000000000000000000000000000000000000"];
  const considerationIdentifiers: string[] = ["0"];
  const considerationAmounts: string[] = [params.sellerRev];
  const considerationRecipients: string[] = [params.seller];

  if (params.creatorFee !== "0") {
    considerationItemTypes.push(0);
    considerationTokens.push("0x0000000000000000000000000000000000000000");
    considerationIdentifiers.push("0");
    considerationAmounts.push(params.creatorFee);
    // TODO: replace nftContract with actual creator address; this will require RPC calls
    // which is going to slow down syncing
    considerationRecipients.push(params.nftContract);
  }

  if (params.protocolFee !== "0") {
    considerationItemTypes.push(0);
    considerationTokens.push("0x0000000000000000000000000000000000000000");
    considerationIdentifiers.push("0");
    considerationAmounts.push(params.protocolFee);
    considerationRecipients.push(FOUNDATION_TREASURY);
  }

  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: params.transactionHash,
    market: "Foundation",

    offerer_id: params.seller.toLowerCase(),
    recipient_id: params.buyer.toLowerCase(),

    offerItemTypes: [2],
    offerTokens: [params.nftContract],
    offerIdentifiers: [params.tokenId],
    offerAmounts: ["1"],

    considerationItemTypes,
    considerationTokens,
    considerationIdentifiers,
    considerationAmounts,
    considerationRecipients,
  };

  await createSaleNFTJunctions(context, saleId, [
    { contractAddress: params.nftContract, tokenId: params.tokenId, itemType: 2 },
  ]);

  context.Sale.set(saleEntity);
  createAccountSell(context, saleEntity.offerer_id, saleId);
  createAccountBuy(context, saleEntity.recipient_id, saleId);
}

Foundation.BuyPriceAccepted.handler(async ({ event, context }) => {
  await handleFoundationSale(context, {
    chainId: event.chainId,
    transactionHash: event.transaction.hash,
    blockTimestamp: event.block.timestamp,
    nftContract: event.params.nftContract,
    tokenId: event.params.tokenId.toString(),
    buyer: event.params.buyer,
    seller: event.params.seller,
    protocolFee: event.params.protocolFee.toString(),
    creatorFee: event.params.creatorFee.toString(),
    sellerRev: event.params.sellerRev.toString(),
  });
});

Foundation.OfferAccepted.handler(async ({ event, context }) => {
  await handleFoundationSale(context, {
    chainId: event.chainId,
    transactionHash: event.transaction.hash,
    blockTimestamp: event.block.timestamp,
    nftContract: event.params.nftContract,
    tokenId: event.params.tokenId.toString(),
    buyer: event.params.buyer,
    seller: event.params.seller,
    protocolFee: event.params.protocolFee.toString(),
    creatorFee: event.params.creatorFee.toString(),
    sellerRev: event.params.sellerRev.toString(),
  });
});

Foundation.PrivateSaleFinalized.handler(async ({ event, context }) => {
  await handleFoundationSale(context, {
    chainId: event.chainId,
    transactionHash: event.transaction.hash,
    blockTimestamp: event.block.timestamp,
    nftContract: event.params.nftContract,
    tokenId: event.params.tokenId.toString(),
    buyer: event.params.buyer,
    seller: event.params.seller,
    protocolFee: event.params.protocolFee.toString(),
    creatorFee: event.params.creatorFee.toString(),
    sellerRev: event.params.sellerRev.toString(),
  });
});

// Track auctions on creation so we can reference them on finalize
Foundation.ReserveAuctionCreated.handler(async ({ event, context }) => {
  const auction: FoundationAuction = {
    id: event.params.auctionId.toString(),
    nftContract: event.params.nftContract,
    tokenId: event.params.tokenId.toString(),
  };

  context.FoundationAuction.set(auction);
});

Foundation.ReserveAuctionFinalized.handler(async ({ event, context }) => {
  const auctionId = event.params.auctionId.toString();
  const auction = await context.FoundationAuction.get(auctionId);
  if (!auction) {
    return;
  }

  await handleFoundationSale(context, {
    chainId: event.chainId,
    transactionHash: event.transaction.hash,
    blockTimestamp: event.block.timestamp,
    nftContract: auction.nftContract,
    tokenId: auction.tokenId,
    buyer: event.params.bidder,
    seller: event.params.seller,
    protocolFee: event.params.protocolFee.toString(),
    creatorFee: event.params.creatorFee.toString(),
    sellerRev: event.params.ownerRev.toString(),
  });
});
