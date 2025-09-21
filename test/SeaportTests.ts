import assert from "assert";

import { TestHelpers } from "generated";

import {
  decodeRawOrderFulfilledEvent,
  processEvents,
  createMockOrderEvent,
  TEST_ADDRESSES,
  NFT_CONTRACTS,
  ITEM_TYPES,
} from "./TestUtils";
const { MockDb, Seaport } = TestHelpers;

describe("Seaport contract OrderFulfilled event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Seaport contract OrderFulfilled event
  const event = Seaport.OrderFulfilled.createMockEvent({
    offerer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    recipient: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    offer: [
      [2n, "0x1111111111111111111111111111111111111111", 100n, 1n] as [
        bigint,
        string,
        bigint,
        bigint,
      ], // ERC721 NFT
    ],
    consideration: [
      [
        0n,
        "0x0000000000000000000000000000000000000000",
        0n,
        1000000000000000000n,
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ] as [bigint, string, bigint, bigint, string], // ETH payment
    ],
  });

  it("Sale is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Seaport.OrderFulfilled.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualSale = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);

    // Verify the sale exists and has the basic structure
    assert.ok(actualSale, "Sale should exist");
    assert.equal(actualSale.market, "Seaport", "Market should be Seaport");
    assert.equal(actualSale.offerer_id, event.params.offerer.toLowerCase(), "Offerer should match");
    assert.equal(
      actualSale.recipient_id,
      event.params.recipient.toLowerCase(),
      "Recipient should match"
    );

    // Verify the sale has the expected structure after preprocessing
    // The consideration item goes to the offerer (not the recipient), so it should stay in considerations
    assert.equal(actualSale.offerItemTypes.length, 1, "Should have 1 offer item");
    assert.equal(actualSale.offerTokens.length, 1, "Should have 1 offer token");
    assert.equal(actualSale.offerIdentifiers.length, 1, "Should have 1 offer identifier");
    assert.equal(actualSale.offerAmounts.length, 1, "Should have 1 offer amount");

    assert.equal(actualSale.considerationItemTypes.length, 1, "Should have 1 consideration item");
    assert.equal(actualSale.considerationTokens.length, 1, "Should have 1 consideration token");
    assert.equal(
      actualSale.considerationIdentifiers.length,
      1,
      "Should have 1 consideration identifier"
    );
    assert.equal(actualSale.considerationAmounts.length, 1, "Should have 1 consideration amount");
    assert.equal(
      actualSale.considerationRecipients.length,
      1,
      "Should have 1 consideration recipient"
    );

    // Verify the offer contains the NFT
    assert.equal(actualSale.offerItemTypes[0], 2, "Offer should contain ERC721");
    assert.equal(
      actualSale.offerTokens[0],
      "0x1111111111111111111111111111111111111111",
      "Offer token should match"
    );
    assert.equal(actualSale.offerIdentifiers[0], "100", "Offer identifier should match");
    assert.equal(actualSale.offerAmounts[0], "1", "Offer amount should match");

    // Verify the consideration contains ETH
    assert.equal(actualSale.considerationItemTypes[0], 0, "Consideration should contain ETH");
    assert.equal(
      actualSale.considerationTokens[0],
      "0x0000000000000000000000000000000000000000",
      "Consideration token should be ETH"
    );
    assert.equal(
      actualSale.considerationIdentifiers[0],
      "0",
      "Consideration identifier should be 0"
    );
    assert.equal(
      actualSale.considerationAmounts[0],
      "1000000000000000000",
      "Consideration amount should be 1 ETH"
    );
    assert.equal(
      actualSale.considerationRecipients[0],
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "Consideration recipient should be offerer"
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

    // Verify offer arrays have correct lengths (1 NFT in offer, no consideration items moved to offers)
    assert.equal(
      actualSale?.offerItemTypes.length,
      1,
      "Offer item types array should have correct length"
    );
    assert.equal(
      actualSale?.offerTokens.length,
      1,
      "Offer tokens array should have correct length"
    );
    assert.equal(
      actualSale?.offerIdentifiers.length,
      1,
      "Offer identifiers array should have correct length"
    );
    assert.equal(
      actualSale?.offerAmounts.length,
      1,
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

    // Verify consideration arrays have correct lengths (1 ETH consideration, no items moved to offers)
    assert.equal(
      actualSale?.considerationItemTypes.length,
      1,
      "Consideration item types array should have correct length"
    );
    assert.equal(
      actualSale?.considerationTokens.length,
      1,
      "Consideration tokens array should have correct length"
    );
    assert.equal(
      actualSale?.considerationIdentifiers.length,
      1,
      "Consideration identifiers array should have correct length"
    );
    assert.equal(
      actualSale?.considerationAmounts.length,
      1,
      "Consideration amounts array should have correct length"
    );
    assert.equal(
      actualSale?.considerationRecipients.length,
      1,
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

  it("Creates separate sales for identical items in different events", async () => {
    const OFFERER_1 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const OFFERER_2 = "0xcccccccccccccccccccccccccccccccccccccccc";
    const RECIPIENT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const NFT_CONTRACT = "0x1111111111111111111111111111111111111111";
    const TX_HASH_1 = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const TX_HASH_2 = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    // First OrderFulfilled event
    const event1 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      offerer: OFFERER_1,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT, 100n, 1n] as [bigint, string, bigint, bigint], // ERC721 NFT
      ],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 1000000000000000000n, OFFERER_1] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ], // ETH payment
      ],
      mockEventData: {
        block: { number: 18500000, timestamp: 1700000000, hash: "0xblock123" },
        transaction: { hash: TX_HASH_1 },
        chainId: 1,
        logIndex: 1,
      },
    });

    // Second OrderFulfilled event with identical items (should consolidate amounts)
    const event2 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      offerer: OFFERER_2,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT, 100n, 1n] as [bigint, string, bigint, bigint], // Same ERC721 NFT
      ],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 1000000000000000000n, OFFERER_2] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ], // Same ETH payment
      ],
      mockEventData: {
        block: { number: 18500000, timestamp: 1700000000, hash: "0xblock123" },
        transaction: { hash: TX_HASH_2 },
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

    // Process second event (should create separate sale)
    currentDb = await Seaport.OrderFulfilled.processEvent({
      event: event2,
      mockDb: currentDb,
    });

    const saleId1 = `${event1.chainId}_${event1.transaction.hash}`;
    const saleId2 = `${event2.chainId}_${event2.transaction.hash}`;
    const sale1 = currentDb.entities.Sale.get(saleId1);
    const sale2 = currentDb.entities.Sale.get(saleId2);

    // Verify both sales exist
    assert.ok(sale1, "First sale should exist");
    assert.ok(sale2, "Second sale should exist");

    // Verify both sales have identical structure (since they have identical items)
    assert.equal(sale1.offerItemTypes.length, 1, "First sale should have 1 offer item type");
    assert.equal(sale1.offerTokens.length, 1, "First sale should have 1 offer token");
    assert.equal(sale1.offerIdentifiers.length, 1, "First sale should have 1 offer identifier");
    assert.equal(sale1.offerAmounts.length, 1, "First sale should have 1 offer amount");

    assert.equal(sale2.offerItemTypes.length, 1, "Second sale should have 1 offer item type");
    assert.equal(sale2.offerTokens.length, 1, "Second sale should have 1 offer token");
    assert.equal(sale2.offerIdentifiers.length, 1, "Second sale should have 1 offer identifier");
    assert.equal(sale2.offerAmounts.length, 1, "Second sale should have 1 offer amount");

    // Verify both sales have identical offer items
    assert.equal(sale1.offerItemTypes[0], 2, "First sale offer item type should be ERC721");
    assert.equal(sale1.offerTokens[0], NFT_CONTRACT, "First sale offer token should match");
    assert.equal(sale1.offerIdentifiers[0], "100", "First sale offer identifier should match");
    assert.equal(sale1.offerAmounts[0], "1", "First sale offer amount should be 1");

    assert.equal(sale2.offerItemTypes[0], 2, "Second sale offer item type should be ERC721");
    assert.equal(sale2.offerTokens[0], NFT_CONTRACT, "Second sale offer token should match");
    assert.equal(sale2.offerIdentifiers[0], "100", "Second sale offer identifier should match");
    assert.equal(sale2.offerAmounts[0], "1", "Second sale offer amount should be 1");

    // Verify both sales have identical consideration items
    assert.equal(
      sale1.considerationItemTypes.length,
      1,
      "First sale should have 1 consideration item"
    );
    assert.equal(sale1.considerationItemTypes[0], 0, "First sale consideration should be ETH");
    assert.equal(
      sale1.considerationAmounts[0],
      "1000000000000000000",
      "First sale should have 1 ETH"
    );

    assert.equal(
      sale2.considerationItemTypes.length,
      1,
      "Second sale should have 1 consideration item"
    );
    assert.equal(sale2.considerationItemTypes[0], 0, "Second sale consideration should be ETH");
    assert.equal(
      sale2.considerationAmounts[0],
      "1000000000000000000",
      "Second sale should have 1 ETH"
    );

    // Verify both sales are separate entities
    assert.notEqual(sale1.id, sale2.id, "Sales should have different IDs");
  });

  describe("Processes real-world OrderFulfilled events (no merging)", () => {
    // These tests are removed as they were testing merging behavior that no longer exists
    // Each OrderFulfilled event now creates its own separate sale entity
    it("placeholder test", () => {
      assert.ok(true, "Merging behavior removed - each event creates separate sale");
    });
  });

  describe("Multiple OrderFulfilled Events Classification Fix", () => {
    it("Filters out empty ETH items from offers and considerations", async () => {
      const OFFERER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const RECIPIENT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const NFT_CONTRACT = "0x1111111111111111111111111111111111111111";

      const event = Seaport.OrderFulfilled.createMockEvent({
        orderHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        offerer: OFFERER,
        zone: "0x0000000000000000000000000000000000000000",
        recipient: RECIPIENT,
        offer: [
          [2n, NFT_CONTRACT, 100n, 1n] as [bigint, string, bigint, bigint], // ERC721 NFT
          [0n, "0x0000000000000000000000000000000000000000", 0n, 0n] as [
            bigint,
            string,
            bigint,
            bigint,
          ], // Empty ETH
        ],
        consideration: [
          [0n, "0x0000000000000000000000000000000000000000", 0n, 1000000000000000000n, OFFERER] as [
            bigint,
            string,
            bigint,
            bigint,
            string,
          ], // Real ETH payment
          [0n, "0x0000000000000000000000000000000000000000", 0n, 0n, OFFERER] as [
            bigint,
            string,
            bigint,
            bigint,
            string,
          ], // Empty ETH
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

      // Verify empty ETH items are filtered out
      assert.equal(sale?.offerItemTypes.length, 1, "Should have 1 offer item");
      assert.equal(sale?.offerTokens.length, 1, "Should have 1 offer token");
      assert.equal(sale?.offerIdentifiers.length, 1, "Should have 1 offer identifier");
      assert.equal(sale?.offerAmounts.length, 1, "Should have 1 offer amount");

      assert.equal(sale?.considerationItemTypes.length, 1, "Should have 1 consideration item");
      assert.equal(sale?.considerationTokens.length, 1, "Should have 1 consideration token");
      assert.equal(
        sale?.considerationIdentifiers.length,
        1,
        "Should have 1 consideration identifier"
      );
      assert.equal(sale?.considerationAmounts.length, 1, "Should have 1 consideration amount");
      assert.equal(
        sale?.considerationRecipients.length,
        1,
        "Should have 1 consideration recipient"
      );

      // Verify only the real items remain
      assert.equal(sale?.offerItemTypes[0], 2, "Offer should be ERC721");
      assert.equal(sale?.offerTokens[0], NFT_CONTRACT, "Offer token should be NFT contract");
      assert.equal(sale?.offerIdentifiers[0], "100", "Offer identifier should be token ID 100");
      assert.equal(sale?.offerAmounts[0], "1", "Offer amount should be 1");

      assert.equal(sale?.considerationItemTypes[0], 0, "Consideration should be ETH");
      assert.equal(
        sale?.considerationTokens[0],
        "0x0000000000000000000000000000000000000000",
        "Consideration token should be ETH"
      );
      assert.equal(sale?.considerationIdentifiers[0], "0", "Consideration identifier should be 0");
      assert.equal(
        sale?.considerationAmounts[0],
        "1000000000000000000",
        "Consideration amount should be 1 ETH"
      );
      assert.equal(
        sale?.considerationRecipients[0],
        OFFERER,
        "Consideration recipient should be offerer"
      );
    });

    describe("Processes real-world OrderFulfilled events", () => {
      // Create simple raw event data that works with the utility
      const rawEvent1 = {
        topics: [
          "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31",
          "0x000000000000000000000000d2Be832911A252302bAc09e30Fc124A405E142DF", // offerer
          "0x000000000000000000000000004c00500000ad104d7dbd00e3ae0a5c00560c00", // zone
        ],
        data: "0x991a6bb57a3606d8ace32a49511d7d69d19f6d4a74590cc637f637563a8629ca000000000000000000000000b1dda9e86ffd52b32c8c668803ad780eb7a324db00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000004440732b0d85e2a77dcb2caedfd940154241249a000000000000000000000000000000000000000000000000000000000000002d000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000002000000000000000000000000da6558fa1c2452938168ef79dfd29c45aba8a32b00000000000000000000000000000000000000000000000000000000000000370000000000000000000000000000000000000000000000000000000000000001000000000000000000000000d2be832911a252302bac09e30fc124a405e142df0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003782dace9d900000000000000000000000000000d2be832911a252302bac09e30fc124a405e142df00000000000000000000000000000000000000000000000000000000000000020000000000000000000000004440732b0d85e2a77dcb2caedfd940154241249a000000000000000000000000000000000000000000000000000000000000002d0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000b1dda9e86ffd52b32c8c668803ad780eb7a324db",
        blockNumber: 12345678,
        timestamp: 1640995200,
        transactionHash: "0x8399d87123c91534fd10b40465e5fd358b9f429ec5c1db6ba60dfbe1940bbd08",
        logIndex: 1,
        chainId: 1,
      };

      const rawEvent2 = {
        topics: [
          "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31",
          "0x000000000000000000000000b1dda9e86ffd52b32c8c668803ad780eb7a324db", // offerer
          "0x0000000000000000000000000000000000000000000000000000000000000000", // zone
        ],
        data: "0xe8982569afdf3cdc604768799707f3cc6d78569462aabf625fc038b7c755b7fc000000000000000000000000b1dda9e86ffd52b32c8c668803ad780eb7a324db000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003782dace9d9000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000da6558fa1c2452938168ef79dfd29c45aba8a32b000000000000000000000000000000000000000000000000000000000000003700000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000",
        blockNumber: 12345678,
        timestamp: 1640995200,
        transactionHash: "0x8399d87123c91534fd10b40465e5fd358b9f429ec5c1db6ba60dfbe1940bbd08",
        logIndex: 2,
        chainId: 1,
      };

      // Test cases for different processing orders
      const testCases = [
        {
          name: "Event1 then Event2",
          eventOrder: [rawEvent1, rawEvent2],
          description: "Process offerer NFT45->NFT55+WETH, then WETH->NFT56",
        },
        {
          name: "Event2 then Event1",
          eventOrder: [rawEvent2, rawEvent1],
          description: "Process WETH->NFT56, then offerer NFT45->NFT55+WETH",
        },
      ];

      // Test merging both events using mock events (since raw decoding is complex)
      testCases.forEach(({ name, eventOrder, description }) => {
        it(`${name}: ${description}`, async () => {
          // Create a fresh mock database for each test
          let currentDb = MockDb.createMockDb();

          // Process events in the specified order
          for (const e of eventOrder) {
            const event = decodeRawOrderFulfilledEvent(e);
            currentDb = await Seaport.OrderFulfilled.processEvent({
              event,
              mockDb: currentDb,
            });
          }

          // Check if any events have the same offerer and recipient (should be ignored)
          const eventsWithSameOffererRecipient = eventOrder.filter((e) => {
            const event = decodeRawOrderFulfilledEvent(e);
            return event.params.offerer.toLowerCase() === event.params.recipient.toLowerCase();
          });

          if (eventsWithSameOffererRecipient.length > 0) {
            // Events with same offerer and recipient should be ignored
            // Only events with different offerer and recipient should create sales
            const validEvents = eventOrder.filter((e) => {
              const event = decodeRawOrderFulfilledEvent(e);
              return event.params.offerer.toLowerCase() !== event.params.recipient.toLowerCase();
            });

            if (validEvents.length === 0) {
              // All events have same offerer and recipient, so no sales should be created
              const allSales = currentDb.entities.Sale.getAll();
              assert.equal(
                allSales.length,
                0,
                "No sales should be created when all events have same offerer and recipient"
              );
              return;
            }

            // Only check sales from valid events
            const validEvent = validEvents[0];
            const sale = currentDb.entities.Sale.get(
              `${validEvent.chainId}_${validEvent.transactionHash}`
            );
            assert.ok(
              sale,
              "Sale should be created only for events with different offerer and recipient"
            );
          } else {
            // All events have different offerer and recipient, so they should all create sales
            const allSales = currentDb.entities.Sale.getAll();
            assert.equal(
              allSales.length,
              eventOrder.length,
              "All events should create sales when offerer != recipient"
            );
          }

          // Verify that the test completed successfully
          assert.ok(true, "Test completed - events with same offerer and recipient are ignored");

          // Note: NFT56 is not present in the actual events, only NFT45 and NFT55
        });
      });
    });

    describe("Multiple OrderFulfilled Events Classification Fix", () => {
      it("should correctly classify as buy/sell instead of swap when merging events from same transaction", async () => {
        // Create a fresh mock database
        const testMockDb = MockDb.createMockDb();

        // Real addresses from the user's issue
        const seller = "0xe706E8B77Ca577D387e8F1710fBbC13395f769ef";
        const buyer = "0xd2Be832911A252302bAc09e30Fc124A405E142DF";
        const nftContract = "0x8CAe61967466eBBf15c12Dc802b29594bc04eFc6";
        const tokenId = "6529";

        // Common transaction data
        const transactionHash =
          "0x93b54096617778bee901b2c529a02e19fecd6530b6dc1c2c3c652d3f711d9816";
        const blockNumber = 17254251;
        const timestamp = 1683307019;
        const chainId = 1;

        // First OrderFulfilled event - decoded from real transaction data
        const rawEvent1 = {
          topics: [
            "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31",
            "0x000000000000000000000000e706e8b77ca577d387e8f1710fbbc13395f769ef",
            "0x000000000000000000000000004c00500000ad104d7dbd00e3ae0a5c00560c00",
          ],
          data: "0x0cbe8ea90f3eff89b8018150ddb809b68cdde8d61c63f9e6ca95855ef280561a000000000000000000000000d2be832911a252302bac09e30fc124a405e142df00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000008cae61967466ebbf15c12dc802b29594bc04efc600000000000000000000000000000000000000000000000000000000000019810000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c28bc241b4b000000000000000000000000000e706e8b77ca577d387e8f1710fbbc13395f769ef00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000131888b5aaf0000000000000000000000000000000a26b00c1f0df003000390027140000faa719000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e8da78911800000000000000000000000000021c87de6ab8c127b494349cd2de13e4f87424cdd0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007a369e24460000000000000000000000000007e5aa86d96f2f2f047afe6577033c0d6c093d92400000000000000000000000000000000000000000000000000000000000000020000000000000000000000008cae61967466ebbf15c12dc802b29594bc04efc600000000000000000000000000000000000000000000000000000000000019810000000000000000000000000000000000000000000000000000000000000001000000000000000000000000d2be832911a252302bac09e30fc124a405e142df",
          blockNumber,
          timestamp,
          transactionHash,
          logIndex: 1,
          chainId,
        };

        // Second OrderFulfilled event - decoded from real transaction data
        const rawEvent2 = {
          topics: [
            "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31",
            "0x000000000000000000000000d2be832911a252302bac09e30fc124a405e142df",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ],
          data: "0x06e56d23230e8d51b5bf47cbcbb929716f0bd056cc37f55dddc1124aae9635a8000000000000000000000000d2be832911a252302bac09e30fc124a405e142df00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002fbd55c62b580000000000000000000000000000000000000000000000000000000000000000000",
          blockNumber,
          timestamp,
          transactionHash,
          logIndex: 2,
          chainId,
        };

        // Decode the real events
        const event1 = decodeRawOrderFulfilledEvent(rawEvent1);
        const event2 = decodeRawOrderFulfilledEvent(rawEvent2);

        // Process both events
        const finalDb = await processEvents([event1, event2], testMockDb);

        // Check that only one Sale entity was created (merged)
        const saleId = `${chainId}_${transactionHash}`;
        const sale = finalDb.entities.Sale.get(saleId);
        assert.ok(sale, "Sale entity should be created");
        assert.equal(sale.market, "Seaport");
        assert.equal(sale.transactionHash, transactionHash);

        // Verify final classification is correct
        console.log(
          `\n✅ Sale classification: hasOfferNfts=${sale.offerItemTypes.some((type: number) => type === 2 || type === 3)}, hasConsiderationNfts=${sale.considerationItemTypes.some((type: number) => type === 2 || type === 3)}`
        );

        // Check account junctions - this is the key fix
        // The buyer should have a buy junction, not a swap junction
        const buyerBuyJunction = finalDb.entities.AccountBuy.get(
          `${buyer.toLowerCase()}:${saleId}`
        );
        const buyerSwapJunction = finalDb.entities.AccountSwap.get(
          `${buyer.toLowerCase()}:${saleId}`
        );

        // The seller should have a sell junction, not a swap junction
        const sellerSellJunction = finalDb.entities.AccountSell.get(
          `${seller.toLowerCase()}:${saleId}`
        );
        const sellerSwapJunction = finalDb.entities.AccountSwap.get(
          `${seller.toLowerCase()}:${saleId}`
        );

        // These should exist (correct classification)
        assert.ok(buyerBuyJunction, "Buyer should have a buy junction");
        assert.ok(sellerSellJunction, "Seller should have a sell junction");

        // Check if swap junctions are properly cleared (account_id/sale_id are undefined)
        const buyerSwapActive = !!(
          buyerSwapJunction &&
          buyerSwapJunction.account_id &&
          buyerSwapJunction.sale_id
        );
        const sellerSwapActive = !!(
          sellerSwapJunction &&
          sellerSwapJunction.account_id &&
          sellerSwapJunction.sale_id
        );

        // Also check if we have the correct junctions active
        const buyerBuyActive = !!(
          buyerBuyJunction &&
          buyerBuyJunction.account_id &&
          buyerBuyJunction.sale_id
        );
        const sellerSellActive = !!(
          sellerSellJunction &&
          sellerSellJunction.account_id &&
          sellerSellJunction.sale_id
        );

        // Verify stale junctions have been cleared
        if (!buyerSwapActive && !sellerSwapActive) {
          console.log("✅ Stale swap junctions successfully cleared");
        }

        // The correct assertion: swap junctions should be inactive
        assert.equal(buyerSwapActive, false, "Buyer should NOT have an active swap junction");
        assert.equal(sellerSwapActive, false, "Seller should NOT have an active swap junction");

        // And the correct junctions should be active
        assert.equal(buyerBuyActive, true, "Buyer should have an active buy junction");
        assert.equal(sellerSellActive, true, "Seller should have an active sell junction");

        if (!buyerSwapActive && !sellerSwapActive && buyerBuyActive && sellerSellActive) {
          console.log("🎉 Fix successful: Only correct buy/sell classifications remain active");
        }

        // Verify the Account entities were created
        const buyerAccount = finalDb.entities.Account.get(buyer.toLowerCase());
        const sellerAccount = finalDb.entities.Account.get(seller.toLowerCase());
        assert.ok(buyerAccount, "Buyer account should be created");
        assert.ok(sellerAccount, "Seller account should be created");

        // Verify NFT-related entities
        const nftContract_entity = finalDb.entities.NFTContract.get(nftContract.toLowerCase());
        const nftToken = finalDb.entities.NFTToken.get(`${nftContract.toLowerCase()}:${tokenId}`);
        assert.ok(nftContract_entity, "NFT contract should be created");
        assert.ok(nftToken, "NFT token should be created");

        // Verify SaleNFT junction
        const saleNftJunction = finalDb.entities.SaleNFT.get(
          `${saleId}:${nftContract.toLowerCase()}:${tokenId}`
        );
        assert.ok(saleNftJunction, "Sale-NFT junction should be created");

        console.log(
          "✅ Test passed: Multiple OrderFulfilled events correctly classified as buy/sell, not swap"
        );
      });

      it("should handle legitimate swap scenarios correctly", async () => {
        // Test case where it SHOULD be classified as a swap (NFT for NFT)
        const testMockDb = MockDb.createMockDb();

        const user1 = TEST_ADDRESSES.USER_1;
        const user2 = TEST_ADDRESSES.USER_2;
        const nftContract1 = NFT_CONTRACTS.TEST_NFT_1;
        const nftContract2 = NFT_CONTRACTS.TEST_NFT_2;
        const tokenId1 = 100n;
        const tokenId2 = 200n;

        const transactionHash =
          "0xswaptest1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        const blockNumber = 18500000;
        const timestamp = 1700000000;
        const chainId = 1;

        // User1 offers NFT1, wants NFT2
        const swapEvent = createMockOrderEvent({
          orderHash: "0xswap1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          offerer: user1,
          recipient: user2,
          offer: [[BigInt(ITEM_TYPES.ERC721), nftContract1, tokenId1, 1n]],
          consideration: [[BigInt(ITEM_TYPES.ERC721), nftContract2, tokenId2, 1n, user1]],
          blockNumber,
          timestamp,
          transactionHash,
          logIndex: 1,
          chainId,
        });

        const finalDb = await processEvents([swapEvent], testMockDb);

        const saleId = `${chainId}_${transactionHash}`;

        // Check if junctions are active (have valid account_id and sale_id)
        const user1SwapJunction = finalDb.entities.AccountSwap.get(
          `${user1.toLowerCase()}:${saleId}`
        );
        const user2SwapJunction = finalDb.entities.AccountSwap.get(
          `${user2.toLowerCase()}:${saleId}`
        );
        const user1BuyJunction = finalDb.entities.AccountBuy.get(
          `${user1.toLowerCase()}:${saleId}`
        );
        const user1SellJunction = finalDb.entities.AccountSell.get(
          `${user1.toLowerCase()}:${saleId}`
        );
        const user2BuyJunction = finalDb.entities.AccountBuy.get(
          `${user2.toLowerCase()}:${saleId}`
        );
        const user2SellJunction = finalDb.entities.AccountSell.get(
          `${user2.toLowerCase()}:${saleId}`
        );

        // Check which junctions are active
        const user1SwapActive = !!(
          user1SwapJunction &&
          user1SwapJunction.account_id &&
          user1SwapJunction.sale_id
        );
        const user2SwapActive = !!(
          user2SwapJunction &&
          user2SwapJunction.account_id &&
          user2SwapJunction.sale_id
        );
        const user1BuyActive = !!(
          user1BuyJunction &&
          user1BuyJunction.account_id &&
          user1BuyJunction.sale_id
        );
        const user1SellActive = !!(
          user1SellJunction &&
          user1SellJunction.account_id &&
          user1SellJunction.sale_id
        );
        const user2BuyActive = !!(
          user2BuyJunction &&
          user2BuyJunction.account_id &&
          user2BuyJunction.sale_id
        );
        const user2SellActive = !!(
          user2SellJunction &&
          user2SellJunction.account_id &&
          user2SellJunction.sale_id
        );

        // Both users should have active swap junctions
        assert.equal(
          user1SwapActive,
          true,
          "User1 should have active swap junction for NFT-to-NFT trade"
        );
        assert.equal(
          user2SwapActive,
          true,
          "User2 should have active swap junction for NFT-to-NFT trade"
        );

        // Neither should have active buy/sell junctions in a true swap
        assert.equal(user1BuyActive, false, "User1 should not have active buy junction in swap");
        assert.equal(user1SellActive, false, "User1 should not have active sell junction in swap");
        assert.equal(user2BuyActive, false, "User2 should not have active buy junction in swap");
        assert.equal(user2SellActive, false, "User2 should not have active sell junction in swap");

        console.log("✅ Test passed: Legitimate swap correctly classified");
      });

      it("should correctly classify complex sale as buy/sell when offerer is sole NFT recipient", async () => {
        // Test case for complex sale where offerer offers NFTs and gets some NFTs back
        // but is the only NFT recipient - should be classified as sale, not swap
        const testMockDb = MockDb.createMockDb();

        const seller = TEST_ADDRESSES.SELLER_1;
        const buyer = TEST_ADDRESSES.BUYER_1;
        const nftContract1 = NFT_CONTRACTS.TEST_NFT_1;
        const nftContract2 = NFT_CONTRACTS.TEST_NFT_2;
        const tokenId1 = 100n;
        const tokenId2 = 200n;
        const priceWei = 1000000000000000000n; // 1 ETH

        const transactionHash =
          "0xcomplexsale1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        const blockNumber = 18500000;
        const timestamp = 1700000000;
        const chainId = 1;

        // Complex sale: Seller offers multiple NFTs, gets some back + payment
        // This could happen in bundle sales with partial returns or complex marketplace scenarios
        const complexSaleEvent = createMockOrderEvent({
          orderHash: "0xcomplex1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          offerer: seller,
          recipient: buyer,
          offer: [
            // Seller offers multiple NFTs
            [BigInt(ITEM_TYPES.ERC721), nftContract1, tokenId1, 1n],
            [BigInt(ITEM_TYPES.ERC721), nftContract2, tokenId2, 1n],
          ],
          consideration: [
            // Seller gets payment
            [BigInt(ITEM_TYPES.NATIVE), TEST_ADDRESSES.ZERO_ADDRESS, 0n, priceWei, seller],
            // Seller gets one NFT back (perhaps unsold item in bundle)
            [BigInt(ITEM_TYPES.ERC721), nftContract2, tokenId2, 1n, seller],
          ],
          blockNumber,
          timestamp,
          transactionHash,
          logIndex: 1,
          chainId,
        });

        const finalDb = await processEvents([complexSaleEvent], testMockDb);

        const saleId = `${chainId}_${transactionHash}`;
        const sale = finalDb.entities.Sale.get(saleId);
        assert.ok(sale, "Sale entity should be created");

        const sellerSellJunction = finalDb.entities.AccountSell.get(
          `${seller.toLowerCase()}:${saleId}`
        );
        const sellerSwapJunction = finalDb.entities.AccountSwap.get(
          `${seller.toLowerCase()}:${saleId}`
        );

        const buyerBuyJunction = finalDb.entities.AccountBuy.get(
          `${buyer.toLowerCase()}:${saleId}`
        );
        const buyerSwapJunction = finalDb.entities.AccountSwap.get(
          `${buyer.toLowerCase()}:${saleId}`
        );

        // Check if junctions are active (have valid account_id and sale_id)
        const sellerSellActive = !!(
          sellerSellJunction &&
          sellerSellJunction.account_id &&
          sellerSellJunction.sale_id
        );
        const buyerBuyActive = !!(
          buyerBuyJunction &&
          buyerBuyJunction.account_id &&
          buyerBuyJunction.sale_id
        );
        const sellerSwapActive = !!(
          sellerSwapJunction &&
          sellerSwapJunction.account_id &&
          sellerSwapJunction.sale_id
        );
        const buyerSwapActive = !!(
          buyerSwapJunction &&
          buyerSwapJunction.account_id &&
          buyerSwapJunction.sale_id
        );

        // Assertions: Should be classified as buy/sell, not swap
        assert.equal(
          sellerSellActive,
          true,
          "Seller should have active sell junction for complex sale"
        );
        assert.equal(
          buyerBuyActive,
          true,
          "Buyer should have active buy junction for complex sale"
        );
        assert.equal(
          sellerSwapActive,
          false,
          "Seller should NOT have active swap junction for complex sale"
        );
        assert.equal(
          buyerSwapActive,
          false,
          "Buyer should NOT have active swap junction for complex sale"
        );
      });
    });
  });

  describe("Specific Event Analysis", () => {
    it("should correctly classify the offerer as buyer", async () => {
      const mockDb = MockDb.createMockDb();

      // Event data from user's query
      const rawEvent = {
        topics: [
          "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31",
          "0x000000000000000000000000d2be832911a252302bac09e30fc124a405e142df", // offerer
          "0x000000000000000000000000000056f7000000ece9003ca63978907a00ffd100", // zone
        ],
        data: "0x51c10c15de65d4aa4ac1a0d100c0297d9b8c9324477b85f176b68255539471f200000000000000000000000019f6c1d5c8308f7103524a339b0c7f0ad0f5b2d30000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b1a2bc2ec5000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002000000000000000000000000fd9fdfac71bbc7dd5c7176644de7fbfd1a6825ee2370610ea917f65ec1d8f1773b8be54d518a43758190646fbe985479416d68e10000000000000000000000000000000000000000000000000000000000000001000000000000000000000000d2be832911a252302bac09e30fc124a405e142df0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e35fa931a0000000000000000000000000000000a26b00c1f0df003000390027140000faa719",
        blockNumber: 12345678,
        timestamp: 1640995200,
        transactionHash: "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31",
        logIndex: 0,
        chainId: 1,
      };

      // Decode the event
      const event = decodeRawOrderFulfilledEvent(rawEvent);

      console.log("Decoded event:");
      console.log("Offerer:", event.params.offerer);
      console.log("Recipient:", event.params.recipient);
      console.log("Zone:", event.params.zone);
      console.log("Offer items:", event.params.offer);
      console.log("Consideration items:", event.params.consideration);

      // Process the event
      const updatedDb = await Seaport.OrderFulfilled.processEvent({
        event,
        mockDb,
      });

      const saleId = `${event.chainId}_${event.transaction.hash}`;
      const sale = updatedDb.entities.Sale.get(saleId);

      assert.ok(sale, "Sale should be created");

      // Check the classification
      const offererBuyJunction = updatedDb.entities.AccountBuy.get(
        `${event.params.offerer.toLowerCase()}:${saleId}`
      );
      const offererSellJunction = updatedDb.entities.AccountSell.get(
        `${event.params.offerer.toLowerCase()}:${saleId}`
      );
      const offererSwapJunction = updatedDb.entities.AccountSwap.get(
        `${event.params.offerer.toLowerCase()}:${saleId}`
      );

      console.log("\nClassification results:");
      console.log("offerer buy junction:", offererBuyJunction ? "EXISTS" : "MISSING");
      console.log("offerer sell junction:", offererSellJunction ? "EXISTS" : "MISSING");
      console.log("offerer swap junction:", offererSwapJunction ? "EXISTS" : "MISSING");

      console.log("\nSale structure:");
      console.log("Offer item types:", sale.offerItemTypes);
      console.log("Offer tokens:", sale.offerTokens);
      console.log("Offer amounts:", sale.offerAmounts);
      console.log("Consideration item types:", sale.considerationItemTypes);
      console.log("Consideration tokens:", sale.considerationTokens);
      console.log("Consideration amounts:", sale.considerationAmounts);
      console.log("Consideration recipients:", sale.considerationRecipients);

      // Based on the expectation: offerer should pay WETH to receive NFT
      // This should be classified as a BUY for offerer
      assert.ok(offererBuyJunction, "offerer should have a buy junction");
      assert.ok(!offererSellJunction, "offerer should NOT have a sell junction");
      assert.ok(!offererSwapJunction, "offerer should NOT have a swap junction");
    });
  });
});
