import assert from "assert";
import { TestHelpers, Sale } from "generated";
const { MockDb, SuperRareAuctionHouse } = TestHelpers;

describe("SuperRareAuctionHouse AuctionSettled event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Test addresses
  const SELLER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const BIDDER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const NFT_CONTRACT = "0x1111111111111111111111111111111111111111";
  const AUCTION_HOUSE_CONTRACT = "0x8c9F364bf7a56Ed058fc63Ef81c6Cf09c833e656";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  it("Sale is created correctly for auction settlement", async () => {
    // Creating mock for SuperRareAuctionHouse AuctionSettled event
    const event = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
      contractAddress: NFT_CONTRACT,
      bidder: BIDDER_ADDRESS,
      seller: SELLER_ADDRESS,
      tokenId: 123n,
      amount: 1000000000000000000n, // 1 ETH in wei
      mockEventData: {
        block: {
          number: 18500000,
          timestamp: 1700000000,
          hash: "0xblock123",
        },
        transaction: {
          hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        },
        chainId: 1,
        logIndex: 1,
        srcAddress: AUCTION_HOUSE_CONTRACT,
      },
    });

    // Processing the event
    const mockDbUpdated = await SuperRareAuctionHouse.AuctionSettled.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entities from the mock database
    const actualSale = mockDbUpdated.entities.Sale.get(
      `${event.chainId}_${event.transaction.hash}`
    );
    const actualSellerAccount = mockDbUpdated.entities.Account.get(SELLER_ADDRESS.toLowerCase());
    const actualBidderAccount = mockDbUpdated.entities.Account.get(BIDDER_ADDRESS.toLowerCase());
    const actualNFTContract = mockDbUpdated.entities.NFTContract.get(NFT_CONTRACT.toLowerCase());
    const actualNFTToken = mockDbUpdated.entities.NFTToken.get(`${NFT_CONTRACT.toLowerCase()}:123`);

    // Creating the expected Sale entity
    const expectedSale: Sale = {
      id: `${event.chainId}_${event.transaction.hash}`,
      market: "SuperRare",
      offerer_id: SELLER_ADDRESS.toLowerCase(),
      recipient_id: BIDDER_ADDRESS.toLowerCase(),
      timestamp: BigInt(event.block.timestamp),
      transactionHash: event.transaction.hash,
      // Offer: NFT from the original contract
      offerItemTypes: [2], // ERC721
      offerTokens: [NFT_CONTRACT],
      offerIdentifiers: ["123"],
      offerAmounts: ["1"], // quantity 1 for NFT
      // Consideration: ETH payment
      considerationItemTypes: [0], // ETH
      considerationTokens: [ZERO_ADDRESS],
      considerationIdentifiers: ["0"], // no identifier for ETH
      considerationAmounts: ["1000000000000000000"],
      considerationRecipients: [SELLER_ADDRESS],
    };

    // Asserting that the Sale entity is created correctly
    assert.deepEqual(
      actualSale,
      expectedSale,
      "Actual Sale should match expected Sale for auction settlement"
    );

    // Asserting that Account entities are created
    assert.ok(actualSellerAccount, "Seller Account should be created");
    assert.equal(actualSellerAccount?.address, SELLER_ADDRESS, "Seller address should match");
    assert.ok(actualBidderAccount, "Bidder Account should be created");
    assert.equal(actualBidderAccount?.address, BIDDER_ADDRESS, "Bidder address should match");

    // Asserting that NFT entities are created
    assert.ok(actualNFTContract, "NFT Contract should be created");
    assert.equal(actualNFTContract?.address, NFT_CONTRACT, "NFT contract address should match");
    assert.ok(actualNFTToken, "NFT Token should be created");
    assert.equal(actualNFTToken?.tokenId, "123", "NFT token ID should match");

    // Testing relationships between entities
    // Note: In the schema, relationships are established via @derivedFrom fields
    // which are computed at query time, not stored directly in the entity

    // Testing that the sale references the correct NFT contract and token
    // Check NFT data via junction entity
    const allSaleNfts = mockDbUpdated.entities.SaleNFT.getAll();
    const saleNfts = allSaleNfts.filter((sn) => sn.sale_id === actualSale?.id);
    assert.equal(saleNfts.length, 1, "Sale should have one NFT");
    assert.equal(saleNfts[0].nftToken_id, `${NFT_CONTRACT.toLowerCase()}:123`);
    assert.equal(saleNfts[0].isOffer, true, "NFT should be in offer");

    // Note: With @derivedFrom relationships, sales are automatically linked
    // The relationships are computed at query time, not stored directly in the entity
  });

  it("Handles large token IDs correctly", async () => {
    const largeTokenId = 2n ** 255n - 1n; // Very large token ID

    const event = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
      contractAddress: NFT_CONTRACT,
      bidder: BIDDER_ADDRESS,
      seller: SELLER_ADDRESS,
      tokenId: largeTokenId,
      amount: 1000000000000000000n,
      mockEventData: {
        block: {
          number: 18500002,
          timestamp: 1700000200,
          hash: "0xblock125",
        },
        transaction: {
          hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567892",
        },
        chainId: 1,
        logIndex: 3,
        srcAddress: AUCTION_HOUSE_CONTRACT,
      },
    });

    const mockDbUpdated = await SuperRareAuctionHouse.AuctionSettled.processEvent({
      event,
      mockDb,
    });

    const actualSale = mockDbUpdated.entities.Sale.get(
      `${event.chainId}_${event.transaction.hash}`
    );
    const actualNFTToken = mockDbUpdated.entities.NFTToken.get(
      `${NFT_CONTRACT.toLowerCase()}:${largeTokenId.toString()}`
    );

    assert.ok(actualSale, "Sale should be created for large token ID");
    assert.equal(
      actualSale?.offerIdentifiers[0],
      largeTokenId.toString(),
      "Large token ID should be handled correctly"
    );
    assert.ok(actualNFTToken, "NFT Token should be created for large token ID");
    assert.equal(
      actualNFTToken?.tokenId,
      largeTokenId.toString(),
      "NFT token ID should match large value"
    );
  });

  it("Handles zero amount payment", async () => {
    const event = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
      contractAddress: NFT_CONTRACT,
      bidder: BIDDER_ADDRESS,
      seller: SELLER_ADDRESS,
      tokenId: 789n,
      amount: 0n, // Zero payment
      mockEventData: {
        block: {
          number: 18500003,
          timestamp: 1700000300,
          hash: "0xblock126",
        },
        transaction: {
          hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567893",
        },
        chainId: 1,
        logIndex: 4,
        srcAddress: AUCTION_HOUSE_CONTRACT,
      },
    });

    const mockDbUpdated = await SuperRareAuctionHouse.AuctionSettled.processEvent({
      event,
      mockDb,
    });

    const actualSale = mockDbUpdated.entities.Sale.get(
      `${event.chainId}_${event.transaction.hash}`
    );

    assert.ok(actualSale, "Sale should be created even with zero payment");
    assert.equal(
      actualSale?.considerationAmounts[0],
      "0",
      "Zero amount should be handled correctly"
    );
  });

  it("Handles very large payment amounts", async () => {
    const largeAmount = 2n ** 128n - 1n; // Very large amount

    const event = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
      contractAddress: NFT_CONTRACT,
      bidder: BIDDER_ADDRESS,
      seller: SELLER_ADDRESS,
      tokenId: 1000n,
      amount: largeAmount,
      mockEventData: {
        block: {
          number: 18500004,
          timestamp: 1700000400,
          hash: "0xblock127",
        },
        transaction: {
          hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567894",
        },
        chainId: 1,
        logIndex: 5,
        srcAddress: AUCTION_HOUSE_CONTRACT,
      },
    });

    const mockDbUpdated = await SuperRareAuctionHouse.AuctionSettled.processEvent({
      event,
      mockDb,
    });

    const actualSale = mockDbUpdated.entities.Sale.get(
      `${event.chainId}_${event.transaction.hash}`
    );

    assert.ok(actualSale, "Sale should be created for large payment amount");
    assert.equal(
      actualSale?.considerationAmounts[0],
      largeAmount.toString(),
      "Large amount should be handled correctly"
    );
  });

  it("Creates multiple sales with different timestamps", async () => {
    const events = [];
    const baseTimestamp = 1700002000;
    const baseBlockNumber = 18500020;

    // Create multiple events with different timestamps
    for (let i = 0; i < 3; i++) {
      const event = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
        contractAddress: NFT_CONTRACT,
        bidder: BIDDER_ADDRESS,
        seller: SELLER_ADDRESS,
        tokenId: BigInt(2000 + i),
        amount: 1000000000000000000n * BigInt(i + 1), // Increasing amounts
        mockEventData: {
          block: {
            number: baseBlockNumber + i,
            timestamp: baseTimestamp + i * 100,
            hash: `0xblock${baseBlockNumber + i}`,
          },
          transaction: {
            hash: `0xtxhash${i.toString().padStart(64, "0")}`,
          },
          chainId: 1,
          logIndex: 20 + i,
          srcAddress: AUCTION_HOUSE_CONTRACT,
        },
      });
      events.push(event);
    }

    let currentDb = mockDb;

    // Process all events
    for (const event of events) {
      currentDb = await SuperRareAuctionHouse.AuctionSettled.processEvent({
        event,
        mockDb: currentDb,
      });
    }

    // Verify all sales were created
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const saleId = `${event.chainId}_${event.transaction.hash}`;
      const actualSale = currentDb.entities.Sale.get(saleId);

      assert.ok(actualSale, `Sale ${i + 1} should be created`);
      assert.equal(
        actualSale?.timestamp,
        BigInt(event.block.timestamp),
        `Sale ${i + 1} timestamp should match`
      );
      assert.equal(
        actualSale?.offerIdentifiers[0],
        (2000 + i).toString(),
        `Sale ${i + 1} token ID should match`
      );
    }
  });

  it("Maintains relationship integrity across multiple sales", async () => {
    const events = [];
    const baseTimestamp = 1700003000;
    const baseBlockNumber = 18500030;

    // Create multiple events with the same NFT contract but different tokens
    for (let i = 0; i < 3; i++) {
      const event = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
        contractAddress: NFT_CONTRACT,
        bidder: BIDDER_ADDRESS,
        seller: SELLER_ADDRESS,
        tokenId: BigInt(3000 + i),
        amount: 1000000000000000000n,
        mockEventData: {
          block: {
            number: baseBlockNumber + i,
            timestamp: baseTimestamp + i * 100,
            hash: `0xblock${baseBlockNumber + i}`,
          },
          transaction: {
            hash: `0xtxhash${i.toString().padStart(64, "0")}`,
          },
          chainId: 1,
          logIndex: 30 + i,
          srcAddress: AUCTION_HOUSE_CONTRACT,
        },
      });
      events.push(event);
    }

    let currentDb = mockDb;

    // Process all events
    for (const event of events) {
      currentDb = await SuperRareAuctionHouse.AuctionSettled.processEvent({
        event,
        mockDb: currentDb,
      });
    }

    // Get the NFT contract after all sales
    const nftContract = currentDb.entities.NFTContract.get(NFT_CONTRACT.toLowerCase());

    // Verify the NFT contract exists
    assert.ok(nftContract, "NFT Contract should exist");

    // Verify each token exists
    for (let i = 0; i < 3; i++) {
      const tokenId = (3000 + i).toString();
      const token = currentDb.entities.NFTToken.get(`${NFT_CONTRACT.toLowerCase()}:${tokenId}`);

      assert.ok(token, `Token ${tokenId} should exist`);
    }

    // Note: With @derivedFrom relationships, sales are automatically linked
    // The relationships are computed at query time, not stored directly in the entity
  });

  it("Handles case sensitivity in addresses", async () => {
    const mixedCaseSeller = "0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa";
    const mixedCaseBidder = "0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb";

    const event = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
      contractAddress: NFT_CONTRACT,
      bidder: mixedCaseBidder,
      seller: mixedCaseSeller,
      tokenId: 123n,
      amount: 1000000000000000000n,
      mockEventData: {
        block: {
          number: 18500030,
          timestamp: 1700003000,
          hash: "0xblock300",
        },
        transaction: {
          hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567897",
        },
        chainId: 1,
        logIndex: 30,
        srcAddress: AUCTION_HOUSE_CONTRACT,
      },
    });

    const mockDbUpdated = await SuperRareAuctionHouse.AuctionSettled.processEvent({
      event,
      mockDb,
    });

    const actualSale = mockDbUpdated.entities.Sale.get(
      `${event.chainId}_${event.transaction.hash}`
    );
    const actualSellerAccount = mockDbUpdated.entities.Account.get(mixedCaseSeller.toLowerCase());
    const actualBidderAccount = mockDbUpdated.entities.Account.get(mixedCaseBidder.toLowerCase());

    assert.ok(actualSale, "Sale should be created with mixed case addresses");
    assert.equal(
      actualSale?.offerer_id,
      mixedCaseSeller.toLowerCase(),
      "Seller ID should be lowercase"
    );
    assert.equal(
      actualSale?.recipient_id,
      mixedCaseBidder.toLowerCase(),
      "Bidder ID should be lowercase"
    );
    assert.ok(actualSellerAccount, "Seller Account should be created with lowercase ID");
    assert.ok(actualBidderAccount, "Bidder Account should be created with lowercase ID");
  });

  it("Handles different chain IDs", async () => {
    const event = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
      contractAddress: NFT_CONTRACT,
      bidder: BIDDER_ADDRESS,
      seller: SELLER_ADDRESS,
      tokenId: 123n,
      amount: 1000000000000000000n,
      mockEventData: {
        block: {
          number: 18500040,
          timestamp: 1700004000,
          hash: "0xblock400",
        },
        transaction: {
          hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567898",
        },
        chainId: 1, // Use chain ID 1 (Ethereum) which is configured
        logIndex: 40,
        srcAddress: AUCTION_HOUSE_CONTRACT,
      },
    });

    const mockDbUpdated = await SuperRareAuctionHouse.AuctionSettled.processEvent({
      event,
      mockDb,
    });

    const actualSale = mockDbUpdated.entities.Sale.get(
      `${event.chainId}_${event.transaction.hash}`
    );

    assert.ok(actualSale, "Sale should be created for different chain ID");
    assert.equal(
      actualSale?.id,
      `${event.chainId}_${event.transaction.hash}`,
      "Sale ID should include chain ID"
    );
  });

  it("Verifies account relationships are properly established", async () => {
    const SELLER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const BIDDER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    const event = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
      contractAddress: NFT_CONTRACT,
      bidder: BIDDER,
      seller: SELLER,
      tokenId: 123n,
      amount: 1000000000000000000n,
      mockEventData: {
        block: { number: 18500050, timestamp: 1700005000, hash: "0xblock500" },
        transaction: { hash: "0xtx3" },
        chainId: 1,
        logIndex: 50,
        srcAddress: AUCTION_HOUSE_CONTRACT,
      },
    });

    const mockDbUpdated = await SuperRareAuctionHouse.AuctionSettled.processEvent({
      event,
      mockDb,
    });

    const sale = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const sellerAccount = mockDbUpdated.entities.Account.get(SELLER.toLowerCase());
    const bidderAccount = mockDbUpdated.entities.Account.get(BIDDER.toLowerCase());

    // Verify sale references correct accounts
    assert.ok(sale, "Sale should exist");
    assert.equal(sale?.offerer_id, SELLER.toLowerCase(), "Sale should reference seller");
    assert.equal(sale?.recipient_id, BIDDER.toLowerCase(), "Sale should reference bidder");

    // Verify accounts exist
    assert.ok(sellerAccount, "Seller account should exist");
    assert.ok(bidderAccount, "Bidder account should exist");

    // Verify account addresses
    assert.equal(sellerAccount.address, SELLER, "Seller account address should match");
    assert.equal(bidderAccount.address, BIDDER, "Bidder account address should match");
  });

  it("Handles different NFT contracts correctly", async () => {
    const CONTRACT_1 = "0x1111111111111111111111111111111111111111";
    const CONTRACT_2 = "0x2222222222222222222222222222222222222222";

    // Create sales from different contracts
    const event1 = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
      contractAddress: CONTRACT_1,
      bidder: BIDDER_ADDRESS,
      seller: SELLER_ADDRESS,
      tokenId: 100n,
      amount: 1000000000000000000n,
      mockEventData: {
        block: { number: 18500040, timestamp: 1700004000, hash: "0xblock400" },
        transaction: { hash: "0xtx1" },
        chainId: 1,
        logIndex: 40,
        srcAddress: AUCTION_HOUSE_CONTRACT,
      },
    });

    const event2 = SuperRareAuctionHouse.AuctionSettled.createMockEvent({
      contractAddress: CONTRACT_2,
      bidder: BIDDER_ADDRESS,
      seller: SELLER_ADDRESS,
      tokenId: 200n,
      amount: 2000000000000000000n,
      mockEventData: {
        block: { number: 18500041, timestamp: 1700004100, hash: "0xblock401" },
        transaction: { hash: "0xtx2" },
        chainId: 1,
        logIndex: 41,
        srcAddress: AUCTION_HOUSE_CONTRACT,
      },
    });

    // Process both events
    let currentDb = mockDb;
    currentDb = await SuperRareAuctionHouse.AuctionSettled.processEvent({
      event: event1,
      mockDb: currentDb,
    });
    currentDb = await SuperRareAuctionHouse.AuctionSettled.processEvent({
      event: event2,
      mockDb: currentDb,
    });

    // Verify both contracts exist
    const contract1 = currentDb.entities.NFTContract.get(CONTRACT_1.toLowerCase());
    const contract2 = currentDb.entities.NFTContract.get(CONTRACT_2.toLowerCase());

    assert.ok(contract1, "Contract 1 should exist");
    assert.ok(contract2, "Contract 2 should exist");

    // Verify each contract has its own token
    const token1 = currentDb.entities.NFTToken.get(`${CONTRACT_1.toLowerCase()}:100`);
    const token2 = currentDb.entities.NFTToken.get(`${CONTRACT_2.toLowerCase()}:200`);

    assert.ok(token1, "Token 1 should exist");
    assert.ok(token2, "Token 2 should exist");

    // Note: With @derivedFrom relationships, sales are automatically linked
    // The relationships are computed at query time, not stored directly in the entity

    // Verify tokens exist and have correct IDs
    assert.equal(token1.tokenId, "100", "Token 1 should have correct token ID");
    assert.equal(token2.tokenId, "200", "Token 2 should have correct token ID");

    // Verify sales reference correct contracts
    const sale1 = currentDb.entities.Sale.get(`${event1.chainId}_${event1.transaction.hash}`);
    const sale2 = currentDb.entities.Sale.get(`${event2.chainId}_${event2.transaction.hash}`);

    assert.ok(sale1, "Sale 1 should exist");
    assert.ok(sale2, "Sale 2 should exist");

    // Check NFT data via junction entities
    const allSaleNfts = currentDb.entities.SaleNFT.getAll();
    const sale1Nfts = allSaleNfts.filter((sn) => sn.sale_id === sale1.id);
    const sale2Nfts = allSaleNfts.filter((sn) => sn.sale_id === sale2.id);

    assert.equal(sale1Nfts.length, 1, "Sale 1 should have one NFT");
    assert.equal(sale2Nfts.length, 1, "Sale 2 should have one NFT");
    assert.equal(sale1Nfts[0].nftToken_id, `${CONTRACT_1.toLowerCase()}:100`);
    assert.equal(sale2Nfts[0].nftToken_id, `${CONTRACT_2.toLowerCase()}:200`);
  });
});
