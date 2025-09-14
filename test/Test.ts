import assert from "assert";
import { TestHelpers, Seaport_OrderFulfilled } from "generated";
const { MockDb, Seaport } = TestHelpers;

describe("Seaport contract OrderFulfilled event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Seaport contract OrderFulfilled event
  const event = Seaport.OrderFulfilled.createMockEvent({
    /* It mocks event fields with default values. You can overwrite them if you need */
  });

  it("Seaport_OrderFulfilled is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualSeaportOrderFulfilled = mockDbUpdated.entities.Seaport_OrderFulfilled.get(
      `${event.chainId}_${event.transaction.hash}`
    );

    // Extract expected arrays from event data
    const expectedOfferItemTypes: number[] = [];
    const expectedOfferTokens: string[] = [];
    const expectedOfferIdentifiers: string[] = [];
    const expectedOfferAmounts: string[] = [];

    for (let i = 0; i < event.params.offer.length; i++) {
      const spentItem = event.params.offer[i];
      expectedOfferItemTypes.push(Number(spentItem[0]));
      expectedOfferTokens.push(spentItem[1]);
      expectedOfferIdentifiers.push(spentItem[2].toString());
      expectedOfferAmounts.push(spentItem[3].toString());
    }

    const expectedConsiderationItemTypes: number[] = [];
    const expectedConsiderationTokens: string[] = [];
    const expectedConsiderationIdentifiers: string[] = [];
    const expectedConsiderationAmounts: string[] = [];
    const expectedConsiderationRecipients: string[] = [];

    for (let i = 0; i < event.params.consideration.length; i++) {
      const receivedItem = event.params.consideration[i];
      expectedConsiderationItemTypes.push(Number(receivedItem[0]));
      expectedConsiderationTokens.push(receivedItem[1]);
      expectedConsiderationIdentifiers.push(receivedItem[2].toString());
      expectedConsiderationAmounts.push(receivedItem[3].toString());
      expectedConsiderationRecipients.push(receivedItem[4]);
    }

    // Creating the expected entity
    const expectedSeaportOrderFulfilled: Seaport_OrderFulfilled = {
      id: `${event.chainId}_${event.transaction.hash}`,
      offerer: event.params.offerer,
      recipient: event.params.recipient,
      timestamp: BigInt(event.block.timestamp),
      transactionHash: event.transaction.hash,
      // Inline offer arrays
      offerItemTypes: expectedOfferItemTypes,
      offerTokens: expectedOfferTokens,
      offerIdentifiers: expectedOfferIdentifiers,
      offerAmounts: expectedOfferAmounts,
      // Inline consideration arrays
      considerationItemTypes: expectedConsiderationItemTypes,
      considerationTokens: expectedConsiderationTokens,
      considerationIdentifiers: expectedConsiderationIdentifiers,
      considerationAmounts: expectedConsiderationAmounts,
      considerationRecipients: expectedConsiderationRecipients,
    };

    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(
      actualSeaportOrderFulfilled,
      expectedSeaportOrderFulfilled,
      "Actual SeaportOrderFulfilled should be the same as the expectedSeaportOrderFulfilled"
    );
  });

  it("Offer arrays are populated correctly in OrderFulfilled", async () => {
    // Processing the event
    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualSeaportOrderFulfilled = mockDbUpdated.entities.Seaport_OrderFulfilled.get(
      `${event.chainId}_${event.transaction.hash}`
    );

    // Verify offer arrays have correct lengths
    assert.equal(
      actualSeaportOrderFulfilled?.offerItemTypes.length,
      event.params.offer.length,
      "Offer item types array should have correct length"
    );
    assert.equal(
      actualSeaportOrderFulfilled?.offerTokens.length,
      event.params.offer.length,
      "Offer tokens array should have correct length"
    );
    assert.equal(
      actualSeaportOrderFulfilled?.offerIdentifiers.length,
      event.params.offer.length,
      "Offer identifiers array should have correct length"
    );
    assert.equal(
      actualSeaportOrderFulfilled?.offerAmounts.length,
      event.params.offer.length,
      "Offer amounts array should have correct length"
    );

    // Check first offer item data if it exists
    if (event.params.offer.length > 0) {
      const spentItem = event.params.offer[0];
      assert.equal(
        actualSeaportOrderFulfilled?.offerItemTypes[0],
        Number(spentItem[0]),
        "First offer item type should match"
      );
      assert.equal(
        actualSeaportOrderFulfilled?.offerTokens[0],
        spentItem[1],
        "First offer token should match"
      );
      assert.equal(
        actualSeaportOrderFulfilled?.offerIdentifiers[0],
        spentItem[2].toString(),
        "First offer identifier should match"
      );
      assert.equal(
        actualSeaportOrderFulfilled?.offerAmounts[0],
        spentItem[3].toString(),
        "First offer amount should match"
      );
    }
  });

  it("Consideration arrays are populated correctly in OrderFulfilled", async () => {
    // Processing the event
    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualSeaportOrderFulfilled = mockDbUpdated.entities.Seaport_OrderFulfilled.get(
      `${event.chainId}_${event.transaction.hash}`
    );

    // Verify consideration arrays have correct lengths
    assert.equal(
      actualSeaportOrderFulfilled?.considerationItemTypes.length,
      event.params.consideration.length,
      "Consideration item types array should have correct length"
    );
    assert.equal(
      actualSeaportOrderFulfilled?.considerationTokens.length,
      event.params.consideration.length,
      "Consideration tokens array should have correct length"
    );
    assert.equal(
      actualSeaportOrderFulfilled?.considerationIdentifiers.length,
      event.params.consideration.length,
      "Consideration identifiers array should have correct length"
    );
    assert.equal(
      actualSeaportOrderFulfilled?.considerationAmounts.length,
      event.params.consideration.length,
      "Consideration amounts array should have correct length"
    );
    assert.equal(
      actualSeaportOrderFulfilled?.considerationRecipients.length,
      event.params.consideration.length,
      "Consideration recipients array should have correct length"
    );

    // Check first consideration item data if it exists
    if (event.params.consideration.length > 0) {
      const receivedItem = event.params.consideration[0];
      assert.equal(
        actualSeaportOrderFulfilled?.considerationItemTypes[0],
        Number(receivedItem[0]),
        "First consideration item type should match"
      );
      assert.equal(
        actualSeaportOrderFulfilled?.considerationTokens[0],
        receivedItem[1],
        "First consideration token should match"
      );
      assert.equal(
        actualSeaportOrderFulfilled?.considerationIdentifiers[0],
        receivedItem[2].toString(),
        "First consideration identifier should match"
      );
      assert.equal(
        actualSeaportOrderFulfilled?.considerationAmounts[0],
        receivedItem[3].toString(),
        "First consideration amount should match"
      );
      assert.equal(
        actualSeaportOrderFulfilled?.considerationRecipients[0],
        receivedItem[4],
        "First consideration recipient should match"
      );
    }
  });
});
