/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Seaport,
  Seaport_OrderFulfilled,
} from "generated";

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

  // Create the main OrderFulfilled entity with inlined parallel arrays
  const orderFulfilledEntity: Seaport_OrderFulfilled = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    orderHash: event.params.orderHash,
    offerer: event.params.offerer,
    zone: event.params.zone,
    recipient: event.params.recipient,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
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

  context.Seaport_OrderFulfilled.set(orderFulfilledEntity);
});
