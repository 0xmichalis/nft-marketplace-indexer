import { CryptoPunks, Sale } from "generated";

import {
  getOrCreateAccount,
  createSaleNFTJunctions,
  createAccountBuy,
  createAccountSell,
} from "./entities/EntityHelpers";

CryptoPunks.PunkBought.handler(async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;
  const tokenId = event.params.tokenId.toString();
  const value = event.params.value.toString();
  const nftContract = event.srcAddress; // CryptoPunks contract address
  const fromAddress = event.params.fromAddress;
  const toAddress = event.params.toAddress;

  // Ensure Account entities exist
  await getOrCreateAccount(context, fromAddress);
  await getOrCreateAccount(context, toAddress);

  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: event.transaction.hash,
    market: "CryptoPunks",

    // Account relationships (use _id fields to establish relationships)
    offerer_id: fromAddress.toLowerCase(), // seller
    recipient_id: toAddress.toLowerCase(), // buyer

    // For CryptoPunks PunkBought:
    // Offer: NFT from the CryptoPunks contract
    offerItemTypes: [2], // ERC721
    offerTokens: [nftContract], // CryptoPunks contract address
    offerIdentifiers: [tokenId],
    offerAmounts: ["1"], // quantity 1 for NFT

    // Consideration: ETH payment
    considerationItemTypes: [0], // ETH
    considerationTokens: [
      "0x0000000000000000000000000000000000000000", // ETH address
    ],
    considerationIdentifiers: ["0"], // no identifier for ETH
    considerationAmounts: [value], // sale price
    considerationRecipients: [fromAddress], // payment goes to seller
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
