import assert from "assert";
import { TestHelpers, Sale } from "generated";
import { decodeRawOrderFulfilledEvent } from "./TestUtils";
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

// Helper function to validate merged sale based on offerer
function validateMergedSale(sale: Sale, isExpectedOfferer: boolean) {
  const NFT_CONTRACT = "0xDa6558fA1c2452938168EF79DfD29c45Aba8a32B";
  const OTHER_NFT_CONTRACT = "0x4440732B0D85e2a77DCb2CAEDfd940154241249a";
  const WETH_CONTRACT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  if (isExpectedOfferer) {
    // michalis.eth is the offerer: offers NFT45, receives NFT55 + 4 WETH + NFT45
    assert.equal(sale?.offerItemTypes.length, 1, "Should have 1 offer item (NFT45)");
    assert.equal(sale?.offerItemTypes[0], 2, "Offer should be ERC721");
    assert.equal(
      sale?.offerTokens[0].toLowerCase(),
      OTHER_NFT_CONTRACT.toLowerCase(),
      "Offer token should be OTHER_NFT_CONTRACT"
    );
    assert.equal(sale?.offerIdentifiers[0], "45", "Offer identifier should be 45");
    assert.equal(sale?.offerAmounts[0], "1", "Offer amount should be 1");

    assert.equal(
      sale?.considerationItemTypes.length,
      2,
      "Should have 2 consideration items (NFT55 + 4 WETH)"
    );

    // Check for NFT55
    const nft55Index = sale?.considerationIdentifiers.findIndex((id: string) => id === "55");
    assert.ok(nft55Index !== -1, "Should contain NFT55");
    assert.equal(
      sale?.considerationTokens[nft55Index!].toLowerCase(),
      NFT_CONTRACT.toLowerCase(),
      "NFT55 should be from correct contract"
    );
    assert.equal(sale?.considerationAmounts[nft55Index!], "1", "NFT55 amount should be 1");

    // Check for WETH
    const wethIndex = sale?.considerationTokens.findIndex(
      (token: string) => token.toLowerCase() === WETH_CONTRACT.toLowerCase()
    );
    assert.ok(wethIndex !== -1, "Should contain WETH");
    assert.equal(sale?.considerationItemTypes[wethIndex!], 1, "WETH should be ERC20");
    assert.equal(
      sale?.considerationAmounts[wethIndex!],
      "4000000000000000000",
      "WETH amount should be 4 WETH"
    );
  } else {
    // Other address is the offerer: offers 4 WETH + NFT55, receives NFT45
    assert.equal(sale?.offerItemTypes.length, 2, "Should have 2 offer items (4 WETH + NFT55)");

    // Check for WETH in offers
    const wethOfferIndex = sale?.offerTokens.findIndex(
      (token: string) => token.toLowerCase() === WETH_CONTRACT.toLowerCase()
    );
    assert.ok(wethOfferIndex !== -1, "Should contain WETH in offers");
    assert.equal(sale?.offerItemTypes[wethOfferIndex!], 1, "WETH should be ERC20");
    assert.equal(
      sale?.offerAmounts[wethOfferIndex!],
      "4000000000000000000",
      "WETH amount should be 4 WETH"
    );

    // Check for NFT55 in offers
    const nft55OfferIndex = sale?.offerIdentifiers.findIndex((id: string) => id === "55");
    assert.ok(nft55OfferIndex !== -1, "Should contain NFT55 in offers");
    assert.equal(
      sale?.offerTokens[nft55OfferIndex!].toLowerCase(),
      NFT_CONTRACT.toLowerCase(),
      "NFT55 should be from correct contract"
    );
    assert.equal(sale?.offerAmounts[nft55OfferIndex!], "1", "NFT55 amount should be 1");

    assert.equal(
      sale?.considerationItemTypes.length,
      1,
      "Should have 1 consideration item (NFT45)"
    );
    assert.equal(sale?.considerationItemTypes[0], 2, "Consideration should be ERC721");
    assert.equal(
      sale?.considerationTokens[0].toLowerCase(),
      OTHER_NFT_CONTRACT.toLowerCase(),
      "Consideration token should be OTHER_NFT_CONTRACT"
    );
    assert.equal(sale?.considerationIdentifiers[0], "45", "Consideration identifier should be 45");
    assert.equal(sale?.considerationAmounts[0], "1", "Consideration amount should be 1");
  }
}

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

    // Verify cross-merge: offers should contain both NFTs
    assert.equal(mergedSale.offerItemTypes.length, 2, "Should have 2 offer item types");
    assert.equal(mergedSale.offerTokens.length, 2, "Should have 2 offer tokens");
    assert.equal(mergedSale.offerIdentifiers.length, 2, "Should have 2 offer identifiers");
    assert.equal(mergedSale.offerAmounts.length, 2, "Should have 2 offer amounts");

    // Verify sophisticated merging: ETH items should be consolidated
    assert.equal(
      mergedSale.considerationItemTypes.length,
      1,
      "Should have 1 consideration item type (ETH consolidated)"
    );
    assert.equal(mergedSale.considerationTokens.length, 1, "Should have 1 consideration token");
    assert.equal(
      mergedSale.considerationIdentifiers.length,
      1,
      "Should have 1 consideration identifier"
    );
    assert.equal(mergedSale.considerationAmounts.length, 1, "Should have 1 consideration amount");
    assert.equal(
      mergedSale.considerationRecipients.length,
      1,
      "Should have 1 consideration recipient"
    );

    // Verify sophisticated merging: offers should contain NFT1 and NFT2
    const offerTokens = mergedSale.offerTokens;
    const offerItemTypes = mergedSale.offerItemTypes;
    assert.ok(offerTokens.includes(NFT_CONTRACT_1), "Offers should contain NFT1");
    assert.ok(offerTokens.includes(NFT_CONTRACT_2), "Offers should contain NFT2");
    assert.ok(offerItemTypes.includes(2), "Offers should contain ERC721 type");
    assert.equal(
      offerItemTypes.filter((type: number) => type === 2).length,
      2,
      "Should have 2 ERC721 items in offers"
    );

    // Verify sophisticated merging: considerations should contain ETH from both events
    const considerationTokens = mergedSale.considerationTokens;
    const considerationItemTypes = mergedSale.considerationItemTypes;
    assert.ok(
      considerationTokens.includes("0x0000000000000000000000000000000000000000"),
      "Considerations should contain ETH"
    );
    assert.ok(considerationItemTypes.includes(0), "Considerations should contain ETH type");
    assert.equal(
      considerationItemTypes.filter((type: number) => type === 0).length,
      1,
      "Should have 1 ETH item in considerations (consolidated)"
    );

    // Verify amounts are distributed correctly across offers and considerations
    const offerAmounts = mergedSale.offerAmounts;
    const considerationAmounts = mergedSale.considerationAmounts;
    assert.ok(offerAmounts.includes("1"), "Offers should contain NFT amounts");
    assert.ok(
      considerationAmounts.includes("3000000000000000000"),
      "Considerations should contain consolidated ETH payment amount (1 ETH + 2 ETH = 3 ETH)"
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

  it("Consolidates identical items when merging orders with identical items", async () => {
    const OFFERER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const RECIPIENT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const NFT_CONTRACT = "0x1111111111111111111111111111111111111111";
    const SAME_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // First OrderFulfilled event
    const event1 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT, 100n, 1n] as [bigint, string, bigint, bigint], // ERC721 NFT
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

    // Second OrderFulfilled event with identical items (should consolidate amounts)
    const event2 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT, 100n, 1n] as [bigint, string, bigint, bigint], // Same ERC721 NFT
      ],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 1000000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ], // Same ETH payment
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

    // Process second event (should merge and consolidate identical items)
    currentDb = await Seaport.OrderFulfilled.processEvent({
      event: event2,
      mockDb: currentDb,
    });

    const saleId = `${event1.chainId}_${event1.transaction.hash}`;
    const mergedSale = currentDb.entities.Sale.get(saleId);

    // Verify the sale exists
    assert.ok(mergedSale, "Merged sale should exist");

    // Verify identical items were consolidated - should still have only 1 item in each array
    assert.equal(
      mergedSale.offerItemTypes.length,
      1,
      "Should have 1 offer item type (no duplicates)"
    );
    assert.equal(mergedSale.offerTokens.length, 1, "Should have 1 offer token (no duplicates)");
    assert.equal(
      mergedSale.offerIdentifiers.length,
      1,
      "Should have 1 offer identifier (no duplicates)"
    );
    assert.equal(mergedSale.offerAmounts.length, 1, "Should have 1 offer amount (no duplicates)");

    assert.equal(
      mergedSale.considerationItemTypes.length,
      1,
      "Should have 1 consideration item type (no duplicates)"
    );
    assert.equal(
      mergedSale.considerationTokens.length,
      1,
      "Should have 1 consideration token (no duplicates)"
    );
    assert.equal(
      mergedSale.considerationIdentifiers.length,
      1,
      "Should have 1 consideration identifier (no duplicates)"
    );
    assert.equal(
      mergedSale.considerationAmounts.length,
      1,
      "Should have 1 consideration amount (no duplicates)"
    );
    assert.equal(
      mergedSale.considerationRecipients.length,
      1,
      "Should have 1 consideration recipient (no duplicates)"
    );

    // Verify the single item matches the original
    assert.equal(mergedSale.offerItemTypes[0], 2, "Offer item type should be ERC721");
    assert.equal(mergedSale.offerTokens[0], NFT_CONTRACT, "Offer token should match");
    assert.equal(mergedSale.offerIdentifiers[0], "100", "Offer identifier should match");
    assert.equal(
      mergedSale.offerAmounts[0],
      "2",
      "Offer amount should be consolidated (1 + 1 = 2)"
    );

    assert.equal(mergedSale.considerationItemTypes[0], 0, "Consideration item type should be ETH");
    assert.equal(
      mergedSale.considerationTokens[0],
      "0x0000000000000000000000000000000000000000",
      "Consideration token should be ETH"
    );
    assert.equal(
      mergedSale.considerationIdentifiers[0],
      "0",
      "Consideration identifier should be 0"
    );
    assert.equal(
      mergedSale.considerationAmounts[0],
      "2000000000000000000",
      "Consideration amount should be consolidated (1 ETH + 1 ETH = 2 ETH)"
    );
    assert.equal(
      mergedSale.considerationRecipients[0],
      OFFERER,
      "Consideration recipient should match"
    );
  });

  it("Handles case-insensitive token address comparison during merge", async () => {
    const OFFERER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const RECIPIENT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const NFT_CONTRACT_LOWER = "0x1111111111111111111111111111111111111111";
    const NFT_CONTRACT_UPPER = "0x1111111111111111111111111111111111111111".toUpperCase();
    const SAME_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // First OrderFulfilled event with lowercase contract address
    const event1 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [[2n, NFT_CONTRACT_LOWER, 100n, 1n] as [bigint, string, bigint, bigint]],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 1000000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ],
      ],
      mockEventData: {
        block: { number: 18500000, timestamp: 1700000000, hash: "0xblock123" },
        transaction: { hash: SAME_TX_HASH },
        chainId: 1,
        logIndex: 1,
      },
    });

    // Second OrderFulfilled event with uppercase contract address (should be treated as duplicate)
    const event2 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [[2n, NFT_CONTRACT_UPPER, 100n, 1n] as [bigint, string, bigint, bigint]],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 1000000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ],
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

    // Process second event (should be treated as duplicate due to case-insensitive comparison)
    currentDb = await Seaport.OrderFulfilled.processEvent({
      event: event2,
      mockDb: currentDb,
    });

    const saleId = `${event1.chainId}_${event1.transaction.hash}`;
    const mergedSale = currentDb.entities.Sale.get(saleId);

    // Verify no duplicates were created despite different case
    assert.equal(
      mergedSale.offerItemTypes.length,
      1,
      "Should have 1 offer item type (case-insensitive duplicate detection)"
    );
    assert.equal(
      mergedSale.offerTokens.length,
      1,
      "Should have 1 offer token (case-insensitive duplicate detection)"
    );
    assert.equal(
      mergedSale.considerationItemTypes.length,
      1,
      "Should have 1 consideration item type (case-insensitive duplicate detection)"
    );
  });

  it("Correctly merges orders with cross-matching offers and considerations", async () => {
    const OFFERER_1 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const OFFERER_2 = "0xcccccccccccccccccccccccccccccccccccccccc";
    const RECIPIENT = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const NFT_CONTRACT_1 = "0x1111111111111111111111111111111111111111";
    const NFT_CONTRACT_2 = "0x2222222222222222222222222222222222222222";
    const SAME_TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // First OrderFulfilled event - Alice offers NFT1 for ETH
    const event1 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      offerer: OFFERER_1,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [2n, NFT_CONTRACT_1, 100n, 1n] as [bigint, string, bigint, bigint], // Alice offers NFT1
      ],
      consideration: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 1000000000000000000n, OFFERER_1] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ], // Alice wants ETH
      ],
      mockEventData: {
        block: { number: 18500000, timestamp: 1700000000, hash: "0xblock123" },
        transaction: { hash: SAME_TX_HASH },
        chainId: 1,
        logIndex: 1,
      },
    });

    // Second OrderFulfilled event - Bob offers ETH for NFT2
    const event2 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      offerer: OFFERER_2,
      zone: "0x0000000000000000000000000000000000000000",
      recipient: RECIPIENT,
      offer: [
        [0n, "0x0000000000000000000000000000000000000000", 0n, 2000000000000000000n] as [
          bigint,
          string,
          bigint,
          bigint,
        ], // Bob offers ETH
      ],
      consideration: [
        [2n, NFT_CONTRACT_2, 200n, 1n, OFFERER_2] as [bigint, string, bigint, bigint, string], // Bob wants NFT2
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

    // Process second event (should cross-merge)
    currentDb = await Seaport.OrderFulfilled.processEvent({
      event: event2,
      mockDb: currentDb,
    });

    const saleId = `${event1.chainId}_${event1.transaction.hash}`;
    const mergedSale = currentDb.entities.Sale.get(saleId);

    // Verify the sale exists
    assert.ok(mergedSale, "Merged sale should exist");

    // Primary offerer (OFFERER_1) offers NFT1 and receives 1 ETH
    assert.equal(
      mergedSale.offerItemTypes.length,
      1,
      "Should have 1 offer item type (NFT1 from primary offerer)"
    );
    assert.equal(mergedSale.offerTokens.length, 1, "Should have 1 offer token");
    assert.equal(mergedSale.offerIdentifiers.length, 1, "Should have 1 offer identifier");
    assert.equal(mergedSale.offerAmounts.length, 1, "Should have 1 offer amount");

    // Primary offerer receives 1 ETH
    assert.equal(
      mergedSale.considerationItemTypes.length,
      1,
      "Should have 1 consideration item type (ETH to primary offerer)"
    );
    assert.equal(mergedSale.considerationTokens.length, 1, "Should have 1 consideration token");
    assert.equal(
      mergedSale.considerationIdentifiers.length,
      1,
      "Should have 1 consideration identifier"
    );
    assert.equal(mergedSale.considerationAmounts.length, 1, "Should have 1 consideration amount");
    assert.equal(
      mergedSale.considerationRecipients.length,
      1,
      "Should have 1 consideration recipient"
    );

    // Verify the new merging logic worked correctly:
    // Primary offerer (OFFERER_1) offers NFT1 and receives 1 ETH

    // Check that offers contain only NFT1 from primary offerer
    const offerTokens = mergedSale.offerTokens;
    const offerItemTypes = mergedSale.offerItemTypes;
    assert.ok(
      offerTokens.includes(NFT_CONTRACT_1),
      "Offers should contain NFT1 from primary offerer"
    );
    assert.equal(offerItemTypes[0], 2, "Offer should be ERC721");

    // Check that considerations contain only ETH going to primary offerer
    const considerationTokens = mergedSale.considerationTokens;
    const considerationItemTypes = mergedSale.considerationItemTypes;
    assert.ok(
      considerationTokens.includes("0x0000000000000000000000000000000000000000"),
      "Considerations should contain ETH going to primary offerer"
    );
    assert.equal(considerationItemTypes[0], 0, "Consideration should be ETH");
    assert.equal(mergedSale.considerationAmounts[0], "1000000000000000000", "Should receive 1 ETH");
  });

  it("Merges two OrderFulfilled events with WETH offer and ERC721 consideration", async () => {
    const OFFERER = "0xb1dda9e86ffd52b32c8c668803ad780eb7a324db"; // michalis.eth
    const RECIPIENT = "0xb1dda9e86ffd52b32c8c668803ad780eb7a324db"; // same as offerer
    const WETH_CONTRACT = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
    const NFT_CONTRACT = "0xda6558fa1c2452938168ef79dfd29c45aba8a32b";
    const SAME_TX_HASH = "0xe8982569afdf3cdc604768799707f3cc6d78569462aabf625fc038b7c755b7fc";
    const ORDER_HASH = "0xe8982569afdf3cdc604768799707f3cc6d78569462aabf625fc038b7c755b7fc";

    // First OrderFulfilled event - michalis offers NFT45 for NFT55 + 4 WETH
    const event1 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: ORDER_HASH,
      offerer: OFFERER,
      zone: "0x004C00500000aD104D7DBd00e3ae0A5C00560000", // Seaport zone
      recipient: RECIPIENT,
      offer: [
        [2n, "0x4440732b0d85e2a77dcb2caedfd940154241249a", 45n, 1n] as [
          bigint,
          string,
          bigint,
          bigint,
        ], // ERC721 token 45
      ],
      consideration: [
        [2n, NFT_CONTRACT, 55n, 1n, OFFERER] as [bigint, string, bigint, bigint, string], // ERC721 token 55
        [1n, WETH_CONTRACT, 0n, 4000000000000000000n, OFFERER] as [
          bigint,
          string,
          bigint,
          bigint,
          string,
        ], // 4 WETH
      ],
      mockEventData: {
        block: { number: 18500000, timestamp: 1700000000, hash: "0xblock123" },
        transaction: { hash: SAME_TX_HASH },
        chainId: 1,
        logIndex: 1,
      },
    });

    // Second OrderFulfilled event - offers 4 WETH for NFT56
    const event2 = Seaport.OrderFulfilled.createMockEvent({
      orderHash: ORDER_HASH,
      offerer: OFFERER,
      zone: "0x0000000000000000000000000000000000000000", // No zone
      recipient: RECIPIENT,
      offer: [
        [1n, WETH_CONTRACT, 0n, 4000000000000000000n] as [bigint, string, bigint, bigint], // 4 WETH
      ],
      consideration: [
        [2n, NFT_CONTRACT, 56n, 1n, OFFERER] as [bigint, string, bigint, bigint, string], // ERC721 token 56
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

    // Verify sophisticated merging: WETH should cancel out, only unique items remain
    assert.equal(mergedSale.offerItemTypes.length, 1, "Should have 1 offer item type (NFT45)");
    assert.equal(mergedSale.offerTokens.length, 1, "Should have 1 offer token");
    assert.equal(mergedSale.offerIdentifiers.length, 1, "Should have 1 offer identifier");
    assert.equal(mergedSale.offerAmounts.length, 1, "Should have 1 offer amount");

    // Verify sophisticated merging: WETH should cancel out, only unique items remain
    assert.equal(
      mergedSale.considerationItemTypes.length,
      2,
      "Should have 2 consideration item types (2 NFTs, WETH cancels out)"
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

    // Verify the sophisticated merging worked correctly:
    // Final offers should be: [NFT45 from event1]
    // Final considerations should be: [NFT55 from event1, NFT56 from event2]
    // WETH should cancel out completely (4 WETH offered - 4 WETH received = 0)

    // Check that offers contain 1 NFT
    const offerTokens = mergedSale.offerTokens;
    const offerItemTypes = mergedSale.offerItemTypes;

    // Should have 1 NFT offer
    const nftOffers = offerTokens.filter(
      (token: string, index: number) => offerItemTypes[index] === 2
    );
    assert.equal(nftOffers.length, 1, "Offers should contain 1 NFT item");

    // Check that considerations contain 2 NFTs and no WETH
    const considerationTokens = mergedSale.considerationTokens;
    const considerationItemTypes = mergedSale.considerationItemTypes;

    // Should have 2 NFT considerations
    const nftConsiderations = considerationTokens.filter(
      (token: string, index: number) => considerationItemTypes[index] === 2
    );
    assert.equal(nftConsiderations.length, 2, "Considerations should contain 2 NFT items");

    // Should have 0 WETH considerations (WETH canceled out)
    const wethConsiderations = considerationTokens.filter(
      (token: string, index: number) =>
        token === WETH_CONTRACT && considerationItemTypes[index] === 1
    );
    assert.equal(
      wethConsiderations.length,
      0,
      "Considerations should contain 0 WETH items (WETH canceled out)"
    );

    // Verify all NFTs are linked to the sale
    const allSaleNfts = currentDb.entities.SaleNFT.getAll();
    const saleNfts = allSaleNfts.filter((sn: any) => sn.sale_id === saleId);
    assert.equal(
      saleNfts.length,
      3,
      "Should have 3 NFT junctions (1 in offers, 2 in considerations)"
    );

    const nftTokenIds = saleNfts.map((sn: any) => sn.nftToken_id);
    assert.ok(
      nftTokenIds.includes(`${NFT_CONTRACT.toLowerCase()}:55`),
      "Should include NFT token 55"
    );
    assert.ok(
      nftTokenIds.includes(`${NFT_CONTRACT.toLowerCase()}:56`),
      "Should include NFT token 56"
    );
    assert.ok(
      nftTokenIds.includes(`0x4440732b0d85e2a77dcb2caedfd940154241249a:45`),
      "Should include NFT token 45"
    );

    // Verify the final result matches expected behavior:
    // michalis.eth gives NFT45 to receive NFT55 and NFT56 (WETH cancels out)

    // This means:
    // - In offers: NFT45 (what michalis gives)
    // - In considerations: NFT55, NFT56 (what michalis receives)
    // - WETH cancels out completely (4 WETH offered - 4 WETH received = 0)

    // Verify NFT45 is in offers
    const nft45InOffers = offerTokens.some(
      (token: string, index: number) =>
        token === "0x4440732b0d85e2a77dcb2caedfd940154241249a" &&
        offerItemTypes[index] === 2 &&
        mergedSale.offerIdentifiers[index] === "45"
    );
    assert.ok(nft45InOffers, "NFT45 should be in offers (what michalis gives)");

    // Verify WETH is canceled out (should not appear in considerations)
    const wethInConsiderations = considerationTokens.filter(
      (token: string, index: number) =>
        token === WETH_CONTRACT && considerationItemTypes[index] === 1
    );
    assert.equal(
      wethInConsiderations.length,
      0,
      "Should have 0 WETH considerations (WETH canceled out)"
    );

    // Verify NFT55 is in considerations
    const nft55InConsiderations = considerationTokens.some(
      (token: string, index: number) =>
        token === NFT_CONTRACT &&
        considerationItemTypes[index] === 2 &&
        mergedSale.considerationIdentifiers[index] === "55"
    );
    assert.ok(nft55InConsiderations, "NFT55 should be in considerations (what michalis receives)");

    // Verify NFT56 is in considerations
    const nft56InConsiderations = considerationTokens.some(
      (token: string, index: number) =>
        token === NFT_CONTRACT &&
        considerationItemTypes[index] === 2 &&
        mergedSale.considerationIdentifiers[index] === "56"
    );
    assert.ok(nft56InConsiderations, "NFT56 should be in considerations (what michalis receives)");
  });

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
    assert.equal(sale?.considerationRecipients.length, 1, "Should have 1 consideration recipient");

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

  describe("Processes real-world OrderFulfilled events with sophisticated merging", () => {
    const NFT_CONTRACT = "0xda6558fa1c2452938168ef79dfd29c45aba8a32b";
    const OTHER_NFT_CONTRACT = "0x4440732b0d85e2a77dcb2caedfd940154241249a";

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
        description: "Process michalis NFT45->NFT55+WETH, then WETH->NFT56",
      },
      {
        name: "Event2 then Event1",
        eventOrder: [rawEvent2, rawEvent1],
        description: "Process WETH->NFT56, then michalis NFT45->NFT55+WETH",
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

        // Get the merged sale
        const sale = currentDb.entities.Sale.get(
          `${rawEvent1.chainId}_${rawEvent1.transactionHash}`
        );

        // Verify the sale was created
        assert.ok(sale, "Sale should be created");

        // Expected result: The merged sale should show the net result from the offerer's perspective
        const isExpectedOfferer = eventOrder[0] === rawEvent1;
        validateMergedSale(sale, isExpectedOfferer);

        // The offerer should be from whichever event is processed first
        const EXPECTED_OFFERER =
          eventOrder[0] === rawEvent1
            ? "0xd2Be832911A252302bAc09e30Fc124A405E142DF" // michalis.eth from Event1
            : "0xb1DDa9e86fFd52b32C8c668803AD780eb7A324dB"; // other address from Event2
        assert.equal(
          sale?.offerer_id,
          EXPECTED_OFFERER.toLowerCase(),
          "Offerer should be from first processed event"
        );

        // Verify Account entities were created
        const offererAccount = currentDb.entities.Account.get(EXPECTED_OFFERER.toLowerCase());
        assert.ok(offererAccount, "Offerer account should be created");
        assert.equal(offererAccount?.address, EXPECTED_OFFERER);

        // Verify NFTToken entities were created
        const nftToken45 = currentDb.entities.NFTToken.get(`${OTHER_NFT_CONTRACT}:45`);
        assert.ok(nftToken45, "NFT token 45 should be created");
        assert.equal(nftToken45?.tokenId, "45");
        assert.equal(nftToken45?.contract_id, OTHER_NFT_CONTRACT);

        const nftToken55 = currentDb.entities.NFTToken.get(`${NFT_CONTRACT}:55`);
        assert.ok(nftToken55, "NFT token 55 should be created");
        assert.equal(nftToken55?.tokenId, "55");
        assert.equal(nftToken55?.contract_id, NFT_CONTRACT);

        // Note: NFT56 is not present in the actual events, only NFT45 and NFT55
      });
    });
  });
});
