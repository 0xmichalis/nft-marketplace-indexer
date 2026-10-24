import assert from "assert";

import { createTestIndexer, type Sale } from "envio";

describe("SuperRareBazaar AcceptOffer event tests", () => {
  // Create mock db
  let mockDb: ReturnType<typeof createTestIndexer>;
  beforeEach(() => {
    mockDb = createTestIndexer();
  });

  // Test addresses
  const SELLER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const BIDDER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const NFT_CONTRACT = "0x1111111111111111111111111111111111111111";
  const ERC20_TOKEN = "0x2222222222222222222222222222222222222222";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  it("Sale is created correctly for ETH payment", async () => {
    // Creating mock for SuperRareBazaar AcceptOffer event with ETH payment
    const event = {
      contract: "SuperRareBazaar",
      event: "AcceptOffer",
      params: {
        seller: SELLER_ADDRESS,
        bidder: BIDDER_ADDRESS,
        originContract: NFT_CONTRACT,
        tokenId: 123n,
        amount: 1000000000000000000n,
        // 1 ETH in wei
        currencyAddress: ZERO_ADDRESS,
      },

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
    } as const;

    // Processing the event
    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    // Getting the actual entities from the mock database
    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const actualSellerAccount = await mockDbUpdated.Account.get(SELLER_ADDRESS.toLowerCase());
    const actualBidderAccount = await mockDbUpdated.Account.get(BIDDER_ADDRESS.toLowerCase());
    const actualNFTContract = await mockDbUpdated.NFTContract.get(NFT_CONTRACT.toLowerCase());
    const actualNFTToken = await mockDbUpdated.NFTToken.get(`${NFT_CONTRACT.toLowerCase()}:123`);

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
      "Actual Sale should match expected Sale for ETH payment"
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
    const allSaleNfts = await mockDbUpdated.SaleNFT.getAll();
    const saleNfts = allSaleNfts.filter((sn) => sn.sale_id === actualSale?.id);
    assert.equal(saleNfts.length, 1, "Sale should have one NFT");
    assert.equal(saleNfts[0].nftToken_id, `${NFT_CONTRACT.toLowerCase()}:123`);

    // Note: With @derivedFrom relationships, sales are automatically linked
    // The relationships are computed at query time, not stored directly in the entity
  });

  it("Sale is created correctly for ERC20 payment", async () => {
    // Creating mock for SuperRareBazaar AcceptOffer event with ERC20 payment
    const event = {
      contract: "SuperRareBazaar",
      event: "AcceptOffer",
      params: {
        seller: SELLER_ADDRESS,
        bidder: BIDDER_ADDRESS,
        originContract: NFT_CONTRACT,
        tokenId: 456n,
        amount: 1000000000000000000000n,
        // 1000 tokens (assuming 18 decimals)
        currencyAddress: ERC20_TOKEN,
      },

      block: {
        number: 18500001,
        timestamp: 1700000100,
        hash: "0xblock124",
      },
      transaction: {
        hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567891",
      },
      chainId: 1,
      logIndex: 2,
    } as const;

    // Processing the event
    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    // Getting the actual Sale entity from the mock database
    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);

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
      offerIdentifiers: ["456"],
      offerAmounts: ["1"], // quantity 1 for NFT
      // Consideration: ERC20 payment
      considerationItemTypes: [1], // ERC20
      considerationTokens: [ERC20_TOKEN],
      considerationIdentifiers: ["0"], // no identifier for currency
      considerationAmounts: ["1000000000000000000000"],
      considerationRecipients: [SELLER_ADDRESS],
    };

    // Asserting that the Sale entity is created correctly
    assert.deepEqual(
      actualSale,
      expectedSale,
      "Actual Sale should match expected Sale for ERC20 payment"
    );
  });

  it("Handles large token IDs correctly", async () => {
    const largeTokenId = 2n ** 255n - 1n; // Very large token ID

    const event = {
      contract: "SuperRareBazaar",
      event: "AcceptOffer",
      params: {
        seller: SELLER_ADDRESS,
        bidder: BIDDER_ADDRESS,
        originContract: NFT_CONTRACT,
        tokenId: largeTokenId,
        amount: 1000000000000000000n,
        currencyAddress: ZERO_ADDRESS,
      },

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
    } as const;

    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const actualNFTToken = await mockDbUpdated.NFTToken.get(
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
    const event = {
      contract: "SuperRareBazaar",
      event: "AcceptOffer",
      params: {
        seller: SELLER_ADDRESS,
        bidder: BIDDER_ADDRESS,
        originContract: NFT_CONTRACT,
        tokenId: 789n,
        amount: 0n,
        // Zero payment
        currencyAddress: ZERO_ADDRESS,
      },

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
    } as const;

    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);

    assert.ok(actualSale, "Sale should be created even with zero payment");
    assert.equal(
      actualSale?.considerationAmounts[0],
      "0",
      "Zero amount should be handled correctly"
    );
  });
});

describe("SuperRareBazaar Sold event tests", () => {
  // Create mock db
  let mockDb: ReturnType<typeof createTestIndexer>;
  beforeEach(() => {
    mockDb = createTestIndexer();
  });

  // Test addresses
  const SELLER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const BUYER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const NFT_CONTRACT = "0x1111111111111111111111111111111111111111";
  const ERC20_TOKEN = "0x2222222222222222222222222222222222222222";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  it("Sale is created correctly for ETH payment", async () => {
    // Creating mock for SuperRareBazaar Sold event with ETH payment
    const event = {
      contract: "SuperRareBazaar",
      event: "Sold",
      params: {
        seller: SELLER_ADDRESS,
        buyer: BUYER_ADDRESS,
        originContract: NFT_CONTRACT,
        tokenId: 123n,
        amount: 1000000000000000000n,
        // 1 ETH in wei
        currencyAddress: ZERO_ADDRESS,
      },

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
    } as const;

    // Processing the event
    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    // Getting the actual entities from the mock database
    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const actualSellerAccount = await mockDbUpdated.Account.get(SELLER_ADDRESS.toLowerCase());
    const actualBuyerAccount = await mockDbUpdated.Account.get(BUYER_ADDRESS.toLowerCase());
    const actualNFTContract = await mockDbUpdated.NFTContract.get(NFT_CONTRACT.toLowerCase());
    const actualNFTToken = await mockDbUpdated.NFTToken.get(`${NFT_CONTRACT.toLowerCase()}:123`);

    // Creating the expected Sale entity
    const expectedSale: Sale = {
      id: `${event.chainId}_${event.transaction.hash}`,
      market: "SuperRare",
      offerer_id: SELLER_ADDRESS.toLowerCase(),
      recipient_id: BUYER_ADDRESS.toLowerCase(),
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
      "Actual Sale should match expected Sale for ETH payment"
    );

    // Asserting that Account entities are created
    assert.ok(actualSellerAccount, "Seller Account should be created");
    assert.equal(actualSellerAccount?.address, SELLER_ADDRESS, "Seller address should match");
    assert.ok(actualBuyerAccount, "Buyer Account should be created");
    assert.equal(actualBuyerAccount?.address, BUYER_ADDRESS, "Buyer address should match");

    // Asserting that NFT entities are created
    assert.ok(actualNFTContract, "NFT Contract should be created");
    assert.equal(actualNFTContract?.address, NFT_CONTRACT, "NFT contract address should match");
    assert.ok(actualNFTToken, "NFT Token should be created");
    assert.equal(actualNFTToken?.tokenId, "123", "NFT token ID should match");
  });

  it("Sale is created correctly for ERC20 payment", async () => {
    // Creating mock for SuperRareBazaar Sold event with ERC20 payment
    const event = {
      contract: "SuperRareBazaar",
      event: "Sold",
      params: {
        seller: SELLER_ADDRESS,
        buyer: BUYER_ADDRESS,
        originContract: NFT_CONTRACT,
        tokenId: 456n,
        amount: 1000000000000000000000n,
        // 1000 tokens (18 decimals)
        currencyAddress: ERC20_TOKEN,
      },

      block: {
        number: 18500001,
        timestamp: 1700000001,
        hash: "0xblock124",
      },
      transaction: {
        hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567891",
      },
      chainId: 1,
      logIndex: 2,
    } as const;

    // Processing the event
    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    // Getting the actual entities from the mock database
    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);

    // Creating the expected Sale entity
    const expectedSale: Sale = {
      id: `${event.chainId}_${event.transaction.hash}`,
      market: "SuperRare",
      offerer_id: SELLER_ADDRESS.toLowerCase(),
      recipient_id: BUYER_ADDRESS.toLowerCase(),
      timestamp: BigInt(event.block.timestamp),
      transactionHash: event.transaction.hash,
      // Offer: NFT from the original contract
      offerItemTypes: [2], // ERC721
      offerTokens: [NFT_CONTRACT],
      offerIdentifiers: ["456"],
      offerAmounts: ["1"], // quantity 1 for NFT
      // Consideration: ERC20 payment
      considerationItemTypes: [1], // ERC20
      considerationTokens: [ERC20_TOKEN],
      considerationIdentifiers: ["0"], // no identifier for ERC20
      considerationAmounts: ["1000000000000000000000"],
      considerationRecipients: [SELLER_ADDRESS],
    };

    // Asserting that the Sale entity is created correctly
    assert.deepEqual(
      actualSale,
      expectedSale,
      "Actual Sale should match expected Sale for ERC20 payment"
    );
  });
});

describe("SuperRareBazaar AuctionSettled event tests", () => {
  // Create mock db
  let mockDb: ReturnType<typeof createTestIndexer>;
  beforeEach(() => {
    mockDb = createTestIndexer();
  });

  // Test addresses
  const SELLER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const BIDDER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const NFT_CONTRACT = "0x1111111111111111111111111111111111111111";
  const ERC20_TOKEN = "0x2222222222222222222222222222222222222222";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  it("Sale is created correctly for ETH payment", async () => {
    // Creating mock for SuperRareBazaar AuctionSettled event with ETH payment
    const event = {
      contract: "SuperRareBazaar",
      event: "AuctionSettled",
      params: {
        seller: SELLER_ADDRESS,
        bidder: BIDDER_ADDRESS,
        contractAddress: NFT_CONTRACT,
        tokenId: 789n,
        amount: 2000000000000000000n,
        // 2 ETH in wei
        currencyAddress: ZERO_ADDRESS,
      },

      block: {
        number: 18500002,
        timestamp: 1700000002,
        hash: "0xblock125",
      },
      transaction: {
        hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567892",
      },
      chainId: 1,
      logIndex: 3,
    } as const;

    // Processing the event
    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    // Getting the actual entities from the mock database
    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const actualSellerAccount = await mockDbUpdated.Account.get(SELLER_ADDRESS.toLowerCase());
    const actualBidderAccount = await mockDbUpdated.Account.get(BIDDER_ADDRESS.toLowerCase());
    const actualNFTContract = await mockDbUpdated.NFTContract.get(NFT_CONTRACT.toLowerCase());
    const actualNFTToken = await mockDbUpdated.NFTToken.get(`${NFT_CONTRACT.toLowerCase()}:789`);

    // Creating the expected Sale entity
    const expectedSale: Sale = {
      id: `${event.chainId}_${event.transaction.hash}`,
      market: "SuperRare",
      offerer_id: SELLER_ADDRESS.toLowerCase(),
      recipient_id: BIDDER_ADDRESS.toLowerCase(),
      timestamp: BigInt(event.block.timestamp),
      transactionHash: event.transaction.hash,
      // Offer: NFT from the contract
      offerItemTypes: [2], // ERC721
      offerTokens: [NFT_CONTRACT],
      offerIdentifiers: ["789"],
      offerAmounts: ["1"], // quantity 1 for NFT
      // Consideration: ETH payment
      considerationItemTypes: [0], // ETH
      considerationTokens: [ZERO_ADDRESS],
      considerationIdentifiers: ["0"], // no identifier for ETH
      considerationAmounts: ["2000000000000000000"],
      considerationRecipients: [SELLER_ADDRESS],
    };

    // Asserting that the Sale entity is created correctly
    assert.deepEqual(
      actualSale,
      expectedSale,
      "Actual Sale should match expected Sale for ETH payment"
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
    assert.equal(actualNFTToken?.tokenId, "789", "NFT token ID should match");
  });

  it("Sale is created correctly for ERC20 payment", async () => {
    // Creating mock for SuperRareBazaar AuctionSettled event with ERC20 payment
    const event = {
      contract: "SuperRareBazaar",
      event: "AuctionSettled",
      params: {
        seller: SELLER_ADDRESS,
        bidder: BIDDER_ADDRESS,
        contractAddress: NFT_CONTRACT,
        tokenId: 101112n,
        amount: 5000000000000000000000n,
        // 5000 tokens (18 decimals)
        currencyAddress: ERC20_TOKEN,
      },

      block: {
        number: 18500003,
        timestamp: 1700000003,
        hash: "0xblock126",
      },
      transaction: {
        hash: "0xtxhash1234567890abcdef1234567890abcdef1234567890abcdef1234567893",
      },
      chainId: 1,
      logIndex: 4,
    } as const;

    // Processing the event
    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    // Getting the actual entities from the mock database
    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);

    // Creating the expected Sale entity
    const expectedSale: Sale = {
      id: `${event.chainId}_${event.transaction.hash}`,
      market: "SuperRare",
      offerer_id: SELLER_ADDRESS.toLowerCase(),
      recipient_id: BIDDER_ADDRESS.toLowerCase(),
      timestamp: BigInt(event.block.timestamp),
      transactionHash: event.transaction.hash,
      // Offer: NFT from the contract
      offerItemTypes: [2], // ERC721
      offerTokens: [NFT_CONTRACT],
      offerIdentifiers: ["101112"],
      offerAmounts: ["1"], // quantity 1 for NFT
      // Consideration: ERC20 payment
      considerationItemTypes: [1], // ERC20
      considerationTokens: [ERC20_TOKEN],
      considerationIdentifiers: ["0"], // no identifier for ERC20
      considerationAmounts: ["5000000000000000000000"],
      considerationRecipients: [SELLER_ADDRESS],
    };

    // Asserting that the Sale entity is created correctly
    assert.deepEqual(
      actualSale,
      expectedSale,
      "Actual Sale should match expected Sale for ERC20 payment"
    );
  });
});

describe("SuperRare relationship integrity tests", () => {
  let mockDb: ReturnType<typeof createTestIndexer>;

  beforeEach(() => {
    mockDb = createTestIndexer();
  });

  it("Maintains relationships across different NFT contracts", async () => {
    const CONTRACT_1 = "0x1111111111111111111111111111111111111111";
    const CONTRACT_2 = "0x41A322b28D0fF354040e2CbC676F0320d8c8850d";

    // Create sales from different contracts
    const event1 = {
      contract: "SuperRareBazaar",
      event: "AcceptOffer",
      params: {
        seller: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        bidder: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        originContract: CONTRACT_1,
        tokenId: 100n,
        amount: 1000000000000000000n,
        currencyAddress: "0x0000000000000000000000000000000000000000",
      },

      block: { number: 18500040, timestamp: 1700004000, hash: "0xblock400" },
      transaction: { hash: "0xtx1" },
      chainId: 1,
      logIndex: 40,
    } as const;

    const event2 = {
      contract: "SuperRareV1",
      event: "Sold",
      params: {
        seller: "0xcccccccccccccccccccccccccccccccccccccccc",
        buyer: "0xdddddddddddddddddddddddddddddddddddddddd",
        tokenId: 200n,
        amount: 2000000000000000000n,
      },

      block: { number: 18500041, timestamp: 1700004100, hash: "0xblock401" },
      transaction: { hash: "0xtx2" },
      chainId: 1,
      logIndex: 41,
      srcAddress: CONTRACT_2,
    } as const;

    // Process both events
    let currentDb = mockDb;
    await currentDb.process({ chains: { 1: { simulate: [event1] } } });
    await currentDb.process({ chains: { 1: { simulate: [event2] } } });

    // Verify both contracts exist
    const contract1 = await currentDb.NFTContract.get(CONTRACT_1.toLowerCase());
    const contract2 = await currentDb.NFTContract.get(CONTRACT_2.toLowerCase());

    assert.ok(contract1, "Contract 1 should exist");
    assert.ok(contract2, "Contract 2 should exist");

    // Verify each contract has its own token
    const token1 = await currentDb.NFTToken.get(`${CONTRACT_1.toLowerCase()}:100`);
    const token2 = await currentDb.NFTToken.get(`${CONTRACT_2.toLowerCase()}:200`);

    assert.ok(token1, "Token 1 should exist");
    assert.ok(token2, "Token 2 should exist");

    // Note: With @derivedFrom relationships, sales are automatically linked

    // Verify tokens exist and have correct IDs
    assert.equal(token1.tokenId, "100", "Token 1 should have correct token ID");
    assert.equal(token2.tokenId, "200", "Token 2 should have correct token ID");

    // Verify sales reference correct contracts
    const sale1 = await currentDb.Sale.get(`${event1.chainId}_${event1.transaction.hash}`);
    const sale2 = await currentDb.Sale.get(`${event2.chainId}_${event2.transaction.hash}`);
    assert.ok(sale1);
    assert.ok(sale2);

    // Check NFT data via junction entities
    const allSaleNfts = await currentDb.SaleNFT.getAll();
    const sale1Nfts = allSaleNfts.filter((sn: any) => sn.sale_id === sale1.id);
    const sale2Nfts = allSaleNfts.filter((sn: any) => sn.sale_id === sale2.id);

    assert.equal(sale1Nfts.length, 1, "Sale 1 should have one NFT");
    assert.equal(sale2Nfts.length, 1, "Sale 2 should have one NFT");
    assert.equal(sale1Nfts[0].nftToken_id, `${CONTRACT_1.toLowerCase()}:100`);
    assert.equal(sale2Nfts[0].nftToken_id, `${CONTRACT_2.toLowerCase()}:200`);
  });

  it("Verifies account relationships are properly established", async () => {
    const SELLER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const BUYER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    const event = {
      contract: "SuperRareBazaar",
      event: "AcceptOffer",
      params: {
        seller: SELLER,
        bidder: BUYER,
        originContract: "0x1111111111111111111111111111111111111111",
        tokenId: 123n,
        amount: 1000000000000000000n,
        currencyAddress: "0x0000000000000000000000000000000000000000",
      },

      block: { number: 18500050, timestamp: 1700005000, hash: "0xblock500" },
      transaction: { hash: "0xtx3" },
      chainId: 1,
      logIndex: 50,
    } as const;

    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    const sale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const sellerAccount = await mockDbUpdated.Account.get(SELLER.toLowerCase());
    const buyerAccount = await mockDbUpdated.Account.get(BUYER.toLowerCase());

    // Verify sale references correct accounts
    assert.ok(sale, "Sale should exist");
    assert.equal(sale?.offerer_id, SELLER.toLowerCase(), "Sale should reference seller");
    assert.equal(sale?.recipient_id, BUYER.toLowerCase(), "Sale should reference buyer");

    // Verify accounts exist
    assert.ok(sellerAccount, "Seller account should exist");
    assert.ok(buyerAccount, "Buyer account should exist");

    // Verify account addresses
    assert.equal(sellerAccount.address, SELLER, "Seller account address should match");
    assert.equal(buyerAccount.address, BUYER, "Buyer account address should match");
  });
});

describe("SuperRare handler edge cases", () => {
  let mockDb: ReturnType<typeof createTestIndexer>;
  beforeEach(() => {
    mockDb = createTestIndexer();
  });

  it("Handles case sensitivity in addresses", async () => {
    const mixedCaseSeller = "0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa";
    const mixedCaseBidder = "0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb";

    const event = {
      contract: "SuperRareBazaar",
      event: "AcceptOffer",
      params: {
        seller: mixedCaseSeller,
        bidder: mixedCaseBidder,
        originContract: "0x1111111111111111111111111111111111111111",
        tokenId: 123n,
        amount: 1000000000000000000n,
        currencyAddress: "0x0000000000000000000000000000000000000000",
      },

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
    } as const;

    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const actualSellerAccount = await mockDbUpdated.Account.get(mixedCaseSeller.toLowerCase());
    const actualBidderAccount = await mockDbUpdated.Account.get(mixedCaseBidder.toLowerCase());

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
});
