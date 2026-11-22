import assert from "node:assert/strict";
import { mock } from "node:test";
import { inspect } from "node:util";

import { IndexerGraphQLClient } from "../src/graphqlclient/GraphQLClient";

describe("IndexerGraphQLClient", () => {
  const key = "sentinel-fake-api-key";
  const hostname = "indexer.example.test";
  const endpoint = `https://${hostname}:8443/${key}/graphql?token=${key}#private-fragment`;
  const query = "query Lookup($id: ID!) { token(id: $id) { id } }";
  const variables = { id: "42" };
  const failureMessage = `GraphQL query failed for ${hostname}`;

  afterEach(() => mock.restoreAll());

  it("exposes only the hostname for endpoint diagnostics", () => {
    const client = new IndexerGraphQLClient(
      `https://fake-user:${key}@${hostname}:8443/${key}?token=${key}#private-fragment`
    );

    assert.equal(client.getEndpoint(), hostname);
    assert.ok(!inspect(client, { showHidden: true }).includes(key));
  });

  it("reports a malformed configured URL without exposing its input", async () => {
    const log = mock.method(console, "error", () => {});
    const client = new IndexerGraphQLClient(`https://[invalid/${key}`);

    assert.equal(client.getEndpoint(), "unknown hostname");
    await assert.rejects(client.query(query, variables), {
      message: "GraphQL query failed for unknown hostname",
    });
    assert.deepEqual(
      log.mock.calls.map((call) => call.arguments),
      [["GraphQL query failed for unknown hostname"]]
    );
  });

  it("uses the configured URL and returns successful query data", async () => {
    const data = { token: { id: variables.id } };
    const fetch = mock.method(globalThis, "fetch", async () => Response.json({ data }));
    const log = mock.method(console, "error", () => {});
    const client = new IndexerGraphQLClient(endpoint);

    assert.deepEqual(await client.query(query, variables), data);
    assert.equal(fetch.mock.callCount(), 1);
    const [url, init] = fetch.mock.calls[0].arguments;
    assert.equal(String(url), endpoint);
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(String(init?.body)), { query, variables, operationName: "Lookup" });
    assert.equal(log.mock.callCount(), 0);
  });

  const failures = {
    "a transport error": async () => {
      throw new TypeError(`fetch failed for ${endpoint}`, {
        cause: new Error(`connection rejected for key ${key}`),
      });
    },
    "a GraphQL error with HTTP 200": async () =>
      Response.json({ errors: [{ message: `Rejected ${endpoint}`, extensions: { key } }] }),
    "an HTTP error with a GraphQL body": async () =>
      Response.json({ errors: [{ message: `Denied ${endpoint}` }] }, { status: 403 }),
    "an HTTP error with a non-GraphQL body": async () =>
      new Response(`Upstream rejected ${endpoint} with key ${key}`, { status: 502 }),
  };

  for (const [failure, respond] of Object.entries(failures)) {
    it(`redacts the URL and key from logs and thrown errors for ${failure}`, async () => {
      const fetch = mock.method(globalThis, "fetch", respond);
      const log = mock.method(console, "error", () => {});
      const client = new IndexerGraphQLClient(endpoint);

      await assert.rejects(client.query(query, { id: key }), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, failureMessage);
        assert.equal(error.cause, undefined);
        const rendered = inspect(error, { showHidden: true, depth: null });
        assert.ok(!rendered.includes(endpoint));
        assert.ok(!rendered.includes(key));
        return true;
      });
      assert.equal(fetch.mock.callCount(), 1);
      assert.deepEqual(
        log.mock.calls.map((call) => call.arguments),
        [[failureMessage]]
      );
    });
  }
});
