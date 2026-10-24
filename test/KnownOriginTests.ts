import assert from "assert";

import { createTestIndexer } from "envio";

describe("KnownOrigin BuyNowPurchased event tests", () => {
  // Create mock db
  let mockDb: ReturnType<typeof createTestIndexer>;
  beforeEach(() => {
    mockDb = createTestIndexer();
  });

  // Test addresses
  const BUYER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const SELLER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const KNOWNORIGIN_CONTRACT = "0xf11ED77fD65840b64602526DDC38311E9923c81B";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  it("Sale is created correctly for ETH payment", async () => {
    // Creating mock for KnownOrigin BuyNowPurchased event
    const event = {
      contract: "KnownOrigin",
      event: "BuyNowPurchased",
      params: {
        tokenId: 123n,
        buyer: BUYER_ADDRESS,
        currentOwner: SELLER_ADDRESS,
        price: 1000000000000000000n,
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
      srcAddress: KNOWNORIGIN_CONTRACT,
    } as const;

    // Processing the event
    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    // Getting the actual entities from the mock database
    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);
    const actualBuyerAccount = await mockDbUpdated.Account.get(BUYER_ADDRESS.toLowerCase());
    const actualSellerAccount = await mockDbUpdated.Account.get(SELLER_ADDRESS.toLowerCase());
    const actualNFTContract = await mockDbUpdated.NFTContract.get(
      KNOWNORIGIN_CONTRACT.toLowerCase()
    );
    const actualNFTToken = await mockDbUpdated.NFTToken.get(
      `${KNOWNORIGIN_CONTRACT.toLowerCase()}:123`
    );

    // Assertions for the Sale entity
    assert(actualSale, "Sale should be created");
    assert.equal(actualSale.id, `${event.chainId}_${event.transaction.hash}`);
    assert.equal(actualSale.timestamp, BigInt(1700000000));
    assert.equal(actualSale.transactionHash, event.transaction.hash);
    assert.equal(actualSale.market, "KnownOrigin");
    assert.equal(actualSale.offerer_id, SELLER_ADDRESS.toLowerCase());
    assert.equal(actualSale.recipient_id, BUYER_ADDRESS.toLowerCase());

    // Assertions for NFT data via junction entity
    const allSaleNfts = await mockDbUpdated.SaleNFT.getAll();
    const saleNfts = allSaleNfts.filter((sn) => sn.sale_id === actualSale.id);
    assert.equal(saleNfts.length, 1);
    assert.equal(saleNfts[0].nftToken_id, `${KNOWNORIGIN_CONTRACT.toLowerCase()}:123`);

    // Assertions for offer items (NFT being sold)
    assert.equal(actualSale.offerItemTypes.length, 1);
    assert.equal(actualSale.offerItemTypes[0], 2); // ERC721
    assert.equal(actualSale.offerTokens.length, 1);
    assert.equal(actualSale.offerTokens[0], KNOWNORIGIN_CONTRACT);
    assert.equal(actualSale.offerIdentifiers.length, 1);
    assert.equal(actualSale.offerIdentifiers[0], "123");
    assert.equal(actualSale.offerAmounts.length, 1);
    assert.equal(actualSale.offerAmounts[0], "1");

    // Assertions for consideration items (ETH payment)
    assert.equal(actualSale.considerationItemTypes.length, 1);
    assert.equal(actualSale.considerationItemTypes[0], 0); // ETH
    assert.equal(actualSale.considerationTokens.length, 1);
    assert.equal(actualSale.considerationTokens[0], ZERO_ADDRESS);
    assert.equal(actualSale.considerationIdentifiers.length, 1);
    assert.equal(actualSale.considerationIdentifiers[0], "0");
    assert.equal(actualSale.considerationAmounts.length, 1);
    assert.equal(actualSale.considerationAmounts[0], "1000000000000000000");
    assert.equal(actualSale.considerationRecipients.length, 1);
    assert.equal(actualSale.considerationRecipients[0], SELLER_ADDRESS);

    // Assertions for Account entities
    assert(actualBuyerAccount, "Buyer account should be created");
    assert.equal(actualBuyerAccount.id, BUYER_ADDRESS.toLowerCase());
    assert.equal(actualBuyerAccount.address, BUYER_ADDRESS);

    assert(actualSellerAccount, "Seller account should be created");
    assert.equal(actualSellerAccount.id, SELLER_ADDRESS.toLowerCase());
    assert.equal(actualSellerAccount.address, SELLER_ADDRESS);

    // Assertions for NFTContract entity
    assert(actualNFTContract, "NFTContract should be created");
    assert.equal(actualNFTContract.id, KNOWNORIGIN_CONTRACT.toLowerCase());
    assert.equal(actualNFTContract.address, KNOWNORIGIN_CONTRACT);

    // Assertions for NFTToken entity
    assert(actualNFTToken, "NFTToken should be created");
    assert.equal(actualNFTToken.id, `${KNOWNORIGIN_CONTRACT.toLowerCase()}:123`);
    assert.equal(actualNFTToken.tokenId, "123");
  });

  it("Sale is created correctly with different price", async () => {
    // Creating mock for KnownOrigin BuyNowPurchased event with different price
    const event = {
      contract: "KnownOrigin",
      event: "BuyNowPurchased",
      params: {
        tokenId: 456n,
        buyer: BUYER_ADDRESS,
        currentOwner: SELLER_ADDRESS,
        price: 2500000000000000000n,
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
      srcAddress: KNOWNORIGIN_CONTRACT,
    } as const;

    // Processing the event
    const mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event] } } });

    // Getting the actual entities from the mock database
    const actualSale = await mockDbUpdated.Sale.get(`${event.chainId}_${event.transaction.hash}`);

    // Assertions for the Sale entity
    assert(actualSale, "Sale should be created");
    assert.equal(actualSale.considerationAmounts[0], "2500000000000000000");

    // Check NFT data via junction entity
    const allSaleNfts = await mockDbUpdated.SaleNFT.getAll();
    const saleNfts = allSaleNfts.filter((sn) => sn.sale_id === actualSale.id);
    assert.equal(saleNfts.length, 1);
    assert.equal(saleNfts[0].nftToken_id, `${KNOWNORIGIN_CONTRACT.toLowerCase()}:456`);
  });

  it("Multiple sales are handled correctly", async () => {
    // First sale
    const event1 = {
      contract: "KnownOrigin",
      event: "BuyNowPurchased",
      params: {
        tokenId: 789n,
        buyer: BUYER_ADDRESS,
        currentOwner: SELLER_ADDRESS,
        price: 1000000000000000000n,
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
      srcAddress: KNOWNORIGIN_CONTRACT,
    } as const;

    // Second sale
    const event2 = {
      contract: "KnownOrigin",
      event: "BuyNowPurchased",
      params: {
        tokenId: 101112n,
        buyer: "0xcccccccccccccccccccccccccccccccccccccccc",
        currentOwner: "0xdddddddddddddddddddddddddddddddddddddddd",
        price: 5000000000000000000n,
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
      srcAddress: KNOWNORIGIN_CONTRACT,
    } as const;

    // Processing both events
    let mockDbUpdated = mockDb;
    await mockDbUpdated.process({ chains: { 1: { simulate: [event1] } } });

    await mockDbUpdated.process({ chains: { 1: { simulate: [event2] } } });

    // Getting the actual entities from the mock database
    const actualSale1 = await mockDbUpdated.Sale.get(
      `${event1.chainId}_${event1.transaction.hash}`
    );
    const actualSale2 = await mockDbUpdated.Sale.get(
      `${event2.chainId}_${event2.transaction.hash}`
    );

    // Assertions for both sales
    assert(actualSale1, "First sale should be created");
    assert(actualSale2, "Second sale should be created");
    assert.notEqual(actualSale1.id, actualSale2.id, "Sales should have different IDs");

    // Check NFT data via junction entities
    const allSaleNfts = await mockDbUpdated.SaleNFT.getAll();
    const saleNfts1 = allSaleNfts.filter((sn) => sn.sale_id === actualSale1.id);
    const saleNfts2 = allSaleNfts.filter((sn) => sn.sale_id === actualSale2.id);
    assert.equal(saleNfts1.length, 1);
    assert.equal(saleNfts1[0].nftToken_id, `${KNOWNORIGIN_CONTRACT.toLowerCase()}:789`);
    assert.equal(saleNfts2.length, 1);
    assert.equal(saleNfts2[0].nftToken_id, `${KNOWNORIGIN_CONTRACT.toLowerCase()}:101112`);
  });
});
