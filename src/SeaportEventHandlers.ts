import { Seaport, Sale } from "generated";

import {
  getOrCreateAccount,
  extractNFTIds,
  createSaleNFTJunctions,
  createAccountJunctionsForSale,
} from "./entities/EntityHelpers";

// Helper function to consolidate identical items by summing their amounts
function consolidateItems(
  items: { itemType: number; token: string; identifier: string; amount: string; offerer: string }[]
): { itemType: number; token: string; identifier: string; amount: string }[] {
  const consolidated = new Map<
    string,
    { itemType: number; token: string; identifier: string; amount: bigint }
  >();

  for (const item of items) {
    const key = `${item.itemType}-${item.token.toLowerCase()}-${item.identifier}`;
    const existing = consolidated.get(key);

    if (existing) {
      existing.amount += BigInt(item.amount);
    } else {
      consolidated.set(key, {
        itemType: item.itemType,
        token: item.token,
        identifier: item.identifier,
        amount: BigInt(item.amount),
      });
    }
  }

  return Array.from(consolidated.values()).map((item) => ({
    ...item,
    amount: item.amount.toString(),
  }));
}

// Helper function to consolidate identical considerations with recipients
function consolidateItemsWithRecipients(
  items: {
    itemType: number;
    token: string;
    identifier: string;
    amount: string;
    recipient: string;
  }[]
): { itemType: number; token: string; identifier: string; amount: string; recipient: string }[] {
  const consolidated = new Map<
    string,
    { itemType: number; token: string; identifier: string; amount: bigint; recipient: string }
  >();

  for (const item of items) {
    const key = `${item.itemType}-${item.token.toLowerCase()}-${item.identifier}-${item.recipient.toLowerCase()}`;
    const existing = consolidated.get(key);

    if (existing) {
      existing.amount += BigInt(item.amount);
    } else {
      consolidated.set(key, {
        itemType: item.itemType,
        token: item.token,
        identifier: item.identifier,
        amount: BigInt(item.amount),
        recipient: item.recipient,
      });
    }
  }

  return Array.from(consolidated.values()).map((item) => ({
    ...item,
    amount: item.amount.toString(),
  }));
}

// Helper function to net out items that appear in both offers and considerations
function netOutOfferConsiderationItems(
  offers: { itemType: number; token: string; identifier: string; amount: string }[],
  considerations: {
    itemType: number;
    token: string;
    identifier: string;
    amount: string;
    recipient: string;
  }[]
): {
  offers: { itemType: number; token: string; identifier: string; amount: string }[];
  considerations: {
    itemType: number;
    token: string;
    identifier: string;
    amount: string;
    recipient: string;
  }[];
} {
  const finalOffers: { itemType: number; token: string; identifier: string; amount: string }[] = [];
  const finalConsiderations: {
    itemType: number;
    token: string;
    identifier: string;
    amount: string;
    recipient: string;
  }[] = [];

  // Create maps for easy lookup
  const offerMap = new Map<
    string,
    { itemType: number; token: string; identifier: string; amount: bigint }
  >();
  const considerationMap = new Map<
    string,
    { itemType: number; token: string; identifier: string; amount: bigint; recipient: string }
  >();

  // Populate offer map
  for (const offer of offers) {
    const key = `${offer.itemType}-${offer.token.toLowerCase()}-${offer.identifier}`;
    offerMap.set(key, {
      itemType: offer.itemType,
      token: offer.token,
      identifier: offer.identifier,
      amount: BigInt(offer.amount),
    });
  }

  // Populate consideration map
  for (const consideration of considerations) {
    const key = `${consideration.itemType}-${consideration.token.toLowerCase()}-${consideration.identifier}`;
    considerationMap.set(key, {
      itemType: consideration.itemType,
      token: consideration.token,
      identifier: consideration.identifier,
      amount: BigInt(consideration.amount),
      recipient: consideration.recipient,
    });
  }

  // Process all unique items and net them out
  const allKeys = new Set([...offerMap.keys(), ...considerationMap.keys()]);

  for (const key of allKeys) {
    const offerItem = offerMap.get(key);
    const considerationItem = considerationMap.get(key);

    const offerAmount = offerItem?.amount || 0n;
    const considerationAmount = considerationItem?.amount || 0n;

    // If there's a net offer (more offered than received), add to offers
    if (offerAmount > considerationAmount) {
      finalOffers.push({
        itemType: offerItem!.itemType,
        token: offerItem!.token,
        identifier: offerItem!.identifier,
        amount: (offerAmount - considerationAmount).toString(),
      });
    }

    // If there's a net consideration (more received than offered), add to considerations
    if (considerationAmount > offerAmount) {
      finalConsiderations.push({
        itemType: considerationItem!.itemType,
        token: considerationItem!.token,
        identifier: considerationItem!.identifier,
        amount: (considerationAmount - offerAmount).toString(),
        recipient: considerationItem!.recipient,
      });
    }

    // If amounts are equal, they cancel out completely
  }

  return { offers: finalOffers, considerations: finalConsiderations };
}

// Helper function to merge multiple OrderFulfilled events in the same transaction
function mergeOrderFulfilledEvents(
  existingSale: Sale,
  newEvent: {
    offerItemTypes: number[];
    offerTokens: string[];
    offerIdentifiers: string[];
    offerAmounts: string[];
    considerationItemTypes: number[];
    considerationTokens: string[];
    considerationIdentifiers: string[];
    considerationAmounts: string[];
    considerationRecipients: string[];
    offerer: string;
  }
): Sale {
  // For merging multiple OrderFulfilled events in the same transaction,
  // we need to understand the relationship between offers and considerations across events
  // The key insight: what one party offers becomes a consideration for the other party

  // Track all offers and considerations from both events
  const allOffers: {
    itemType: number;
    token: string;
    identifier: string;
    amount: string;
    offerer: string;
  }[] = [];
  const allConsiderations: {
    itemType: number;
    token: string;
    identifier: string;
    amount: string;
    recipient: string;
  }[] = [];

  // Add existing offers
  for (let i = 0; i < existingSale.offerItemTypes.length; i++) {
    allOffers.push({
      itemType: existingSale.offerItemTypes[i],
      token: existingSale.offerTokens[i],
      identifier: existingSale.offerIdentifiers[i],
      amount: existingSale.offerAmounts[i],
      offerer: existingSale.offerer_id,
    });
  }

  // Add new offers
  for (let i = 0; i < newEvent.offerItemTypes.length; i++) {
    allOffers.push({
      itemType: newEvent.offerItemTypes[i],
      token: newEvent.offerTokens[i],
      identifier: newEvent.offerIdentifiers[i],
      amount: newEvent.offerAmounts[i],
      offerer: newEvent.offerer,
    });
  }

  // Add existing considerations
  for (let i = 0; i < existingSale.considerationItemTypes.length; i++) {
    allConsiderations.push({
      itemType: existingSale.considerationItemTypes[i],
      token: existingSale.considerationTokens[i],
      identifier: existingSale.considerationIdentifiers[i],
      amount: existingSale.considerationAmounts[i],
      recipient: existingSale.considerationRecipients[i],
    });
  }

  // Add new considerations
  for (let i = 0; i < newEvent.considerationItemTypes.length; i++) {
    allConsiderations.push({
      itemType: newEvent.considerationItemTypes[i],
      token: newEvent.considerationTokens[i],
      identifier: newEvent.considerationIdentifiers[i],
      amount: newEvent.considerationAmounts[i],
      recipient: newEvent.considerationRecipients[i],
    });
  }

  // Now filter considerations based on the primary offerer (first one to create the sale)
  const primaryOfferer = existingSale.offerer_id;

  // The final offers are what the primary offerer actually offers (not what they receive as considerations)
  const filteredOffers = allOffers.filter((offer) => offer.offerer === primaryOfferer);

  // The final considerations are what the primary offerer receives
  const filteredConsiderations = allConsiderations.filter(
    (consideration) => consideration.recipient.toLowerCase() === primaryOfferer
  );

  // Consolidate identical items
  const consolidatedOffers = consolidateItems(filteredOffers);
  const consolidatedConsiderations = consolidateItemsWithRecipients(filteredConsiderations);

  // Net out items that appear in both offers and considerations
  const nettedResult = netOutOfferConsiderationItems(
    consolidatedOffers,
    consolidatedConsiderations
  );

  // Convert to arrays for the entity
  const mergedOfferItemTypes = nettedResult.offers.map((item) => item.itemType);
  const mergedOfferTokens = nettedResult.offers.map((item) => item.token);
  const mergedOfferIdentifiers = nettedResult.offers.map((item) => item.identifier);
  const mergedOfferAmounts = nettedResult.offers.map((item) => item.amount);

  const mergedConsiderationItemTypes = nettedResult.considerations.map((item) => item.itemType);
  const mergedConsiderationTokens = nettedResult.considerations.map((item) => item.token);
  const mergedConsiderationIdentifiers = nettedResult.considerations.map((item) => item.identifier);
  const mergedConsiderationAmounts = nettedResult.considerations.map((item) => item.amount);
  const mergedConsiderationRecipients = nettedResult.considerations.map((item) => item.recipient);

  return {
    ...existingSale,
    offerItemTypes: mergedOfferItemTypes,
    offerTokens: mergedOfferTokens,
    offerIdentifiers: mergedOfferIdentifiers,
    offerAmounts: mergedOfferAmounts,
    considerationItemTypes: mergedConsiderationItemTypes,
    considerationTokens: mergedConsiderationTokens,
    considerationIdentifiers: mergedConsiderationIdentifiers,
    considerationAmounts: mergedConsiderationAmounts,
    considerationRecipients: mergedConsiderationRecipients,
  };
}

Seaport.OrderFulfilled.handler(async ({ event, context }) => {
  // Extract offer data into parallel arrays
  const offerItemTypes: number[] = [];
  const offerTokens: string[] = [];
  const offerIdentifiers: string[] = [];
  const offerAmounts: string[] = [];

  for (let i = 0; i < event.params.offer.length; i++) {
    const spentItem = event.params.offer[i];
    const amount = spentItem[3].toString();
    // Skip empty ETH items (amount = 0)
    if (Number(spentItem[0]) === 0 && amount === "0") {
      continue;
    }
    offerItemTypes.push(Number(spentItem[0]));
    offerTokens.push(spentItem[1]);
    offerIdentifiers.push(spentItem[2].toString());
    offerAmounts.push(amount);
  }

  // Extract consideration data into parallel arrays
  const considerationItemTypes: number[] = [];
  const considerationTokens: string[] = [];
  const considerationIdentifiers: string[] = [];
  const considerationAmounts: string[] = [];
  const considerationRecipients: string[] = [];

  for (let i = 0; i < event.params.consideration.length; i++) {
    const receivedItem = event.params.consideration[i];
    const amount = receivedItem[3].toString();
    // Skip empty ETH items (amount = 0)
    if (Number(receivedItem[0]) === 0 && amount === "0") {
      continue;
    }
    considerationItemTypes.push(Number(receivedItem[0]));
    considerationTokens.push(receivedItem[1]);
    considerationIdentifiers.push(receivedItem[2].toString());
    considerationAmounts.push(amount);
    considerationRecipients.push(receivedItem[4]);
  }

  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;

  // Check if a Sale entity already exists for this transaction
  let existingSale = await context.Sale.get(saleId);

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

  let saleEntity: Sale;

  if (existingSale) {
    saleEntity = mergeOrderFulfilledEvents(existingSale, {
      offerItemTypes,
      offerTokens,
      offerIdentifiers,
      offerAmounts,
      considerationItemTypes,
      considerationTokens,
      considerationIdentifiers,
      considerationAmounts,
      considerationRecipients,
      offerer: event.params.offerer.toLowerCase(),
    });
  } else {
    // Create new sale entity
    saleEntity = {
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
  }

  // Create SaleNFT junction entities for offer NFTs
  await createSaleNFTJunctions(context, saleId, offerNftItems, true);

  // Create SaleNFT junction entities for consideration NFTs
  await createSaleNFTJunctions(context, saleId, considerationNftItems, false);

  // Save the Sale entity
  context.Sale.set(saleEntity);

  // Account-level classification: buys, sells, swaps
  // Use saleEntity arrays to determine presence of NFTs (ERC721=2, ERC1155=3)
  const hasOfferNfts = saleEntity.offerItemTypes.some((type) => type === 2 || type === 3);
  const hasConsiderationNfts = saleEntity.considerationItemTypes.some(
    (type) => type === 2 || type === 3
  );

  createAccountJunctionsForSale(context, {
    saleId,
    offererId: event.params.offerer.toLowerCase(),
    recipientId: event.params.recipient.toLowerCase(),
    hasOfferNfts,
    hasConsiderationNfts,
  });
});
