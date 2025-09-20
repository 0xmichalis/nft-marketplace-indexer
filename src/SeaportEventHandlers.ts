import { Seaport, Sale } from "generated";

import {
  getOrCreateAccount,
  createSaleNFTJunctions,
  createAccountJunctionsForSale,
  getNFTItems,
} from "./entities/EntityHelpers";

// Helper function to extract offer data from OrderFulfilled event
function getOfferData(offer: any[]): {
  offerItemTypes: number[];
  offerTokens: string[];
  offerIdentifiers: string[];
  offerAmounts: string[];
} {
  const offerItemTypes: number[] = [];
  const offerTokens: string[] = [];
  const offerIdentifiers: string[] = [];
  const offerAmounts: string[] = [];

  for (let i = 0; i < offer.length; i++) {
    const spentItem = offer[i];
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

  return {
    offerItemTypes,
    offerTokens,
    offerIdentifiers,
    offerAmounts,
  };
}

// Helper function to extract consideration data from OrderFulfilled event
function getConsiderationData(consideration: any[]): {
  considerationItemTypes: number[];
  considerationTokens: string[];
  considerationIdentifiers: string[];
  considerationAmounts: string[];
  considerationRecipients: string[];
} {
  const considerationItemTypes: number[] = [];
  const considerationTokens: string[] = [];
  const considerationIdentifiers: string[] = [];
  const considerationAmounts: string[] = [];
  const considerationRecipients: string[] = [];

  for (let i = 0; i < consideration.length; i++) {
    const receivedItem = consideration[i];
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

  return {
    considerationItemTypes,
    considerationTokens,
    considerationIdentifiers,
    considerationAmounts,
    considerationRecipients,
  };
}

// Helper function to preprocess sale data by moving consideration items
// that go to the order recipient into offers
function preprocessSaleData(
  offerItemTypes: number[],
  offerTokens: string[],
  offerIdentifiers: string[],
  offerAmounts: string[],
  considerationItemTypes: number[],
  considerationTokens: string[],
  considerationIdentifiers: string[],
  considerationAmounts: string[],
  considerationRecipients: string[],
  orderRecipient: string
): {
  finalOfferItemTypes: number[];
  finalOfferTokens: string[];
  finalOfferIdentifiers: string[];
  finalOfferAmounts: string[];
  finalConsiderationItemTypes: number[];
  finalConsiderationTokens: string[];
  finalConsiderationIdentifiers: string[];
  finalConsiderationAmounts: string[];
  finalConsiderationRecipients: string[];
} {
  // Start with original offers
  const finalOfferItemTypes = [...offerItemTypes];
  const finalOfferTokens = [...offerTokens];
  const finalOfferIdentifiers = [...offerIdentifiers];
  const finalOfferAmounts = [...offerAmounts];

  // Process considerations and move items that go to the order recipient into offers
  const finalConsiderationItemTypes: number[] = [];
  const finalConsiderationTokens: string[] = [];
  const finalConsiderationIdentifiers: string[] = [];
  const finalConsiderationAmounts: string[] = [];
  const finalConsiderationRecipients: string[] = [];

  for (let i = 0; i < considerationItemTypes.length; i++) {
    const recipient = considerationRecipients[i].toLowerCase();

    if (recipient === orderRecipient.toLowerCase()) {
      // Move this consideration item to offers
      finalOfferItemTypes.push(considerationItemTypes[i]);
      finalOfferTokens.push(considerationTokens[i]);
      finalOfferIdentifiers.push(considerationIdentifiers[i]);
      finalOfferAmounts.push(considerationAmounts[i]);
    } else {
      // Keep this consideration item as consideration
      finalConsiderationItemTypes.push(considerationItemTypes[i]);
      finalConsiderationTokens.push(considerationTokens[i]);
      finalConsiderationIdentifiers.push(considerationIdentifiers[i]);
      finalConsiderationAmounts.push(considerationAmounts[i]);
      finalConsiderationRecipients.push(considerationRecipients[i]);
    }
  }

  return {
    finalOfferItemTypes,
    finalOfferTokens,
    finalOfferIdentifiers,
    finalOfferAmounts,
    finalConsiderationItemTypes,
    finalConsiderationTokens,
    finalConsiderationIdentifiers,
    finalConsiderationAmounts,
    finalConsiderationRecipients,
  };
}

Seaport.OrderFulfilled.handler(async ({ event, context }) => {
  // Skip events where offerer equals recipient. From what I have noticed,
  // transactions that contain self-orders also contain another OrderFulfilled
  // event that is the order we should process.
  if (event.params.offerer.toLowerCase() === event.params.recipient.toLowerCase()) {
    return;
  }

  // Extract offer data into parallel arrays
  const { offerItemTypes, offerTokens, offerIdentifiers, offerAmounts } = getOfferData(
    event.params.offer
  );

  // Extract consideration data into parallel arrays
  const {
    considerationItemTypes,
    considerationTokens,
    considerationIdentifiers,
    considerationAmounts,
    considerationRecipients,
  } = getConsiderationData(event.params.consideration);

  // Preprocess sale data to move consideration items that go to the order recipient into offers
  const {
    finalOfferItemTypes,
    finalOfferTokens,
    finalOfferIdentifiers,
    finalOfferAmounts,
    finalConsiderationItemTypes,
    finalConsiderationTokens,
    finalConsiderationIdentifiers,
    finalConsiderationAmounts,
    finalConsiderationRecipients,
  } = preprocessSaleData(
    offerItemTypes,
    offerTokens,
    offerIdentifiers,
    offerAmounts,
    considerationItemTypes,
    considerationTokens,
    considerationIdentifiers,
    considerationAmounts,
    considerationRecipients,
    event.params.recipient
  );

  // Get all NFT items from the preprocessed sale data
  const { offerNftItems, considerationNftItems } = getNFTItems(
    finalOfferItemTypes,
    finalOfferTokens,
    finalOfferIdentifiers,
    finalConsiderationItemTypes,
    finalConsiderationTokens,
    finalConsiderationIdentifiers
  );

  // If there are no NFTs involved, we don't care about the order
  if (!offerNftItems.length && !considerationNftItems.length) {
    return;
  }

  const timestamp = BigInt(event.block.timestamp);
  const saleId = `${event.chainId}_${event.transaction.hash}`;

  // Ensure Account entities exist
  await getOrCreateAccount(context, event.params.offerer);
  await getOrCreateAccount(context, event.params.recipient);

  // Create new sale entity
  const saleEntity: Sale = {
    id: saleId,
    timestamp,
    transactionHash: event.transaction.hash,
    market: "Seaport",

    // Account relationships (use _id fields to establish relationships)
    offerer_id: event.params.offerer.toLowerCase(),
    recipient_id: event.params.recipient.toLowerCase(),

    // Inline offer arrays
    offerItemTypes: finalOfferItemTypes,
    offerTokens: finalOfferTokens,
    offerIdentifiers: finalOfferIdentifiers,
    offerAmounts: finalOfferAmounts,

    // Inline consideration arrays
    considerationItemTypes: finalConsiderationItemTypes,
    considerationTokens: finalConsiderationTokens,
    considerationIdentifiers: finalConsiderationIdentifiers,
    considerationAmounts: finalConsiderationAmounts,
    considerationRecipients: finalConsiderationRecipients,
  };

  // Create SaleNFT junction entities for offer NFTs
  await createSaleNFTJunctions(context, saleId, offerNftItems);

  // Create SaleNFT junction entities for consideration NFTs
  await createSaleNFTJunctions(context, saleId, considerationNftItems);

  // Save the Sale entity
  context.Sale.set(saleEntity);

  // Account-level sale classification
  createAccountJunctionsForSale(context, {
    saleId,
    offererId: saleEntity.offerer_id,
    recipientId: saleEntity.recipient_id,
    offerItemTypes: saleEntity.offerItemTypes,
    considerationItemTypes: saleEntity.considerationItemTypes,
  });
});
