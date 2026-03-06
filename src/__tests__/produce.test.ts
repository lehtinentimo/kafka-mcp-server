import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock("../kafka.js", () => ({
  getProducer: vi.fn().mockResolvedValue({
    send: mockSend,
  }),
}));

import { registerProduceTools } from "../tools/produce.js";

describe("produce tool", () => {
  let handler: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mockServer = {
      registerTool: (_name: string, _config: unknown, fn: unknown) => {
        handler = fn as typeof handler;
      },
    } as unknown as McpServer;
    registerProduceTools(mockServer);
  });

  it("produces a message and returns offset", async () => {
    mockSend.mockResolvedValue([
      { topicName: "test-topic", partition: 0, baseOffset: "5" },
    ]);
    const result = (await handler({ topic: "test-topic", value: "hello", key: "k1" })) as {
      content: Array<{ text: string }>;
    };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.topic).toBe("test-topic");
    expect(parsed.partition).toBe(0);

    expect(mockSend).toHaveBeenCalledWith({
      topic: "test-topic",
      messages: [{ key: "k1", value: "hello" }],
    });
  });

  it("sends null key when key is omitted", async () => {
    mockSend.mockResolvedValue([
      { topicName: "t", partition: 0, baseOffset: "0" },
    ]);
    await handler({ topic: "t", value: "v" });
    expect(mockSend).toHaveBeenCalledWith({
      topic: "t",
      messages: [{ key: null, value: "v" }],
    });
  });

  it("returns error on failure", async () => {
    mockSend.mockRejectedValue(new Error("broker unavailable"));
    const result = (await handler({ topic: "t", value: "v" })) as {
      isError: boolean;
      content: Array<{ text: string }>;
    };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("broker unavailable");
  });
});
