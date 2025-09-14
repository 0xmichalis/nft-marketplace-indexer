import assert from "assert";
import { 
  TestHelpers,
  Seaport_OrderFulfilled,
  Seaport_OfferItem,
  Seaport_ConsiderationItem
} from "generated";
const { MockDb, Seaport } = TestHelpers;

describe("Seaport contract OrderFulfilled event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Seaport contract OrderFulfilled event
  const event = Seaport.OrderFulfilled.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("Seaport_OrderFulfilled is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualSeaportOrderFulfilled = mockDbUpdated.entities.Seaport_OrderFulfilled.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedSeaportOrderFulfilled: Seaport_OrderFulfilled = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      orderHash: event.params.orderHash,
      offerer: event.params.offerer,
      zone: event.params.zone,
      recipient: event.params.recipient,
      blockNumber: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
      transactionHash: event.transaction.hash,
    };

    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualSeaportOrderFulfilled, expectedSeaportOrderFulfilled, "Actual SeaportOrderFulfilled should be the same as the expectedSeaportOrderFulfilled");
  });

  it("Seaport_OfferItem entities are created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    // Check that offer items were created
    const offerItems = mockDbUpdated.entities.Seaport_OfferItem.getAll();
    
    // Verify we have the expected number of offer items
    assert.equal(offerItems.length, event.params.offer.length, "Should create correct number of offer items");

    // Check the first offer item if it exists
    if (offerItems.length > 0 && event.params.offer.length > 0) {
      const expectedOfferItem: Seaport_OfferItem = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}_offer_0`,
        order_id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        itemType: Number(event.params.offer[0][0]),
        token: event.params.offer[0][1],
        identifier: event.params.offer[0][2].toString(),
        amount: event.params.offer[0][3].toString(),
      };

      const actualOfferItem = offerItems[0];
      assert.deepEqual(actualOfferItem, expectedOfferItem, "Actual OfferItem should match expected");
    }
  });

  it("Seaport_ConsiderationItem entities are created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    // Check that consideration items were created
    const considerationItems = mockDbUpdated.entities.Seaport_ConsiderationItem.getAll();
    
    // Verify we have the expected number of consideration items
    assert.equal(considerationItems.length, event.params.consideration.length, "Should create correct number of consideration items");

    // Check the first consideration item if it exists
    if (considerationItems.length > 0 && event.params.consideration.length > 0) {
      const expectedConsiderationItem: Seaport_ConsiderationItem = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}_consideration_0`,
        order_id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        itemType: Number(event.params.consideration[0][0]),
        token: event.params.consideration[0][1],
        identifier: event.params.consideration[0][2].toString(),
        amount: event.params.consideration[0][3].toString(),
        recipient: event.params.consideration[0][4],
      };

      const actualConsiderationItem = considerationItems[0];
      assert.deepEqual(actualConsiderationItem, expectedConsiderationItem, "Actual ConsiderationItem should match expected");
    }
  });
});
