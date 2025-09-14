/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Seaport,
  Seaport_OrderFulfilled,
  Seaport_OfferItem,
  Seaport_ConsiderationItem,
} from "generated";

Seaport.OrderFulfilled.handler(async ({ event, context }) => {
  // Create the main OrderFulfilled entity
  const orderFulfilledEntity: Seaport_OrderFulfilled = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    orderHash: event.params.orderHash,
    offerer: event.params.offerer,
    zone: event.params.zone,
    recipient: event.params.recipient,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };

  context.Seaport_OrderFulfilled.set(orderFulfilledEntity);

  // Create OfferItem entities (SpentItem structure: itemType, token, identifier, amount)
  for (let i = 0; i < event.params.offer.length; i++) {
    const spentItem = event.params.offer[i];
    const offerEntity: Seaport_OfferItem = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}_offer_${i}`,
      order_id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      itemType: Number(spentItem[0]),
      token: spentItem[1],
      identifier: spentItem[2].toString(),
      amount: spentItem[3].toString(),
    };

    context.Seaport_OfferItem.set(offerEntity);
  }

  // Create ConsiderationItem entities (ReceivedItem structure: itemType, token, identifier, amount, recipient)
  for (let i = 0; i < event.params.consideration.length; i++) {
    const receivedItem = event.params.consideration[i];
    const considerationEntity: Seaport_ConsiderationItem = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}_consideration_${i}`,
      order_id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      itemType: Number(receivedItem[0]),
      token: receivedItem[1],
      identifier: receivedItem[2].toString(),
      amount: receivedItem[3].toString(),
      recipient: receivedItem[4],
    };

    context.Seaport_ConsiderationItem.set(considerationEntity);
  }
});
