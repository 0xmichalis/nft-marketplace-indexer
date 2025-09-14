import { Seaport, Sale } from "generated";

import {
  getOrCreateAccount,
  extractNFTIds,
  createSaleNFTJunctions,
} from "./entities/EntityHelpers";

Seaport.OrderFulfilled.handler(async ({ event, context }) => {
  // Extract offer data into parallel arrays
  const offerItemTypes: number[] = [];
  const offerTokens: string[] = [];
  const offerIdentifiers: string[] = [];
  const offerAmounts: string[] = [];

  for (let i = 0; i < event.params.offer.length; i++) {
    const spentItem = event.params.offer[i];
    offerItemTypes.push(Number(spentItem[0]));
    offerTokens.push(spentItem[1]);
    offerIdentifiers.push(spentItem[2].toString());
    offerAmounts.push(spentItem[3].toString());
  }

  // Extract consideration data into parallel arrays
  const considerationItemTypes: number[] = [];
  const considerationTokens: string[] = [];
  const considerationIdentifiers: string[] = [];
  const considerationAmounts: string[] = [];
  const considerationRecipients: string[] = [];

  for (let i = 0; i < event.params.consideration.length; i++) {
    const receivedItem = event.params.consideration[i];
    considerationItemTypes.push(Number(receivedItem[0]));
    considerationTokens.push(receivedItem[1]);
    considerationIdentifiers.push(receivedItem[2].toString());
    considerationAmounts.push(receivedItem[3].toString());
    considerationRecipients.push(receivedItem[4]);
  }

  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.offerer);
  await getOrCreateAccount(context, event.params.recipient);

  // Extract all NFT IDs from the sale
  const { nftItems: offerNftItems } = extractNFTIds(
    offerItemTypes,
    offerTokens,
    offerIdentifiers,
    [], // empty consideration arrays for offer-only extraction
    [],
    []
  );

  const { nftItems: considerationNftItems } = extractNFTIds(
    [], // empty offer arrays for consideration-only extraction
    [],
    [],
    considerationItemTypes,
    considerationTokens,
    considerationIdentifiers
  );

  // Create the main Sale entity
  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: event.transaction.hash,
    market: "Seaport",

    // Account relationships (use _id fields to establish relationships)
    offerer_id: event.params.offerer.toLowerCase(),
    recipient_id: event.params.recipient.toLowerCase(),

    // Inline offer arrays
    offerItemTypes,
    offerTokens,
    offerIdentifiers,
    offerAmounts,

    // Inline consideration arrays
    considerationItemTypes,
    considerationTokens,
    considerationIdentifiers,
    considerationAmounts,
    considerationRecipients,
  };

  // Create SaleNFT junction entities for offer NFTs
  await createSaleNFTJunctions(context, saleId, offerNftItems, true);

  // Create SaleNFT junction entities for consideration NFTs
  await createSaleNFTJunctions(context, saleId, considerationNftItems, false);

  // Save the Sale entity
  context.Sale.set(saleEntity);
});
