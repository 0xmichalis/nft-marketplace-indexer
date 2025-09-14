import assert from "assert";
import { TestHelpers, Sale, Account, NFTContract, NFTToken } from "generated";
const { MockDb, Seaport } = TestHelpers;

describe("Seaport contract OrderFulfilled event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Seaport contract OrderFulfilled event
  const event = Seaport.OrderFulfilled.createMockEvent({
    /* It mocks event fields with default values. You can overwrite them if you need */
  });

  it("Sale is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualSale = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);

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
    const expectedSale: Sale = {
      id: `${event.chainId}_${event.transaction.hash}`,
      market: "Seaport",
      offerer_id: event.params.offerer.toLowerCase(),
      recipient_id: event.params.recipient.toLowerCase(),
      nftContractIds: [],
      nftTokenIds: [],
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
      actualSale,
      expectedSale,
      "Actual SeaportOrderFulfilled should be the same as the expectedSale"
    );
  });

  it("Offer arrays are populated correctly in OrderFulfilled", async () => {
    // Processing the event
    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualSale = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);

    // Verify offer arrays have correct lengths
    assert.equal(
      actualSale?.offerItemTypes.length,
      event.params.offer.length,
      "Offer item types array should have correct length"
    );
    assert.equal(
      actualSale?.offerTokens.length,
      event.params.offer.length,
      "Offer tokens array should have correct length"
    );
    assert.equal(
      actualSale?.offerIdentifiers.length,
      event.params.offer.length,
      "Offer identifiers array should have correct length"
    );
    assert.equal(
      actualSale?.offerAmounts.length,
      event.params.offer.length,
      "Offer amounts array should have correct length"
    );

    // Check first offer item data if it exists
    if (event.params.offer.length > 0) {
      const spentItem = event.params.offer[0];
      assert.equal(
        actualSale?.offerItemTypes[0],
        Number(spentItem[0]),
        "First offer item type should match"
      );
      assert.equal(actualSale?.offerTokens[0], spentItem[1], "First offer token should match");
      assert.equal(
        actualSale?.offerIdentifiers[0],
        spentItem[2].toString(),
        "First offer identifier should match"
      );
      assert.equal(
        actualSale?.offerAmounts[0],
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
    let actualSale = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);

    // Verify consideration arrays have correct lengths
    assert.equal(
      actualSale?.considerationItemTypes.length,
      event.params.consideration.length,
      "Consideration item types array should have correct length"
    );
    assert.equal(
      actualSale?.considerationTokens.length,
      event.params.consideration.length,
      "Consideration tokens array should have correct length"
    );
    assert.equal(
      actualSale?.considerationIdentifiers.length,
      event.params.consideration.length,
      "Consideration identifiers array should have correct length"
    );
    assert.equal(
      actualSale?.considerationAmounts.length,
      event.params.consideration.length,
      "Consideration amounts array should have correct length"
    );
    assert.equal(
      actualSale?.considerationRecipients.length,
      event.params.consideration.length,
      "Consideration recipients array should have correct length"
    );

    // Check first consideration item data if it exists
    if (event.params.consideration.length > 0) {
      const receivedItem = event.params.consideration[0];
      assert.equal(
        actualSale?.considerationItemTypes[0],
        Number(receivedItem[0]),
        "First consideration item type should match"
      );
      assert.equal(
        actualSale?.considerationTokens[0],
        receivedItem[1],
        "First consideration token should match"
      );
      assert.equal(
        actualSale?.considerationIdentifiers[0],
        receivedItem[2].toString(),
        "First consideration identifier should match"
      );
      assert.equal(
        actualSale?.considerationAmounts[0],
        receivedItem[3].toString(),
        "First consideration amount should match"
      );
      assert.equal(
        actualSale?.considerationRecipients[0],
        receivedItem[4],
        "First consideration recipient should match"
      );
    }
  });
});

describe("Seaport relationship integrity tests", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = MockDb.createMockDb();
  });

  it("Verifies account relationships are properly established", async () => {
    const OFFERER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const RECIPIENT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const NFT_CONTRACT = "0x1111111111111111111111111111111111111111";

    const event = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT, 123n, 1n] as [bigint, string, bigint, bigint], // ERC721 NFT
      ],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 1000000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ], // ETH payment
      ],
      mockEventData: {
        block: { number: 18500000, timestamp: 1700000000, hash: "0xblock123" },
        transaction: { hash: "0xtx1234567890abcdef1234567890abcdef1234567890abcdef1234567890" },
        chainId: 1,
        logIndex: 1,
      },
    });

    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    const sale = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const offererAccount = mockDbUpdated.entities.Account.get(OFFERER.toLowerCase());
    const recipientAccount = mockDbUpdated.entities.Account.get(RECIPIENT.toLowerCase());

    // Verify sale references correct accounts
    assert.equal(sale?.offerer_id, OFFERER.toLowerCase(), "Sale should reference offerer");
    assert.equal(sale?.recipient_id, RECIPIENT.toLowerCase(), "Sale should reference recipient");

    // Verify accounts exist
    assert.ok(offererAccount, "Offerer account should exist");
    assert.ok(recipientAccount, "Recipient account should exist");

    // Verify account addresses
    assert.equal(offererAccount?.address, OFFERER, "Offerer account address should match");
    assert.equal(recipientAccount?.address, RECIPIENT, "Recipient account address should match");
  });

  it("Verifies NFT contract and token relationships", async () => {
    const OFFERER = "0xcccccccccccccccccccccccccccccccccccccccc";
    const RECIPIENT = "0xdddddddddddddddddddddddddddddddddddddddd";
    const NFT_CONTRACT = "0x2222222222222222222222222222222222222222";
    const TOKEN_ID = 456n;

    const event = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT, TOKEN_ID, 1n] as [bigint, string, bigint, bigint], // ERC721 NFT
      ],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 2000000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ], // ETH payment
      ],
      mockEventData: {
        block: { number: 18500001, timestamp: 1700000100, hash: "0xblock124" },
        transaction: { hash: "0xtx234567890abcdef1234567890abcdef1234567890abcdef1234567890" },
        chainId: 1,
        logIndex: 2,
      },
    });

    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    const sale = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const nftContract = mockDbUpdated.entities.NFTContract.get(NFT_CONTRACT.toLowerCase());
    const nftToken = mockDbUpdated.entities.NFTToken.get(
      `${NFT_CONTRACT.toLowerCase()}:${TOKEN_ID.toString()}`
    );

    // Verify sale references NFT entities
    assert.ok(
      sale?.nftContractIds.includes(NFT_CONTRACT),
      "Sale should reference the NFT contract"
    );
    assert.ok(
      sale?.nftTokenIds.includes(`${NFT_CONTRACT.toLowerCase()}:${TOKEN_ID.toString()}`),
      "Sale should reference the NFT token"
    );

    // Verify NFT entities exist
    assert.ok(nftContract, "NFT Contract should be created");
    assert.equal(nftContract?.address, NFT_CONTRACT, "NFT contract address should match");
    assert.ok(nftToken, "NFT Token should be created");
    assert.equal(nftToken?.tokenId, TOKEN_ID.toString(), "NFT token ID should match");

    // Verify reverse relationships
    assert.ok(nftContract?.sales_id, "NFT Contract should have sales_id array");
    assert.ok(
      sale?.id && nftContract?.sales_id.includes(sale.id),
      "NFT Contract should reference the sale"
    );

    assert.ok(nftToken?.sales_id, "NFT Token should have sales_id array");
    assert.ok(
      sale?.id && nftToken?.sales_id.includes(sale.id),
      "NFT Token should reference the sale"
    );
  });

  it("Maintains relationships across multiple orders", async () => {
    const OFFERER = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const RECIPIENT = "0xffffffffffffffffffffffffffffffffffffffff";
    const NFT_CONTRACT = "0x3333333333333333333333333333333333333333";

    const events = [];
    const baseTimestamp = 1700002000;
    const baseBlockNumber = 18500020;

    // Create multiple orders with different tokens
    for (let i = 0; i < 3; i++) {
      const event = Seaport.OrderFulfilled.createMockEvent({
        orderHash: `0x${i.toString().padStart(64, "0")}`,
        offerer: OFFERER,
        zone: "0x0000000000000000000000000000000000000000",
        recipient: RECIPIENT,
        offer: [[2n, NFT_CONTRACT, BigInt(1000 + i), 1n] as [bigint, string, bigint, bigint]],
        consideration: [
          [
            0n,
            "0x0000000000000000000000000000000000000000",
            0n,
            1000000000000000000n * BigInt(i + 1),
            OFFERER,
          ] as [bigint, string, bigint, bigint, string],
        ],
        mockEventData: {
          block: {
            number: baseBlockNumber + i,
            timestamp: baseTimestamp + i * 100,
            hash: `0xblock${baseBlockNumber + i}`,
          },
          transaction: { hash: `0xtx${i.toString().padStart(64, "0")}` },
          chainId: 1,
          logIndex: 20 + i,
        },
      });
      events.push(event);
    }

    let currentDb = mockDb;

    // Process all events
    for (const event of events) {
      currentDb = await Seaport.OrderFulfilled.processEvent({
        event,
        mockDb: currentDb,
      });
    }

    // Get the NFT contract after all orders
    const nftContract = currentDb.entities.NFTContract.get(NFT_CONTRACT.toLowerCase());

    // Verify the NFT contract exists and references all sales
    assert.ok(nftContract, "NFT Contract should exist");
    assert.equal(nftContract.sales_id.length, 3, "NFT Contract should reference all 3 sales");

    // Verify each token exists and references its sale
    for (let i = 0; i < 3; i++) {
      const tokenId = (1000 + i).toString();
      const token = currentDb.entities.NFTToken.get(`${NFT_CONTRACT.toLowerCase()}:${tokenId}`);
      const saleId = `${events[i].chainId}_${events[i].transaction.hash}`;

      assert.ok(token, `Token ${tokenId} should exist`);
      assert.ok(token.sales_id.includes(saleId), `Token ${tokenId} should reference its sale`);
      assert.ok(
        nftContract.sales_id.includes(saleId),
        `NFT Contract should reference sale ${i + 1}`
      );
    }
  });

  it("Handles bundle orders with multiple NFTs", async () => {
    const OFFERER = "0x1111111111111111111111111111111111111111";
    const RECIPIENT = "0x2222222222222222222222222222222222222222";
    const NFT_CONTRACT_1 = "0x4444444444444444444444444444444444444444";
    const NFT_CONTRACT_2 = "0x5555555555555555555555555555555555555555";

    const event = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x34567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef2",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT_1, 100n, 1n] as [bigint, string, bigint, bigint], // First NFT
        [2n, NFT_CONTRACT_2, 200n, 1n] as [bigint, string, bigint, bigint], // Second NFT
      ],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 3000000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ], // ETH payment
      ],
      mockEventData: {
        block: { number: 18500002, timestamp: 1700000200, hash: "0xblock125" },
        transaction: { hash: "0xtx34567890abcdef1234567890abcdef1234567890abcdef1234567890" },
        chainId: 1,
        logIndex: 3,
      },
    });

    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    const sale = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const contract1 = mockDbUpdated.entities.NFTContract.get(NFT_CONTRACT_1.toLowerCase());
    const contract2 = mockDbUpdated.entities.NFTContract.get(NFT_CONTRACT_2.toLowerCase());
    const token1 = mockDbUpdated.entities.NFTToken.get(`${NFT_CONTRACT_1.toLowerCase()}:100`);
    const token2 = mockDbUpdated.entities.NFTToken.get(`${NFT_CONTRACT_2.toLowerCase()}:200`);

    // Verify sale references both NFT contracts and tokens
    assert.ok(
      sale?.nftContractIds.includes(NFT_CONTRACT_1),
      "Sale should reference first NFT contract"
    );
    assert.ok(
      sale?.nftContractIds.includes(NFT_CONTRACT_2),
      "Sale should reference second NFT contract"
    );
    assert.ok(
      sale?.nftTokenIds.includes(`${NFT_CONTRACT_1.toLowerCase()}:100`),
      "Sale should reference first NFT token"
    );
    assert.ok(
      sale?.nftTokenIds.includes(`${NFT_CONTRACT_2.toLowerCase()}:200`),
      "Sale should reference second NFT token"
    );

    // Verify both contracts exist and reference the sale
    assert.ok(contract1, "First NFT Contract should exist");
    assert.ok(contract2, "Second NFT Contract should exist");
    assert.ok(
      sale?.id && contract1?.sales_id.includes(sale.id),
      "First contract should reference the sale"
    );
    assert.ok(
      sale?.id && contract2?.sales_id.includes(sale.id),
      "Second contract should reference the sale"
    );

    // Verify both tokens exist and reference the sale
    assert.ok(token1, "First NFT Token should exist");
    assert.ok(token2, "Second NFT Token should exist");
    assert.ok(
      sale?.id && token1?.sales_id.includes(sale.id),
      "First token should reference the sale"
    );
    assert.ok(
      sale?.id && token2?.sales_id.includes(sale.id),
      "Second token should reference the sale"
    );
  });
});
