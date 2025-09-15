import assert from "assert";

import { TestHelpers } from "generated";

import { ITEM_TYPES } from "./TestUtils";

const { MockDb, Seadrop } = TestHelpers;

describe("Seadrop event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Test addresses
  const PAYER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const MINTER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const FEE_RECIPIENT_ADDRESS = "0xfeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1";
  const NFT_CONTRACT = "0x1111111111111111111111111111111111111111";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  describe("SeaDropMint event tests", () => {
    it("Sale is created correctly for single mint", async () => {
      // Creating mock for Seadrop SeaDropMint event
      const event = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 1n,
        unitMintPrice: 1000000000000000000n, // 1 ETH in wei
        feeBps: 250n, // 2.5%
        dropStageIndex: 0n,
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
        },
      });

      // Processing the event
      const mockDbUpdated = await Seadrop.SeaDropMint.processEvent({
        event,
        mockDb,
      });

      // Getting the actual entities from the mock database
      const saleId = `${event.chainId}_${event.transaction.hash}_0`; // Individual sale ID with token ID
      const actualSale = mockDbUpdated.entities.Sale.get(saleId);
      const actualPayerAccount = mockDbUpdated.entities.Account.get(PAYER_ADDRESS.toLowerCase());
      const actualMinterAccount = mockDbUpdated.entities.Account.get(MINTER_ADDRESS.toLowerCase());
      const actualNFTContract = mockDbUpdated.entities.NFTContract.get(NFT_CONTRACT.toLowerCase());
      const actualSeadropCounter = mockDbUpdated.entities.SeadropCounter.get(NFT_CONTRACT);

      // Verify account junctions were created (only buy junction since sell tracking is disabled)
      const minterBuyJunction = mockDbUpdated.entities.AccountBuy.get(
        `${MINTER_ADDRESS.toLowerCase()}:${saleId}`
      );

      // Assertions for the Sale entity
      assert(actualSale, "Sale should be created");
      assert.equal(actualSale.id, saleId);
      assert.equal(actualSale.timestamp, BigInt(1700000000));
      assert.equal(actualSale.transactionHash, event.transaction.hash);
      assert.equal(actualSale.market, "Seadrop");
      assert.equal(actualSale.offerer_id, "0x0000000000000000000000000000000000000000");
      assert.equal(actualSale.recipient_id, MINTER_ADDRESS.toLowerCase());

      // Check NFT data via junction entity
      const allSaleNfts = mockDbUpdated.entities.SaleNFT.getAll();
      const saleNfts = allSaleNfts.filter((sn) => sn.sale_id === actualSale?.id);
      assert.equal(saleNfts.length, 1, "Sale should have one NFT");
      assert.equal(saleNfts[0].nftToken_id, `${NFT_CONTRACT.toLowerCase()}:0`);

      // Assertions for offer items (single NFT being minted)
      assert.equal(actualSale.offerItemTypes.length, 1);
      assert.equal(actualSale.offerItemTypes[0], ITEM_TYPES.ERC721);
      assert.equal(actualSale.offerTokens.length, 1);
      assert.equal(actualSale.offerTokens[0], NFT_CONTRACT);
      assert.equal(actualSale.offerIdentifiers.length, 1);
      assert.equal(actualSale.offerIdentifiers[0], "0"); // First token ID
      assert.equal(actualSale.offerAmounts.length, 1);
      assert.equal(actualSale.offerAmounts[0], "1");

      // Assertions for consideration items (ETH payment per token)
      assert.equal(actualSale.considerationItemTypes.length, 1);
      assert.equal(actualSale.considerationItemTypes[0], ITEM_TYPES.NATIVE);
      assert.equal(actualSale.considerationTokens.length, 1);
      assert.equal(actualSale.considerationTokens[0], ZERO_ADDRESS);
      assert.equal(actualSale.considerationIdentifiers.length, 1);
      assert.equal(actualSale.considerationIdentifiers[0], "0");
      assert.equal(actualSale.considerationAmounts.length, 1);
      assert.equal(actualSale.considerationAmounts[0], "1000000000000000000"); // 1 ETH per token
      assert.equal(actualSale.considerationRecipients.length, 1);
      assert.equal(
        actualSale.considerationRecipients[0],
        "0x0000000000000000000000000000000000000000"
      );

      // Assertions for Account entities
      assert(actualPayerAccount, "Payer account should be created");
      assert.equal(actualPayerAccount.id, PAYER_ADDRESS.toLowerCase());
      assert.equal(actualPayerAccount.address, PAYER_ADDRESS);

      assert(actualMinterAccount, "Minter account should be created");
      assert.equal(actualMinterAccount.id, MINTER_ADDRESS.toLowerCase());
      assert.equal(actualMinterAccount.address, MINTER_ADDRESS);

      // Assertions for NFT entities
      assert(actualNFTContract, "NFT contract should be created");
      assert.equal(actualNFTContract.id, NFT_CONTRACT.toLowerCase());
      assert.equal(actualNFTContract.address, NFT_CONTRACT);

      const actualNFTToken = mockDbUpdated.entities.NFTToken.get(`${NFT_CONTRACT.toLowerCase()}:0`);
      assert(actualNFTToken, "NFT token should be created");
      assert.equal(actualNFTToken.id, `${NFT_CONTRACT.toLowerCase()}:0`);
      assert.equal(actualNFTToken.contract_id, NFT_CONTRACT.toLowerCase());
      assert.equal(actualNFTToken.tokenId, "0");

      // Assertions for SeadropCounter
      assert(actualSeadropCounter, "SeadropCounter should be created");
      assert.equal(actualSeadropCounter.id, NFT_CONTRACT);
      assert.equal(actualSeadropCounter.counter, BigInt(1)); // Counter incremented by 1

      // Verify account junctions (only buy junction since sell tracking is disabled)
      assert(minterBuyJunction, "Minter should have a buy junction");
      assert.equal(minterBuyJunction.account_id, MINTER_ADDRESS.toLowerCase());
      assert.equal(minterBuyJunction.sale_id, saleId);
    });

    it("Handles multiple quantity mint correctly", async () => {
      const testDb = MockDb.createMockDb();
      const quantityMinted = 3n;
      const unitMintPrice = 500000000000000000n; // 0.5 ETH

      const event = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted,
        unitMintPrice,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: {
            number: 18500001,
            timestamp: 1700000001,
            hash: "0xblock124",
          },
          transaction: {
            hash: "0xtxhash_multiple_mint",
          },
          chainId: 1,
          logIndex: 1,
        },
      });

      const mockDbUpdated = await Seadrop.SeaDropMint.processEvent({
        event,
        mockDb: testDb,
      });

      const actualSeadropCounter = mockDbUpdated.entities.SeadropCounter.get(NFT_CONTRACT);

      // Verify counter was incremented by quantity
      assert(actualSeadropCounter, "SeadropCounter should exist");
      assert.equal(actualSeadropCounter.counter, BigInt(3));

      // Verify individual sales were created for each token
      const sale0 = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}_0`);
      const sale1 = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}_1`);
      const sale2 = mockDbUpdated.entities.Sale.get(`${event.chainId}_${event.transaction.hash}_2`);

      assert(sale0, "Sale for token 0 should be created");
      assert(sale1, "Sale for token 1 should be created");
      assert(sale2, "Sale for token 2 should be created");

      // Verify each sale has single NFT offer
      assert.equal(sale0.offerItemTypes.length, 1);
      assert.equal(sale0.offerIdentifiers[0], "0");
      assert.equal(sale0.offerAmounts[0], "1");
      assert.equal(sale0.considerationAmounts[0], unitMintPrice.toString());

      assert.equal(sale1.offerItemTypes.length, 1);
      assert.equal(sale1.offerIdentifiers[0], "1");
      assert.equal(sale1.offerAmounts[0], "1");
      assert.equal(sale1.considerationAmounts[0], unitMintPrice.toString());

      assert.equal(sale2.offerItemTypes.length, 1);
      assert.equal(sale2.offerIdentifiers[0], "2");
      assert.equal(sale2.offerAmounts[0], "1");
      assert.equal(sale2.considerationAmounts[0], unitMintPrice.toString());

      // Verify all sales have same transaction hash and market
      assert.equal(sale0.transactionHash, event.transaction.hash);
      assert.equal(sale1.transactionHash, event.transaction.hash);
      assert.equal(sale2.transactionHash, event.transaction.hash);
      assert.equal(sale0.market, "Seadrop");
      assert.equal(sale1.market, "Seadrop");
      assert.equal(sale2.market, "Seadrop");

      // Verify SaleNFT junctions were created for all tokens
      const allSaleNfts = mockDbUpdated.entities.SaleNFT.getAll();
      const sale0Nfts = allSaleNfts.filter((sn) => sn.sale_id === sale0?.id);
      const sale1Nfts = allSaleNfts.filter((sn) => sn.sale_id === sale1?.id);
      const sale2Nfts = allSaleNfts.filter((sn) => sn.sale_id === sale2?.id);

      assert.equal(sale0Nfts.length, 1, "Sale 0 should have 1 NFT junction");
      assert.equal(sale1Nfts.length, 1, "Sale 1 should have 1 NFT junction");
      assert.equal(sale2Nfts.length, 1, "Sale 2 should have 1 NFT junction");

      assert.equal(sale0Nfts[0].nftToken_id, `${NFT_CONTRACT.toLowerCase()}:0`);
      assert.equal(sale1Nfts[0].nftToken_id, `${NFT_CONTRACT.toLowerCase()}:1`);
      assert.equal(sale2Nfts[0].nftToken_id, `${NFT_CONTRACT.toLowerCase()}:2`);
    });

    it("Maintains counter state across multiple mints", async () => {
      const testDb = MockDb.createMockDb();

      // First mint - 2 tokens
      const event1 = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 2n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500002, timestamp: 1700000002, hash: "0xblock125" },
          transaction: { hash: "0xtxhash_first_mint" },
          chainId: 1,
          logIndex: 1,
        },
      });

      let currentDb = await Seadrop.SeaDropMint.processEvent({
        event: event1,
        mockDb: testDb,
      });

      // Verify first mint counter
      let counter = currentDb.entities.SeadropCounter.get(NFT_CONTRACT);
      assert.equal(counter?.counter, BigInt(2));

      // Second mint - 3 tokens
      const event2 = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 3n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500003, timestamp: 1700000003, hash: "0xblock126" },
          transaction: { hash: "0xtxhash_second_mint" },
          chainId: 1,
          logIndex: 1,
        },
      });

      currentDb = await Seadrop.SeaDropMint.processEvent({
        event: event2,
        mockDb: currentDb,
      });

      // Verify second mint counter
      counter = currentDb.entities.SeadropCounter.get(NFT_CONTRACT);
      assert.equal(counter?.counter, BigInt(5)); // 2 + 3

      // Verify second mint creates individual sales with token IDs starting from 2
      // Current implementation uses token ID in sale ID, not array index
      const sale2_0 = currentDb.entities.Sale.get(`${event2.chainId}_${event2.transaction.hash}_2`);
      const sale2_1 = currentDb.entities.Sale.get(`${event2.chainId}_${event2.transaction.hash}_3`);
      const sale2_2 = currentDb.entities.Sale.get(`${event2.chainId}_${event2.transaction.hash}_4`);

      assert(sale2_0, "Second mint sale 2 should exist");
      assert(sale2_1, "Second mint sale 3 should exist");
      assert(sale2_2, "Second mint sale 4 should exist");
      assert.equal(sale2_0?.offerIdentifiers[0], "2");
      assert.equal(sale2_1?.offerIdentifiers[0], "3");
      assert.equal(sale2_2?.offerIdentifiers[0], "4");
    });

    it("Handles different NFT contracts with separate counters", async () => {
      const testDb = MockDb.createMockDb();
      const NFT_CONTRACT_2 = "0x2222222222222222222222222222222222222222";

      // Mint from first contract
      const event1 = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 2n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500004, timestamp: 1700000004, hash: "0xblock127" },
          transaction: { hash: "0xtxhash_contract1" },
          chainId: 1,
          logIndex: 1,
        },
      });

      let currentDb = await Seadrop.SeaDropMint.processEvent({
        event: event1,
        mockDb: testDb,
      });

      // Mint from second contract
      const event2 = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT_2,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 3n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500005, timestamp: 1700000005, hash: "0xblock128" },
          transaction: { hash: "0xtxhash_contract2" },
          chainId: 1,
          logIndex: 1,
        },
      });

      currentDb = await Seadrop.SeaDropMint.processEvent({
        event: event2,
        mockDb: currentDb,
      });

      // Verify separate counters
      const counter1 = currentDb.entities.SeadropCounter.get(NFT_CONTRACT);
      const counter2 = currentDb.entities.SeadropCounter.get(NFT_CONTRACT_2);

      assert.equal(counter1?.counter, BigInt(2));
      assert.equal(counter2?.counter, BigInt(3));

      // Verify token IDs are independent - each contract starts from 0
      const sale1_0 = currentDb.entities.Sale.get(`${event1.chainId}_${event1.transaction.hash}_0`);
      const sale1_1 = currentDb.entities.Sale.get(`${event1.chainId}_${event1.transaction.hash}_1`);
      const sale2_0 = currentDb.entities.Sale.get(`${event2.chainId}_${event2.transaction.hash}_0`);
      const sale2_1 = currentDb.entities.Sale.get(`${event2.chainId}_${event2.transaction.hash}_1`);
      const sale2_2 = currentDb.entities.Sale.get(`${event2.chainId}_${event2.transaction.hash}_2`);

      assert.equal(sale1_0?.offerIdentifiers[0], "0");
      assert.equal(sale1_1?.offerIdentifiers[0], "1");
      assert.equal(sale2_0?.offerIdentifiers[0], "0");
      assert.equal(sale2_1?.offerIdentifiers[0], "1");
      assert.equal(sale2_2?.offerIdentifiers[0], "2");
    });

    it("Handles zero unit price correctly", async () => {
      const testDb = MockDb.createMockDb();

      const event = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 1n,
        unitMintPrice: 0n, // Free mint
        feeBps: 0n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500006, timestamp: 1700000006, hash: "0xblock129" },
          transaction: { hash: "0xtxhash_free_mint" },
          chainId: 1,
          logIndex: 1,
        },
      });

      const mockDbUpdated = await Seadrop.SeaDropMint.processEvent({
        event,
        mockDb: testDb,
      });

      const actualSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}_0`
      );

      // Verify sale was created
      assert(actualSale, "Sale should be created");

      // Verify consideration has zero payment
      assert.equal(actualSale.considerationAmounts.length, 1);
      assert.equal(actualSale.considerationAmounts[0], "0");
    });

    it("Creates separate sales for different transactions", async () => {
      const testDb = MockDb.createMockDb();

      // First transaction
      const event1 = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 1n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500007, timestamp: 1700000007, hash: "0xblock130" },
          transaction: { hash: "0xtxhash_transaction1" },
          chainId: 1,
          logIndex: 1,
        },
      });

      // Second transaction
      const event2 = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 1n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500008, timestamp: 1700000008, hash: "0xblock131" },
          transaction: { hash: "0xtxhash_transaction2" },
          chainId: 1,
          logIndex: 1,
        },
      });

      let currentDb = await Seadrop.SeaDropMint.processEvent({
        event: event1,
        mockDb: testDb,
      });

      currentDb = await Seadrop.SeaDropMint.processEvent({
        event: event2,
        mockDb: currentDb,
      });

      // Verify both sales exist (individual sales per token)
      const sale1 = currentDb.entities.Sale.get(`${event1.chainId}_${event1.transaction.hash}_0`);
      const sale2 = currentDb.entities.Sale.get(`${event2.chainId}_${event2.transaction.hash}_1`);

      assert(sale1, "First sale should exist");
      assert(sale2, "Second sale should exist");
      assert.notEqual(sale1?.id, sale2?.id, "Sales should have different IDs");

      // Verify counter was incremented for both
      const counter = currentDb.entities.SeadropCounter.get(NFT_CONTRACT);
      assert.equal(counter?.counter, BigInt(2));

      // Verify token IDs are sequential across transactions
      assert.equal(sale1?.offerIdentifiers[0], "0");
      assert.equal(sale2?.offerIdentifiers[0], "1");
    });

    it("Handles large quantity mints correctly", async () => {
      const testDb = MockDb.createMockDb();
      const largeQuantity = 100n;

      const event = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: largeQuantity,
        unitMintPrice: 100000000000000000n, // 0.1 ETH
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500009, timestamp: 1700000009, hash: "0xblock132" },
          transaction: { hash: "0xtxhash_large_mint" },
          chainId: 1,
          logIndex: 1,
        },
      });

      const mockDbUpdated = await Seadrop.SeaDropMint.processEvent({
        event,
        mockDb: testDb,
      });

      const actualSeadropCounter = mockDbUpdated.entities.SeadropCounter.get(NFT_CONTRACT);

      // Verify counter was incremented correctly
      assert(actualSeadropCounter, "SeadropCounter should exist");
      assert.equal(actualSeadropCounter.counter, largeQuantity);

      // Verify individual sales were created for each token
      const firstSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}_0`
      );
      const lastSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}_${(largeQuantity - 1n).toString()}`
      );

      assert(firstSale, "First sale should be created");
      assert(lastSale, "Last sale should be created");

      // Verify first and last sales have correct token IDs
      assert.equal(firstSale.offerIdentifiers[0], "0");
      assert.equal(lastSale.offerIdentifiers[0], (largeQuantity - 1n).toString());

      // Verify each sale has single NFT and correct payment per token
      assert.equal(firstSale.offerItemTypes.length, 1);
      assert.equal(firstSale.considerationAmounts[0], "100000000000000000"); // 0.1 ETH per token

      // Verify all SaleNFT junctions were created
      const allSaleNfts = mockDbUpdated.entities.SaleNFT.getAll();
      const allSales = mockDbUpdated.entities.Sale.getAll();
      const salesFromThisTx = allSales.filter(
        (sale) => sale.transactionHash === event.transaction.hash
      );
      assert.equal(
        salesFromThisTx.length,
        Number(largeQuantity),
        "Should have 100 individual sales"
      );
      assert.equal(allSaleNfts.length, Number(largeQuantity), "Should have 100 NFT junctions");
    });
  });

  describe("SeadropCounter entity tests", () => {
    it("Creates SeadropCounter with correct initial state", async () => {
      const testDb = MockDb.createMockDb();

      const event = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 1n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500010, timestamp: 1700000010, hash: "0xblock133" },
          transaction: { hash: "0xtxhash_counter_test" },
          chainId: 1,
          logIndex: 1,
        },
      });

      const mockDbUpdated = await Seadrop.SeaDropMint.processEvent({
        event,
        mockDb: testDb,
      });

      const counter = mockDbUpdated.entities.SeadropCounter.get(NFT_CONTRACT);

      assert(counter, "SeadropCounter should be created");
      assert.equal(counter.id, NFT_CONTRACT);
      assert.equal(counter.counter, BigInt(1));
    });

    it("Updates SeadropCounter correctly on subsequent mints", async () => {
      const testDb = MockDb.createMockDb();

      // First mint
      const event1 = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 5n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500011, timestamp: 1700000011, hash: "0xblock134" },
          transaction: { hash: "0xtxhash_counter_test1" },
          chainId: 1,
          logIndex: 1,
        },
      });

      let currentDb = await Seadrop.SeaDropMint.processEvent({
        event: event1,
        mockDb: testDb,
      });

      let counter = currentDb.entities.SeadropCounter.get(NFT_CONTRACT);
      assert.equal(counter?.counter, BigInt(5));

      // Second mint
      const event2 = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: PAYER_ADDRESS,
        quantityMinted: 3n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500012, timestamp: 1700000012, hash: "0xblock135" },
          transaction: { hash: "0xtxhash_counter_test2" },
          chainId: 1,
          logIndex: 1,
        },
      });

      currentDb = await Seadrop.SeaDropMint.processEvent({
        event: event2,
        mockDb: currentDb,
      });

      counter = currentDb.entities.SeadropCounter.get(NFT_CONTRACT);
      assert.equal(counter?.counter, BigInt(8)); // 5 + 3
    });
  });

  describe("Edge cases and error handling", () => {
    it("Handles same payer and minter correctly", async () => {
      const testDb = MockDb.createMockDb();
      const SAME_ADDRESS = "0xcccccccccccccccccccccccccccccccccccccccc";

      const event = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: SAME_ADDRESS,
        feeRecipient: FEE_RECIPIENT_ADDRESS,
        payer: SAME_ADDRESS, // Same as minter
        quantityMinted: 1n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500013, timestamp: 1700000013, hash: "0xblock136" },
          transaction: { hash: "0xtxhash_same_address" },
          chainId: 1,
          logIndex: 1,
        },
      });

      const mockDbUpdated = await Seadrop.SeaDropMint.processEvent({
        event,
        mockDb: testDb,
      });

      const actualSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}_0`
      );

      // Verify sale was created
      assert(actualSale, "Sale should be created");
      // Current implementation uses feeRecipient as offerer, not payer
      assert.equal(actualSale.offerer_id, "0x0000000000000000000000000000000000000000");
      assert.equal(actualSale.recipient_id, SAME_ADDRESS.toLowerCase());

      // Verify buy junction was created for the recipient (minter)
      const saleId = `${event.chainId}_${event.transaction.hash}_0`;
      const buyJunction = mockDbUpdated.entities.AccountBuy.get(
        `${SAME_ADDRESS.toLowerCase()}:${saleId}`
      );

      assert(buyJunction, "Buy junction should be created");
      // Current implementation only creates AccountBuy, not AccountSell
    });

    it("Handles different fee recipients correctly", async () => {
      const testDb = MockDb.createMockDb();
      const DIFFERENT_FEE_RECIPIENT = "0xdddddddddddddddddddddddddddddddddddddddd";

      const event = Seadrop.SeaDropMint.createMockEvent({
        nftContract: NFT_CONTRACT,
        minter: MINTER_ADDRESS,
        feeRecipient: DIFFERENT_FEE_RECIPIENT,
        payer: PAYER_ADDRESS,
        quantityMinted: 1n,
        unitMintPrice: 1000000000000000000n,
        feeBps: 250n,
        dropStageIndex: 0n,
        mockEventData: {
          block: { number: 18500014, timestamp: 1700000014, hash: "0xblock137" },
          transaction: { hash: "0xtxhash_different_fee" },
          chainId: 1,
          logIndex: 1,
        },
      });

      const mockDbUpdated = await Seadrop.SeaDropMint.processEvent({
        event,
        mockDb: testDb,
      });

      const actualSale = mockDbUpdated.entities.Sale.get(
        `${event.chainId}_${event.transaction.hash}_0`
      );

      // Verify consideration recipient is the seller (zero address)
      assert(actualSale, "Sale should exist");
      assert.equal(
        actualSale.considerationRecipients[0],
        "0x0000000000000000000000000000000000000000"
      );
    });
  });
});
