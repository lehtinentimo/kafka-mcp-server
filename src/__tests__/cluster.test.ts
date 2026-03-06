import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const { mockFetchTopicMetadata, mockListGroups, mockDescribeGroups } = vi.hoisted(() => ({
  mockFetchTopicMetadata: vi.fn(),
  mockListGroups: vi.fn(),
  mockDescribeGroups: vi.fn(),
}));

vi.mock("../kafka.js", () => ({
  getAdmin: vi.fn().mockResolvedValue({
    fetchTopicMetadata: mockFetchTopicMetadata,
    listGroups: mockListGroups,
    describeGroups: mockDescribeGroups,
  }),
}));

import { registerClusterTools } from "../tools/cluster.js";

function parseResult(result: { content: Array<{ text: string }> }): unknown {
  return JSON.parse(result.content[0].text);
}

describe("cluster tools", () => {
  let handlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = new Map();
    const mockServer = {
      registerTool: (name: string, _config: unknown, handler: unknown) => {
        handlers.set(name, handler as (args: Record<string, unknown>) => Promise<unknown>);
      },
    } as unknown as McpServer;
    registerClusterTools(mockServer);
  });

  it("get-cluster-info extracts brokers from metadata", async () => {
    mockFetchTopicMetadata.mockResolvedValue([
      {
        name: "t1",
        partitions: [
          {
            leaderNode: { id: 0, host: "broker-0", port: 9092 },
            replicaNodes: [{ id: 0, host: "broker-0", port: 9092 }],
          },
        ],
      },
    ]);
    const result = await handlers.get("get-cluster-info")!({});
    const parsed = parseResult(result as { content: Array<{ text: string }> }) as {
      brokers: Array<{ nodeId: number; host: string; port: number }>;
    };
    expect(parsed.brokers).toHaveLength(1);
    expect(parsed.brokers[0].host).toBe("broker-0");
  });

  it("get-cluster-info deduplicates brokers", async () => {
    mockFetchTopicMetadata.mockResolvedValue([
      {
        name: "t1",
        partitions: [
          {
            leaderNode: { id: 0, host: "b0", port: 9092 },
            replicaNodes: [{ id: 0, host: "b0", port: 9092 }],
          },
          {
            leaderNode: { id: 0, host: "b0", port: 9092 },
            replicaNodes: [],
          },
        ],
      },
    ]);
    const result = await handlers.get("get-cluster-info")!({});
    const parsed = parseResult(result as { content: Array<{ text: string }> }) as {
      brokers: Array<{ nodeId: number }>;
    };
    expect(parsed.brokers).toHaveLength(1);
  });

  it("list-consumer-groups returns groups", async () => {
    mockListGroups.mockResolvedValue({
      groups: [
        { groupId: "g1", protocolType: "consumer", state: "Stable" },
      ],
    });
    const result = await handlers.get("list-consumer-groups")!({});
    const parsed = parseResult(result as { content: Array<{ text: string }> }) as {
      groups: Array<{ groupId: string }>;
    };
    expect(parsed.groups).toHaveLength(1);
    expect(parsed.groups[0].groupId).toBe("g1");
  });

  it("describe-consumer-group returns members", async () => {
    mockDescribeGroups.mockResolvedValue({
      groups: [
        {
          groupId: "g1",
          state: "Stable",
          members: [
            { memberId: "m1", clientId: "c1", assignment: [] },
          ],
        },
      ],
    });
    const result = await handlers.get("describe-consumer-group")!({ groupId: "g1" });
    const parsed = parseResult(result as { content: Array<{ text: string }> }) as {
      groupId: string;
      members: Array<{ memberId: string }>;
    };
    expect(parsed.groupId).toBe("g1");
    expect(parsed.members).toHaveLength(1);
  });

  it("describe-consumer-group returns error on failure", async () => {
    mockDescribeGroups.mockRejectedValue(new Error("group not found"));
    const result = (await handlers.get("describe-consumer-group")!({ groupId: "bad" })) as {
      isError: boolean;
      content: Array<{ text: string }>;
    };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("group not found");
  });
});
