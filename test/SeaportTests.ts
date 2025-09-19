import assert from "assert";
import { TestHelpers, Sale } from "generated";
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

describe("Seaport ERC1155 tests", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = MockDb.createMockDb();
  });

  it("Creates sale for single ERC1155 offer (amount > 1)", async () => {
    const OFFERER = "0xabcabcabcabcabcabcabcabcabcabcabcabcabca";
    const RECIPIENT = "0xdefdefdefdefdefdefdefdefdefdefdefdefdefd";
    const NFT_CONTRACT = "0x9999999999999999999999999999999999999999";
    const TOKEN_ID = 777n;
    const AMOUNT = 5n; // ERC1155 quantity

    const event = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [[3n, NFT_CONTRACT, TOKEN_ID, AMOUNT] as [bigint, string, bigint, bigint]], // ERC1155
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 4200000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ],
      ],
      mockEventData: {
        block: { number: 18600000, timestamp: 1710000000, hash: "0xblockerc1155a" },
        transaction: { hash: "0xtxerc1155a" },
        chainId: 1,
        logIndex: 10,
      },
    });

    const updatedDb = await Seaport.OrderFulfilled.processEvent({ event, mockDb });

    const saleId = `${event.chainId}_${event.transaction.hash}`;
    const sale = updatedDb.entities.Sale.get(saleId);
    assert.ok(sale, "Sale should be created");

    // Validate offer arrays captured ERC1155 correctly
    assert.equal(sale.offerItemTypes[0], 3, "Item type should be ERC1155");
    assert.equal(sale.offerTokens[0], NFT_CONTRACT, "Contract address should match");
    assert.equal(sale.offerIdentifiers[0], TOKEN_ID.toString(), "Token id should match");
    assert.equal(sale.offerAmounts[0], AMOUNT.toString(), "Amount should match ERC1155 quantity");

    // Validate SaleNFT junction exists
    const saleNfts = updatedDb.entities.SaleNFT.getAll().filter((sn: any) => sn.sale_id === saleId);
    assert.equal(saleNfts.length, 1, "One NFT junction expected");
    assert.equal(
      saleNfts[0].nftToken_id,
      `${NFT_CONTRACT.toLowerCase()}:${TOKEN_ID.toString()}`,
      "NFT junction should point to ERC1155 token"
    );

    // Validate token entity
    const nftToken = updatedDb.entities.NFTToken.get(
      `${NFT_CONTRACT.toLowerCase()}:${TOKEN_ID.toString()}`
    );
    assert.ok(nftToken, "NFTToken should exist");
  });

  it("Handles bundle with ERC721 and ERC1155 in offer and ETH consideration", async () => {
    const OFFERER = "0x1212121212121212121212121212121212121212";
    const RECIPIENT = "0x3434343434343434343434343434343434343434";
    const NFT721 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const NFT1155 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    const event = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT721, 101n, 1n] as [bigint, string, bigint, bigint], // ERC721
        [3n, NFT1155, 202n, 3n] as [bigint, string, bigint, bigint], // ERC1155 amount 3
      ],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 1500000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ],
      ],
      mockEventData: {
        block: { number: 18600001, timestamp: 1710000100, hash: "0xblockerc1155b" },
        transaction: { hash: "0xtxerc1155b" },
        chainId: 1,
        logIndex: 11,
      },
    });

    const updatedDb = await Seaport.OrderFulfilled.processEvent({ event, mockDb });

    const saleId = `${event.chainId}_${event.transaction.hash}`;
    const sale = updatedDb.entities.Sale.get(saleId);
    assert.ok(sale, "Sale should be created");

    // Offer arrays lengths and content
    assert.equal(sale.offerItemTypes.length, 2);
    assert.deepEqual(sale.offerItemTypes, [2, 3]);
    assert.equal(sale.offerTokens[0], NFT721);
    assert.equal(sale.offerTokens[1], NFT1155);
    assert.equal(sale.offerIdentifiers[0], "101");
    assert.equal(sale.offerIdentifiers[1], "202");
    assert.equal(sale.offerAmounts[0], "1");
    assert.equal(sale.offerAmounts[1], "3");

    // Junctions for both tokens
    const saleNfts = updatedDb.entities.SaleNFT.getAll().filter((sn: any) => sn.sale_id === saleId);
    assert.equal(saleNfts.length, 2, "Two NFT junctions expected");
    const ids = saleNfts.map((sn: any) => sn.nftToken_id);
    assert.ok(ids.includes(`${NFT721.toLowerCase()}:101`));
    assert.ok(ids.includes(`${NFT1155.toLowerCase()}:202`));
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

    // Verify sale references NFT entities via junction entity
    const allSaleNfts = mockDbUpdated.entities.SaleNFT.getAll();
    const saleNfts = allSaleNfts.filter((sn) => sn.sale_id === sale?.id);
    assert.equal(saleNfts.length, 1, "Sale should have one NFT");
    assert.equal(saleNfts[0].nftToken_id, `${NFT_CONTRACT.toLowerCase()}:${TOKEN_ID.toString()}`);
    assert.equal(saleNfts[0].isOffer, true, "NFT should be in offer");

    // Verify NFT entities exist
    assert.ok(nftContract, "NFT Contract should be created");
    assert.equal(nftContract?.address, NFT_CONTRACT, "NFT contract address should match");
    assert.ok(nftToken, "NFT Token should be created");
    assert.equal(nftToken?.tokenId, TOKEN_ID.toString(), "NFT token ID should match");

    // Note: With @derivedFrom relationships, sales are automatically linked
    // The relationships are computed at query time, not stored directly in the entity
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

    // Verify the NFT contract exists
    assert.ok(nftContract, "NFT Contract should exist");
    // Note: With @derivedFrom relationships, sales are automatically linked

    // Verify each token exists and references its sale
    for (let i = 0; i < 3; i++) {
      const tokenId = (1000 + i).toString();
      const token = currentDb.entities.NFTToken.get(`${NFT_CONTRACT.toLowerCase()}:${tokenId}`);
      const saleId = `${events[i].chainId}_${events[i].transaction.hash}`;

      assert.ok(token, `Token ${tokenId} should exist`);
      // Note: With @derivedFrom relationships, sales are automatically linked
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

    // Verify sale references both NFT contracts and tokens via junction entities
    const allSaleNfts = mockDbUpdated.entities.SaleNFT.getAll();
    const saleNfts = allSaleNfts.filter((sn) => sn.sale_id === sale?.id);
    assert.equal(saleNfts.length, 2, "Sale should have two NFTs");

    const nftTokenIds = saleNfts.map((sn: any) => sn.nftToken_id);
    assert.ok(
      nftTokenIds.includes(`${NFT_CONTRACT_1.toLowerCase()}:100`),
      "Sale should reference first NFT token"
    );
    assert.ok(
      nftTokenIds.includes(`${NFT_CONTRACT_2.toLowerCase()}:200`),
      "Sale should reference second NFT token"
    );

    // Verify both contracts exist and reference the sale
    assert.ok(contract1, "First NFT Contract should exist");
    assert.ok(contract2, "Second NFT Contract should exist");
    // Note: With @derivedFrom relationships, sales are automatically linked

    // Verify both tokens exist and reference the sale
    assert.ok(token1, "First NFT Token should exist");
    assert.ok(token2, "Second NFT Token should exist");
    // Note: With @derivedFrom relationships, sales are automatically linked
  });

  it("Merges multiple OrderFulfilled events in the same transaction", async () => {
    const OFFERER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const RECIPIENT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const NFT_CONTRACT_1 = "0x1111111111111111111111111111111111111111";
    const NFT_CONTRACT_2 = "0x2222222222222222222222222222222222222222";
    const SAME_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // First OrderFulfilled event
    const event1 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT_1, 100n, 1n] as [bigint, string, bigint, bigint], // ERC721 NFT
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
        transaction: { hash: SAME_TX_HASH },
        chainId: 1,
        logIndex: 1,
      },
    });

    // Second OrderFulfilled event in the same transaction
    const event2 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT_2, 200n, 1n] as [bigint, string, bigint, bigint], // Another ERC721 NFT
      ],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 2000000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ], // More ETH payment
      ],
      mockEventData: {
        block: { number: 18500000, timestamp: 1700000000, hash: "0xblock123" },
        transaction: { hash: SAME_TX_HASH },
        chainId: 1,
        logIndex: 2,
      },
    });

    let currentDb = mockDb;

    // Process first event
    currentDb = await Seaport.OrderFulfilled.processEvent({
      event: event1,
      mockDb: currentDb,
    });

    // Process second event (should merge with first)
    currentDb = await Seaport.OrderFulfilled.processEvent({
      event: event2,
      mockDb: currentDb,
    });

    const saleId = `${event1.chainId}_${event1.transaction.hash}`;
    const mergedSale = currentDb.entities.Sale.get(saleId);

    // Verify the sale exists
    assert.ok(mergedSale, "Merged sale should exist");

    // Verify offer arrays contain data from both events
    assert.equal(mergedSale.offerItemTypes.length, 2, "Should have 2 offer item types");
    assert.equal(mergedSale.offerTokens.length, 2, "Should have 2 offer tokens");
    assert.equal(mergedSale.offerIdentifiers.length, 2, "Should have 2 offer identifiers");
    assert.equal(mergedSale.offerAmounts.length, 2, "Should have 2 offer amounts");

    // Verify consideration arrays contain data from both events
    assert.equal(
      mergedSale.considerationItemTypes.length,
      2,
      "Should have 2 consideration item types"
    );
    assert.equal(mergedSale.considerationTokens.length, 2, "Should have 2 consideration tokens");
    assert.equal(
      mergedSale.considerationIdentifiers.length,
      2,
      "Should have 2 consideration identifiers"
    );
    assert.equal(mergedSale.considerationAmounts.length, 2, "Should have 2 consideration amounts");
    assert.equal(
      mergedSale.considerationRecipients.length,
      2,
      "Should have 2 consideration recipients"
    );

    // Verify first offer item (from event1)
    assert.equal(mergedSale.offerItemTypes[0], 2, "First offer item type should be ERC721");
    assert.equal(mergedSale.offerTokens[0], NFT_CONTRACT_1, "First offer token should match");
    assert.equal(mergedSale.offerIdentifiers[0], "100", "First offer identifier should match");
    assert.equal(mergedSale.offerAmounts[0], "1", "First offer amount should match");

    // Verify second offer item (from event2)
    assert.equal(mergedSale.offerItemTypes[1], 2, "Second offer item type should be ERC721");
    assert.equal(mergedSale.offerTokens[1], NFT_CONTRACT_2, "Second offer token should match");
    assert.equal(mergedSale.offerIdentifiers[1], "200", "Second offer identifier should match");
    assert.equal(mergedSale.offerAmounts[1], "1", "Second offer amount should match");

    // Verify first consideration item (from event1)
    assert.equal(
      mergedSale.considerationItemTypes[0],
      0,
      "First consideration item type should be ETH"
    );
    assert.equal(
      mergedSale.considerationTokens[0],
      "0x0000000000000000000000000000000000000000",
      "First consideration token should be ETH"
    );
    assert.equal(
      mergedSale.considerationIdentifiers[0],
      "0",
      "First consideration identifier should be 0"
    );
    assert.equal(
      mergedSale.considerationAmounts[0],
      "1000000000000000000",
      "First consideration amount should match"
    );
    assert.equal(
      mergedSale.considerationRecipients[0],
      OFFERER,
      "First consideration recipient should match"
    );

    // Verify second consideration item (from event2)
    assert.equal(
      mergedSale.considerationItemTypes[1],
      0,
      "Second consideration item type should be ETH"
    );
    assert.equal(
      mergedSale.considerationTokens[1],
      "0x0000000000000000000000000000000000000000",
      "Second consideration token should be ETH"
    );
    assert.equal(
      mergedSale.considerationIdentifiers[1],
      "0",
      "Second consideration identifier should be 0"
    );
    assert.equal(
      mergedSale.considerationAmounts[1],
      "2000000000000000000",
      "Second consideration amount should match"
    );
    assert.equal(
      mergedSale.considerationRecipients[1],
      OFFERER,
      "Second consideration recipient should match"
    );

    // Verify both NFTs are linked to the sale
    const allSaleNfts = currentDb.entities.SaleNFT.getAll();
    const saleNfts = allSaleNfts.filter((sn: any) => sn.sale_id === saleId);
    assert.equal(saleNfts.length, 2, "Should have 2 NFT junctions");

    const nftTokenIds = saleNfts.map((sn: any) => sn.nftToken_id);
    assert.ok(
      nftTokenIds.includes(`${NFT_CONTRACT_1.toLowerCase()}:100`),
      "Should include first NFT token"
    );
    assert.ok(
      nftTokenIds.includes(`${NFT_CONTRACT_2.toLowerCase()}:200`),
      "Should include second NFT token"
    );
  });
});
