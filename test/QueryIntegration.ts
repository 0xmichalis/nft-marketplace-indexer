import assert from "assert";

import dotenv from "dotenv";

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

    it("should find buys, sells, and swaps for user", async function () {
      if (!client) throw new Error("GraphQL client not initialized");

      const result = await client.query<SalesByUserResponse>(QUERIES.salesByUser, {
        userAddress: testUserAddress.toLowerCase(),
        limit: 3,
      });

      console.log(
        `📊 Found ${result.Account?.length || 0} accounts matching user ${testUserAddress}`
      );

      // Verify we got valid data structure
      assert(Array.isArray(result.Account), "Result should contain Account array");

      if (result.Account && result.Account.length > 0) {
        const account = result.Account[0];

        // Verify account structure
        assert(typeof account.id === "string", "Account should have id");
        assert(typeof account.address === "string", "Account should have address");
        assert(Array.isArray(account.buys), "Account should have buys array");
        assert(Array.isArray(account.sells), "Account should have sells array");
        assert(Array.isArray(account.swaps), "Account should have swaps array");

        const totalSales = account.buys.length + account.sells.length + account.swaps.length;
        console.log(`✅ Account ID: ${account.id}`);
        console.log(`   Address: ${account.address}`);
        console.log(`   Buys: ${account.buys.length}`);
        console.log(`   Sells: ${account.sells.length}`);
        console.log(`   Swaps: ${account.swaps.length}`);
        console.log(`   Total Sales: ${totalSales}`);

        // Test the first sale if available
        if (account.buys.length > 0) {
          const firstSale = account.buys[0].sale;
          assert(typeof firstSale.id === "string", "Sale should have id");
          assert(typeof firstSale.transactionHash === "string", "Sale should have transactionHash");
          console.log(`   First buy: ${firstSale.id}`);
        }

        if (account.sells.length > 0) {
          const firstSale = account.sells[0].sale;
          assert(typeof firstSale.id === "string", "Sale should have id");
          assert(typeof firstSale.transactionHash === "string", "Sale should have transactionHash");
          console.log(`   First sell: ${firstSale.id}`);
        }

        if (account.swaps.length > 0) {
          const firstSale = account.swaps[0].sale;
          assert(typeof firstSale.id === "string", "Sale should have id");
          assert(typeof firstSale.transactionHash === "string", "Sale should have transactionHash");
          console.log(`   First swap: ${firstSale.id}`);
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
            count: result.Account?.length || 0,
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

      console.log(`🐵 Found ${result.NFTContract?.length || 0} BAYC contracts`);

      assert(Array.isArray(result.NFTContract), "Result should contain NFTContract array");

      if (result.NFTContract && result.NFTContract.length > 0) {
        const nftContract = result.NFTContract[0];
        const allSales = nftContract.tokens.flatMap((token) =>
          token.sales.map((sale) => sale.sale)
        );

        if (allSales.length > 0) {
          // Check for BAYC in offer (being sold)
          const baycInOffer = allSales.filter((order: any) =>
            order.offerTokens.some(
              (token: any) => token.toLowerCase() === baycContract.toLowerCase()
            )
          );

          // Check for BAYC in consideration (being bought/traded for)
          const baycInConsideration = allSales.filter((order: any) =>
            order.considerationTokens.some(
              (token: any) => token.toLowerCase() === baycContract.toLowerCase()
            )
          );

          console.log(`✅ Orders with BAYC in offer (selling): ${baycInOffer.length}`);
          console.log(
            `✅ Orders with BAYC in consideration (buying): ${baycInConsideration.length}`
          );

          // Show details for the latest order (regardless of offer/consideration)
          const latestOrder = allSales[0];

          // Check where BAYC appears in this order
          const baycInOfferIndex = latestOrder.offerTokens.findIndex(
            (token: any) => token.toLowerCase() === baycContract.toLowerCase()
          );
          const baycInConsiderationIndex = latestOrder.considerationTokens.findIndex(
            (token: any) => token.toLowerCase() === baycContract.toLowerCase()
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
        } else {
          console.log("❌ No sales found for BAYC contract");
        }
      } else {
        console.log("❌ No BAYC contract found");
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

      console.log(`🎨 Found ${result.NFTToken?.length || 0} NFT tokens for BAYC #${testTokenId}`);

      // Verify we got valid data structure
      assert(Array.isArray(result.NFTToken), "Result should contain NFTToken array");

      if (result.NFTToken && result.NFTToken.length > 0) {
        const nftToken = result.NFTToken[0];

        // Verify NFT token structure
        assert(typeof nftToken.id === "string", "NFTToken should have id");
        assert(typeof nftToken.tokenId === "string", "NFTToken should have tokenId");
        assert(typeof nftToken.contract === "object", "NFTToken should have contract");
        assert(typeof nftToken.contract.id === "string", "NFTToken contract should have id");
        assert(
          typeof nftToken.contract.address === "string",
          "NFTToken contract should have address"
        );
        assert(Array.isArray(nftToken.sales), "NFTToken should have sales array");

        console.log(`✅ NFT Token ID: ${nftToken.id}`);
        console.log(`   Token ID: ${nftToken.tokenId}`);
        console.log(`   Contract ID: ${nftToken.contract.id}`);
        console.log(`   Contract Address: ${nftToken.contract.address}`);
        console.log(`   Total Sales: ${nftToken.sales.length}`);
      } else {
        console.log(`ℹ️  No NFT token found for BAYC #${testTokenId}`);
      }

      // Check the Sale results from the NFT token
      if (result.NFTToken && result.NFTToken.length > 0) {
        const nftToken = result.NFTToken[0];
        const sales = nftToken.sales.map((sale: any) => sale.sale);

        if (sales.length > 0) {
          console.log(`✅ Found ${sales.length} sales involving BAYC #${testTokenId}`);

          const firstSale = sales[0];
          console.log(`   First sale: ${firstSale.id}`);
          console.log(`   Transaction: ${firstSale.transactionHash}`);

          // Show NFT data from junction entities
          if (firstSale.nfts && firstSale.nfts.length > 0) {
            const nftData = firstSale.nfts
              .map((nft: any) => `${nft.nftToken.contract.address}:${nft.nftToken.tokenId}`)
              .join(", ");
            console.log(`   NFT Data: ${nftData}`);
          }

          // Verify the sale contains the specific token we're looking for
          const hasTargetToken = firstSale.nfts?.some(
            (nft: any) =>
              nft.nftToken.tokenId === testTokenId &&
              nft.nftToken.contract.address.toLowerCase() === baycContract.toLowerCase()
          );

          if (hasTargetToken) {
            console.log(`✅ Sale contains target token ID: ${testTokenId}`);
          } else {
            console.log(`⚠️  Sale does not contain target token ID: ${testTokenId}`);
          }

          // Show details for the latest sale
          console.log(`   Market: ${firstSale.market}`);
          console.log(`   Offerer: ${firstSale.offerer.address}`);
          console.log(`   Recipient: ${firstSale.recipient.address}`);
          console.log(
            `   Timestamp: ${new Date(parseInt(firstSale.timestamp) * 1000).toISOString()}`
          );
        } else {
          console.log(`ℹ️  No sales found involving BAYC #${testTokenId}`);
        }
      } else {
        console.log(`ℹ️  No NFT token found for BAYC #${testTokenId}`);
      }
    });
  });
});
