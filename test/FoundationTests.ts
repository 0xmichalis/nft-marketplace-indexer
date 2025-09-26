import assert from "assert";

import { TestHelpers } from "generated";
const { MockDb, Foundation } = TestHelpers;

describe("Foundation event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Test addresses
  const BUYER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const SELLER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const FOUNDATION_CONTRACT = "0xcda72070e455bb31c7690a170224ce43623d0b6f";
  const NFT_CONTRACT = "0xcccccccccccccccccccccccccccccccccccccccc";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  describe("BuyPriceAccepted event tests", () => {
    it("Sale is created correctly for BuyPriceAccepted event", async () => {
      // Creating mock for Foundation BuyPriceAccepted event
      const event = Foundation.BuyPriceAccepted.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 456n,
        seller: SELLER_ADDRESS,
        buyer: BUYER_ADDRESS,
        protocolFee: 1000000000000000000n, // 1 ETH in wei
        creatorFee: 25000000000000000n, // 0.025 ETH (2.5%)
        sellerRev: 975000000000000000n, // 0.975 ETH (97.5%)
        mockEventData: {
          block: {
            number: 18500000,
            timestamp: 1700000000,
          },
          transaction: {
            hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      // Processing the event
      const mockDbUpdated = await Foundation.BuyPriceAccepted.processEvent({
        event,
        mockDb,
      });

      // Getting the actual entities from the mock database
      const actualSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}`
      );
      const actualBuyerAccount = mockDbUpdated.entities.Account.get(BUYER_ADDRESS.toLowerCase());
      const actualSellerAccount = mockDbUpdated.entities.Account.get(SELLER_ADDRESS.toLowerCase());
      const actualNFTContract = mockDbUpdated.entities.NFTContract.get(NFT_CONTRACT.toLowerCase());
      const actualNFTToken = mockDbUpdated.entities.NFTToken.get(
        `${NFT_CONTRACT.toLowerCase()}:456`
      );

      // Verify account junctions were created
      const saleId = `${event.chainId}_${event.transaction.hash}`;
      const buyerBuyJunction = mockDbUpdated.entities.AccountBuy.get(
        `${BUYER_ADDRESS.toLowerCase()}:${saleId}`
      );
      const sellerSellJunction = mockDbUpdated.entities.AccountSell.get(
        `${SELLER_ADDRESS.toLowerCase()}:${saleId}`
      );

      // Assertions for the Sale entity
      assert(actualSale, "Sale should be created");
      assert.equal(actualSale.id, `${event.chainId}_${event.transaction.hash}`);
      assert.equal(actualSale.timestamp, BigInt(1700000000));
      assert.equal(actualSale.transactionHash, event.transaction.hash);
      assert.equal(actualSale.market, "Foundation");
      assert.equal(actualSale.offerer_id, SELLER_ADDRESS.toLowerCase());
      assert.equal(actualSale.recipient_id, BUYER_ADDRESS.toLowerCase());

      // Check NFT data via junction entity
      const allSaleNfts = mockDbUpdated.entities.SaleNFT.getAll();
      const saleNfts = allSaleNfts.filter((sn) => sn.sale_id === actualSale?.id);
      assert.equal(saleNfts.length, 1, "Sale should have one NFT");
      assert.equal(saleNfts[0].nftToken_id, `${NFT_CONTRACT.toLowerCase()}:456`);

      // Assertions for offer items (NFT being sold)
      assert.equal(actualSale.offerItemTypes.length, 1);
      assert.equal(actualSale.offerItemTypes[0], 2); // ERC721
      assert.equal(actualSale.offerTokens.length, 1);
      assert.equal(actualSale.offerTokens[0], NFT_CONTRACT);
      assert.equal(actualSale.offerIdentifiers.length, 1);
      assert.equal(actualSale.offerIdentifiers[0], "456");
      assert.equal(actualSale.offerAmounts.length, 1);
      assert.equal(actualSale.offerAmounts[0], "1");

      // Assertions for consideration items (ETH payment split)
      assert.equal(actualSale.considerationItemTypes.length, 3);
      assert.equal(actualSale.considerationItemTypes[0], 0); // ETH
      assert.equal(actualSale.considerationItemTypes[1], 0); // ETH
      assert.equal(actualSale.considerationItemTypes[2], 0); // ETH
      assert.equal(actualSale.considerationTokens.length, 3);
      assert.equal(actualSale.considerationTokens[0], ZERO_ADDRESS);
      assert.equal(actualSale.considerationTokens[1], ZERO_ADDRESS);
      assert.equal(actualSale.considerationTokens[2], ZERO_ADDRESS);
      assert.equal(actualSale.considerationIdentifiers.length, 3);
      assert.equal(actualSale.considerationIdentifiers[0], "0");
      assert.equal(actualSale.considerationIdentifiers[1], "0");
      assert.equal(actualSale.considerationIdentifiers[2], "0");
      assert.equal(actualSale.considerationAmounts.length, 3);
      assert.equal(actualSale.considerationAmounts[0], "975000000000000000"); // seller amount
      assert.equal(actualSale.considerationAmounts[1], "25000000000000000"); // creator amount
      assert.equal(actualSale.considerationAmounts[2], "1000000000000000000"); // foundation amount (protocolFee)
      assert.equal(actualSale.considerationRecipients.length, 3);
      assert.equal(actualSale.considerationRecipients[0], SELLER_ADDRESS);
      assert.equal(actualSale.considerationRecipients[1], NFT_CONTRACT);
      assert.equal(
        actualSale.considerationRecipients[2],
        "0x67Df244584b67E8C51B10aD610aAfFa9a402FdB6"
      ); // Foundation treasury

      // Assertions for Account entities
      assert(actualBuyerAccount, "Buyer account should be created");
      assert.equal(actualBuyerAccount.id, BUYER_ADDRESS.toLowerCase());
      assert.equal(actualBuyerAccount.address, BUYER_ADDRESS);

      assert(actualSellerAccount, "Seller account should be created");
      assert.equal(actualSellerAccount.id, SELLER_ADDRESS.toLowerCase());
      assert.equal(actualSellerAccount.address, SELLER_ADDRESS);

      // Assertions for NFT entities
      assert(actualNFTContract, "NFT contract should be created");
      assert.equal(actualNFTContract.id, NFT_CONTRACT.toLowerCase());
      assert.equal(actualNFTContract.address, NFT_CONTRACT);

      assert(actualNFTToken, "NFT token should be created");
      assert.equal(actualNFTToken.id, `${NFT_CONTRACT.toLowerCase()}:456`);
      assert.equal(actualNFTToken.contract_id, NFT_CONTRACT.toLowerCase());
      assert.equal(actualNFTToken.tokenId, "456");

      // Verify account junctions
      assert(buyerBuyJunction, "Buyer should have a buy junction");
      assert.equal(buyerBuyJunction.account_id, BUYER_ADDRESS.toLowerCase());
      assert.equal(buyerBuyJunction.sale_id, saleId);

      assert(sellerSellJunction, "Seller should have a sell junction");
      assert.equal(sellerSellJunction.account_id, SELLER_ADDRESS.toLowerCase());
      assert.equal(sellerSellJunction.sale_id, saleId);
    });

    it("Handles different token IDs correctly", async () => {
      const event = Foundation.BuyPriceAccepted.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 999999n, // Large token ID
        seller: SELLER_ADDRESS,
        buyer: BUYER_ADDRESS,
        protocolFee: 2000000000000000000n, // 2 ETH
        creatorFee: 50000000000000000n, // 0.05 ETH
        sellerRev: 1950000000000000000n, // 1.95 ETH
        mockEventData: {
          block: { number: 18500001, timestamp: 1700000001 },
          transaction: { hash: "0xtxhash2" },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      const mockDbUpdated = await Foundation.BuyPriceAccepted.processEvent({
        event,
        mockDb: MockDb.createMockDb(),
      });

      const actualSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}`
      );
      assert(actualSale, "Sale should be created");
      assert.equal(actualSale.offerIdentifiers[0], "999999");

      const actualNFTToken = mockDbUpdated.entities.NFTToken.get(
        `${NFT_CONTRACT.toLowerCase()}:999999`
      );
      assert(actualNFTToken, "NFT token should be created");
      assert.equal(actualNFTToken.tokenId, "999999");
    });

    it("Handles zero creator fee correctly (excludes zero entries)", async () => {
      const event = Foundation.BuyPriceAccepted.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 123n,
        seller: SELLER_ADDRESS,
        buyer: BUYER_ADDRESS,
        protocolFee: 1000000000000000000n, // 1 ETH
        creatorFee: 0n, // No creator fee
        sellerRev: 1000000000000000000n, // Full amount to seller
        mockEventData: {
          block: { number: 18500002, timestamp: 1700000002 },
          transaction: { hash: "0xtxhash3" },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      const mockDbUpdated = await Foundation.BuyPriceAccepted.processEvent({
        event,
        mockDb: MockDb.createMockDb(),
      });

      const actualSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}`
      );
      assert(actualSale, "Sale should be created");
      // Should only include seller and foundation entries (no zero creator line)
      assert.equal(actualSale.considerationItemTypes.length, 2);
      assert.equal(actualSale.considerationTokens.length, 2);
      assert.equal(actualSale.considerationIdentifiers.length, 2);
      assert.equal(actualSale.considerationAmounts.length, 2);
      assert.equal(actualSale.considerationRecipients.length, 2);
      assert.equal(actualSale.considerationAmounts[0], "1000000000000000000"); // seller amount
      assert.equal(actualSale.considerationRecipients[0], SELLER_ADDRESS);
      assert.equal(
        actualSale.considerationRecipients[1],
        "0x67Df244584b67E8C51B10aD610aAfFa9a402FdB6"
      ); // Foundation treasury
    });

    it("Creates separate account junctions for different sales", async () => {
      const testDb = MockDb.createMockDb();

      // First sale
      const event1 = Foundation.BuyPriceAccepted.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 100n,
        seller: SELLER_ADDRESS,
        buyer: BUYER_ADDRESS,
        protocolFee: 1000000000000000000n,
        creatorFee: 25000000000000000n,
        sellerRev: 975000000000000000n,
        mockEventData: {
          block: { number: 18500003, timestamp: 1700000003 },
          transaction: { hash: "0xtxhash4" },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      // Second sale - different buyer
      const BUYER2_ADDRESS = "0xdddddddddddddddddddddddddddddddddddddddd";
      const event2 = Foundation.BuyPriceAccepted.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 200n,
        seller: SELLER_ADDRESS,
        buyer: BUYER2_ADDRESS,
        protocolFee: 2000000000000000000n,
        creatorFee: 50000000000000000n,
        sellerRev: 1950000000000000000n,
        mockEventData: {
          block: { number: 18500004, timestamp: 1700000004 },
          transaction: { hash: "0xtxhash5" },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      // Process both events
      const dbAfterFirst = await Foundation.BuyPriceAccepted.processEvent({
        event: event1,
        mockDb: testDb,
      });

      const dbAfterSecond = await Foundation.BuyPriceAccepted.processEvent({
        event: event2,
        mockDb: dbAfterFirst,
      });

      // Verify both sales exist
      const sale1 = dbAfterSecond.entities.Sale.get(`${event1.chainId}_${event1.transaction.hash}`);
      const sale2 = dbAfterSecond.entities.Sale.get(`${event2.chainId}_${event2.transaction.hash}`);
      assert(sale1, "First sale should exist");
      assert(sale2, "Second sale should exist");

      // Verify account junctions for first sale
      const buyer1BuyJunction = dbAfterSecond.entities.AccountBuy.get(
        `${BUYER_ADDRESS.toLowerCase()}:1_${event1.transaction.hash}`
      );
      const seller1SellJunction = dbAfterSecond.entities.AccountSell.get(
        `${SELLER_ADDRESS.toLowerCase()}:1_${event1.transaction.hash}`
      );

      // Verify account junctions for second sale
      const buyer2BuyJunction = dbAfterSecond.entities.AccountBuy.get(
        `${BUYER2_ADDRESS.toLowerCase()}:1_${event2.transaction.hash}`
      );
      const seller2SellJunction = dbAfterSecond.entities.AccountSell.get(
        `${SELLER_ADDRESS.toLowerCase()}:1_${event2.transaction.hash}`
      );

      assert(buyer1BuyJunction, "Buyer 1 should have buy junction for sale 1");
      assert(seller1SellJunction, "Seller should have sell junction for sale 1");
      assert(buyer2BuyJunction, "Buyer 2 should have buy junction for sale 2");
      assert(seller2SellJunction, "Seller should have sell junction for sale 2");

      // Verify seller has 2 sell junctions (one for each sale)
      const allSellJunctions = dbAfterSecond.entities.AccountSell.getAll();
      const sellerSellJunctions = allSellJunctions.filter(
        (junction) => junction.account_id === SELLER_ADDRESS.toLowerCase()
      );
      assert.equal(sellerSellJunctions.length, 2, "Seller should have 2 sell junctions");
    });
  });

  describe("OfferAccepted event tests", () => {
    it("Sale is created correctly for OfferAccepted event", async () => {
      const event = Foundation.OfferAccepted.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 789n,
        buyer: BUYER_ADDRESS,
        seller: SELLER_ADDRESS,
        protocolFee: 500000000000000000n, // 0.5 ETH
        creatorFee: 10000000000000000n, // 0.01 ETH
        sellerRev: 490000000000000000n, // 0.49 ETH
        mockEventData: {
          block: {
            number: 18500010,
            timestamp: 1700000010,
          },
          transaction: {
            hash: "0xtxhash_offer_1",
          },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      const mockDbUpdated = await Foundation.OfferAccepted.processEvent({
        event,
        mockDb: MockDb.createMockDb(),
      });

      const actualSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}`
      );
      assert(actualSale, "Sale should be created");
      assert.equal(actualSale.offerer_id, SELLER_ADDRESS.toLowerCase());
      assert.equal(actualSale.recipient_id, BUYER_ADDRESS.toLowerCase());

      // Consideration arrays should include seller, creator, foundation
      assert.equal(actualSale.considerationAmounts.length, 3);
      assert.equal(actualSale.considerationAmounts[0], "490000000000000000");
      assert.equal(actualSale.considerationAmounts[1], "10000000000000000");
      assert.equal(actualSale.considerationAmounts[2], "500000000000000000");
    });

    it("Excludes zero creator and/or fee entries", async () => {
      const eventNoCreator = Foundation.OfferAccepted.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 111n,
        buyer: BUYER_ADDRESS,
        seller: SELLER_ADDRESS,
        protocolFee: 100000000000000000n, // 0.1 ETH
        creatorFee: 0n, // zero
        sellerRev: 900000000000000000n, // 0.9 ETH
        mockEventData: {
          block: { number: 18500011, timestamp: 1700000011 },
          transaction: { hash: "0xtxhash_offer_2" },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      const dbAfterNoCreator = await Foundation.OfferAccepted.processEvent({
        event: eventNoCreator,
        mockDb: MockDb.createMockDb(),
      });
      const saleNoCreator = dbAfterNoCreator.entities.Sale.get(
        `${eventNoCreator.chainId}_${eventNoCreator.transaction.hash}`
      );
      assert(saleNoCreator, "Sale should be created");
      assert.equal(saleNoCreator.considerationAmounts.length, 2);
      // Ensure no zero entries present
      assert(!saleNoCreator.considerationAmounts.includes("0"));

      const eventNoFees = Foundation.OfferAccepted.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 112n,
        buyer: BUYER_ADDRESS,
        seller: SELLER_ADDRESS,
        protocolFee: 0n, // zero
        creatorFee: 0n, // zero
        sellerRev: 1000000000000000000n, // 1 ETH
        mockEventData: {
          block: { number: 18500012, timestamp: 1700000012 },
          transaction: { hash: "0xtxhash_offer_3" },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      const dbAfterNoFees = await Foundation.OfferAccepted.processEvent({
        event: eventNoFees,
        mockDb: dbAfterNoCreator,
      });
      const saleNoFees = dbAfterNoFees.entities.Sale.get(
        `${eventNoFees.chainId}_${eventNoFees.transaction.hash}`
      );
      assert(saleNoFees, "Sale should be created");
      assert.equal(saleNoFees.considerationAmounts.length, 1);
      assert.equal(saleNoFees.considerationAmounts[0], "1000000000000000000");
      assert(!saleNoFees.considerationAmounts.includes("0"));
    });
  });

  describe("PrivateSaleFinalized event tests", () => {
    it("Sale is created correctly for PrivateSaleFinalized event", async () => {
      const event = Foundation.PrivateSaleFinalized.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 321n,
        seller: SELLER_ADDRESS,
        buyer: BUYER_ADDRESS,
        protocolFee: 300000000000000000n, // 0.3 ETH
        creatorFee: 20000000000000000n, // 0.02 ETH
        sellerRev: 680000000000000000n, // 0.68 ETH
        deadline: 1900000000n,
        mockEventData: {
          block: { number: 18500020, timestamp: 1700000020 },
          transaction: { hash: "0xtxhash_private_1" },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      const mockDbUpdated = await Foundation.PrivateSaleFinalized.processEvent({
        event,
        mockDb: MockDb.createMockDb(),
      });

      const sale = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);
      assert(sale, "Sale should be created");
      assert.equal(sale.offerTokens[0], NFT_CONTRACT);
      assert.equal(sale.offerIdentifiers[0], "321");
      assert.equal(sale.recipient_id, BUYER_ADDRESS.toLowerCase());
      assert.equal(sale.offerer_id, SELLER_ADDRESS.toLowerCase());
      assert.equal(sale.considerationAmounts.length, 3);
      assert.equal(sale.considerationAmounts[0], "680000000000000000");
      assert.equal(sale.considerationAmounts[1], "20000000000000000");
      assert.equal(sale.considerationAmounts[2], "300000000000000000");
    });

    it("Excludes zero creator fee for PrivateSaleFinalized", async () => {
      const event = Foundation.PrivateSaleFinalized.createMockEvent({
        nftContract: NFT_CONTRACT,
        tokenId: 322n,
        seller: SELLER_ADDRESS,
        buyer: BUYER_ADDRESS,
        protocolFee: 100000000000000000n, // 0.1
        creatorFee: 0n,
        sellerRev: 900000000000000000n, // 0.9
        deadline: 1900000001n,
        mockEventData: {
          block: { number: 18500021, timestamp: 1700000021 },
          transaction: { hash: "0xtxhash_private_2" },
          chainId: 1,
          logIndex: 1,
          srcAddress: FOUNDATION_CONTRACT,
        },
      });

      const db = await Foundation.PrivateSaleFinalized.processEvent({
        event,
        mockDb: MockDb.createMockDb(),
      });
      const sale = db.entities.Sale.get(`${event.chainId}_${event.transaction.hash}`);
      assert(sale, "Sale should be created");
      assert.equal(sale.considerationAmounts.length, 2);
      assert.equal(sale.considerationRecipients[0], SELLER_ADDRESS);
      assert.equal(sale.considerationRecipients[1], "0x67Df244584b67E8C51B10aD610aAfFa9a402FdB6");
    });
  });
});
