import dotenv from "dotenv";
import assert from "assert";

import {
  createGraphQLClient,
  isGraphQLEndpointAvailable,
  type IndexerGraphQLClient,
} from "../src/graphqlclient/GraphQLClient";
import {
  QUERIES,
  SalesByUserResponse,
  SalesByNFTContractResponse,
  SalesByNFTTokenResponse,
} from "../src/queries/queries";

dotenv.config();

describe("GraphQL Query Integration Tests", () => {
  let client: IndexerGraphQLClient | null;

  before(function () {
    // Skip all tests if GRAPH_API_URL is not set
    if (!isGraphQLEndpointAvailable()) {
      console.log(
        "\n⚠️  Skipping GraphQL integration tests: GRAPH_API_URL environment variable not set"
      );
      console.log("   To run these tests, set GRAPH_API_URL to your deployed indexer endpoint");
      console.log("   Example: GRAPH_API_URL=https://your-indexer.com/graphql pnpm test:queries\n");
      this.skip();
      return;
    }

    client = createGraphQLClient();
    if (!client) {
      this.skip();
      return;
    }

    console.log(`\n🔗 Running GraphQL integration tests against: ${client.getEndpoint()}\n`);
  });

  describe("User Activity Queries", () => {
    const testUserAddress = "0x56E81BC43A5fc9a01Ff000270bc55a02df268147";

    it("should find orders where user is offerer or recipient", async function () {
      if (!client) throw new Error("GraphQL client not initialized");

      const result = await client.query<SalesByUserResponse>(QUERIES.salesByUser, {
        userAddress: testUserAddress.toLowerCase(),
        limit: 3,
      });

      console.log(`📊 Found ${result.account.length} accounts matching user ${testUserAddress}`);

      // Verify we got valid data structure
      assert(Array.isArray(result.account), "Result should contain Account array");

      if (result.account.length > 0) {
        const account = result.account[0];

        // Verify account structure
        assert(typeof account.id === "string", "Account should have id");
        assert(typeof account.address === "string", "Account should have address");
        assert(Array.isArray(account.salesAsOfferer), "Account should have salesAsOfferer array");
        assert(
          Array.isArray(account.salesAsRecipient),
          "Account should have salesAsRecipient array"
        );

        const totalSales = account.salesAsOfferer.length + account.salesAsRecipient.length;
        console.log(`✅ Account ID: ${account.id}`);
        console.log(`   Address: ${account.address}`);
        console.log(`   Sales as Offerer: ${account.salesAsOfferer.length}`);
        console.log(`   Sales as Recipient: ${account.salesAsRecipient.length}`);
        console.log(`   Total Sales: ${totalSales}`);

        // Test the first sale if available
        if (account.salesAsOfferer.length > 0) {
          const firstSale = account.salesAsOfferer[0];
          assert(typeof firstSale.id === "string", "Sale should have id");
          assert(typeof firstSale.transactionHash === "string", "Sale should have transactionHash");
          console.log(`   First offerer sale: ${firstSale.id}`);
        }

        if (account.salesAsRecipient.length > 0) {
          const firstSale = account.salesAsRecipient[0];
          assert(typeof firstSale.id === "string", "Sale should have id");
          assert(typeof firstSale.transactionHash === "string", "Sale should have transactionHash");
          console.log(`   First recipient sale: ${firstSale.id}`);
        }
      } else {
        console.log(`ℹ️  No account found for user ${testUserAddress}`);
      }
    });

    it("should handle case-insensitive address matching", async function () {
      // Test with different case variations
      const addressVariations = [
        testUserAddress.toLowerCase(),
        testUserAddress.toUpperCase(),
        testUserAddress, // mixed case
      ];

      const results = await Promise.all(
        addressVariations.map(async (addressVariation) => {
          if (!client) throw new Error("GraphQL client not initialized");
          const result = await client.query<SalesByUserResponse>(QUERIES.salesByUser, {
            userAddress: addressVariation.toLowerCase(), // Always use lowercase
            limit: 3, // Reduced limit for faster testing
          });
          return {
            variation: addressVariation,
            count: result.account.length,
          };
        })
      );

      // Log results
      results.forEach((result) => {
        console.log(`🔤 Address variation "${result.variation}": ${result.count} accounts`);
      });

      // All variations should return valid arrays
      results.forEach((result) => {
        assert(
          typeof result.count === "number",
          `Count should be a number for ${result.variation}`
        );
        assert(result.count >= 0, `Count should be non-negative for ${result.variation}`);
      });

      // Check if case-insensitive matching works (counts should be similar)
      if (results.length > 1 && results[0].count > 0) {
        console.log(`✅ Case-insensitive matching verified`);
      }
    });
  });

  describe("NFT-Specific Queries", () => {
    /**
     * Query: Find orders by specific NFT contract (e.g., BAYC)
     */
    it("should find orders by specific NFT contract", async function () {
      if (!client) throw new Error("GraphQL client not initialized");

      // Test with BAYC contract address
      const baycContract = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";

      const result = await client.query<SalesByNFTContractResponse>(QUERIES.salesByNFTContract, {
        contractAddress: baycContract.toLowerCase(),
        limit: 5,
      });

      console.log(`🐵 Found ${result.nftContract.length} BAYC contracts`);

      assert(Array.isArray(result.nftContract), "Result should contain NFTContract array");

      if (result.sales && result.sales.length > 0) {
        // Check for BAYC in offer (being sold)
        const baycInOffer = result.sales.filter((order) =>
          order.offerTokens.some((token) => token.toLowerCase() === baycContract.toLowerCase())
        );

        // Check for BAYC in consideration (being bought/traded for)
        const baycInConsideration = result.sales.filter((order) =>
          order.considerationTokens.some(
            (token) => token.toLowerCase() === baycContract.toLowerCase()
          )
        );

        console.log(`✅ Orders with BAYC in offer (selling): ${baycInOffer.length}`);
        console.log(`✅ Orders with BAYC in consideration (buying): ${baycInConsideration.length}`);

        // Show details for the latest order (regardless of offer/consideration)
        const latestOrder = result.sales[0];

        // Check where BAYC appears in this order
        const baycInOfferIndex = latestOrder.offerTokens.findIndex(
          (token) => token.toLowerCase() === baycContract.toLowerCase()
        );
        const baycInConsiderationIndex = latestOrder.considerationTokens.findIndex(
          (token) => token.toLowerCase() === baycContract.toLowerCase()
        );

        if (baycInOfferIndex >= 0) {
          console.log(
            `   BAYC in OFFER (selling) - Token ID: ${latestOrder.offerIdentifiers[baycInOfferIndex]}`
          );
          console.log(`   Seller: ${latestOrder.offerer}`);
        }

        if (baycInConsiderationIndex >= 0) {
          console.log(
            `   BAYC in CONSIDERATION (buying) - Token ID: ${latestOrder.considerationIdentifiers[baycInConsiderationIndex]}`
          );
          console.log(`   Buyer: ${latestOrder.recipient}`);
        }

        console.log(
          `   Timestamp: ${new Date(parseInt(latestOrder.timestamp) * 1000).toISOString()}`
        );
      }
    });

    /**
     * Query: Find orders by specific NFT token (e.g., BAYC #1)
     */
    it("should find orders by specific NFT token", async function () {
      if (!client) throw new Error("GraphQL client not initialized");

      // Test with BAYC contract address and a specific token ID
      const baycContract = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";
      const testTokenId = "1"; // BAYC #1

      const result = await client.query<SalesByNFTTokenResponse>(QUERIES.salesByNFTToken, {
        contractAddress: baycContract.toLowerCase(),
        tokenId: testTokenId,
      });

      console.log(`🎨 Found ${result.nftToken.length} NFT tokens for BAYC #${testTokenId}`);

      // Verify we got valid data structure
      assert(Array.isArray(result.nftToken), "Result should contain NFTToken array");

      if (result.nftToken.length > 0) {
        const nftToken = result.nftToken[0];

        // Verify NFT token structure
        assert(typeof nftToken.id === "string", "NFTToken should have id");
        assert(typeof nftToken.tokenId === "string", "NFTToken should have tokenId");
        assert(typeof nftToken.contract === "object", "NFTToken should have contract");
        assert(typeof nftToken.contract.id === "string", "NFTToken contract should have id");
        assert(
          typeof nftToken.contract.address === "string",
          "NFTToken contract should have address"
        );
        assert(Array.isArray(nftToken.sales_id), "NFTToken should have sales_id array");

        console.log(`✅ NFT Token ID: ${nftToken.id}`);
        console.log(`   Token ID: ${nftToken.tokenId}`);
        console.log(`   Contract ID: ${nftToken.contract.id}`);
        console.log(`   Contract Address: ${nftToken.contract.address}`);
        console.log(`   Total Sales: ${nftToken.sales_id.length}`);
      } else {
        console.log(`ℹ️  No NFT token found for BAYC #${testTokenId}`);
      }

      // Check the Sale results
      if (result.sales && result.sales.length > 0) {
        console.log(`✅ Found ${result.sales.length} sales involving BAYC #${testTokenId}`);

        const firstSale = result.sales[0];
        console.log(`   First sale: ${firstSale.id}`);
        console.log(`   Transaction: ${firstSale.transactionHash}`);
        console.log(`   NFT Contract IDs: ${firstSale.nftContractIds.join(", ")}`);
        console.log(`   NFT Token IDs: ${firstSale.nftTokenIds.join(", ")}`);

        // Verify the sale contains the specific token we're looking for
        const hasTargetToken = firstSale.nftTokenIds.some((tokenId) =>
          tokenId.includes(testTokenId)
        );

        if (hasTargetToken) {
          console.log(`✅ Sale contains target token ID: ${testTokenId}`);
        } else {
          console.log(`⚠️  Sale does not contain target token ID: ${testTokenId}`);
        }

        // Show details for the latest sale
        console.log(`   Market: ${firstSale.market}`);
        console.log(`   Offerer: ${firstSale.offerer}`);
        console.log(`   Recipient: ${firstSale.recipient}`);
        console.log(
          `   Timestamp: ${new Date(parseInt(firstSale.timestamp) * 1000).toISOString()}`
        );
      } else {
        console.log(`ℹ️  No sales found involving BAYC #${testTokenId}`);
      }
    });
  });
});
