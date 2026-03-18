import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const { mockListTopics, mockFetchTopicMetadata, mockCreateTopics, mockDeleteTopics } = vi.hoisted(
  () => ({
    mockListTopics: vi.fn(),
    mockFetchTopicMetadata: vi.fn(),
    mockCreateTopics: vi.fn(),
    mockDeleteTopics: vi.fn(),
  }),
);

vi.mock('../kafka.js', () => ({
  getAdmin: vi.fn().mockResolvedValue({
    listTopics: mockListTopics,
    fetchTopicMetadata: mockFetchTopicMetadata,
    createTopics: mockCreateTopics,
    deleteTopics: mockDeleteTopics,
  }),
}));

import { registerTopicTools } from '../tools/topics.js';

function parseResult(result: { content: Array<{ text: string }> }): unknown {
  return JSON.parse(result.content[0].text);
}

describe('topic tools', () => {
  let handlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = new Map();

    const mockServer = {
      registerTool: (name: string, _config: unknown, handler: unknown) => {
        handlers.set(name, handler as (args: Record<string, unknown>) => Promise<unknown>);
      },
    } as unknown as McpServer;

    registerTopicTools(mockServer);
  });

  it('list-topics returns topic names', async () => {
    mockListTopics.mockResolvedValue(['topic-a', 'topic-b']);
    const result = await handlers.get('list-topics')!({});
    expect(parseResult(result as { content: Array<{ text: string }> })).toEqual({
      topics: ['topic-a', 'topic-b'],
    });
  });

  it('list-topics returns error on failure', async () => {
    mockListTopics.mockRejectedValue(new Error('connection refused'));
    const result = (await handlers.get('list-topics')!({})) as {
      isError: boolean;
      content: Array<{ text: string }>;
    };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('connection refused');
  });

  it('describe-topic returns partition details', async () => {
    mockFetchTopicMetadata.mockResolvedValue([
      {
        name: 'my-topic',
        partitions: [{ partitionId: 0, leader: 1, replicas: [1], isr: [1] }],
      },
    ]);
    const result = await handlers.get('describe-topic')!({ topic: 'my-topic' });
    const parsed = parseResult(result as { content: Array<{ text: string }> }) as {
      name: string;
      partitions: Array<{ id: number }>;
    };
    expect(parsed.name).toBe('my-topic');
    expect(parsed.partitions).toHaveLength(1);
    expect(parsed.partitions[0].id).toBe(0);
  });

  it('create-topic sends correct params', async () => {
    mockCreateTopics.mockResolvedValue(undefined);
    const result = await handlers.get('create-topic')!({
      topic: 'new-topic',
      numPartitions: 3,
      replicationFactor: 1,
    });
    expect(mockCreateTopics).toHaveBeenCalledWith({
      topics: [{ topic: 'new-topic', numPartitions: 3, replicationFactor: 1 }],
    });
    const parsed = parseResult(result as { content: Array<{ text: string }> }) as {
      created: boolean;
    };
    expect(parsed.created).toBe(true);
  });

  it('delete-topic sends correct params', async () => {
    mockDeleteTopics.mockResolvedValue(undefined);
    const result = await handlers.get('delete-topic')!({ topic: 'old-topic' });
    expect(mockDeleteTopics).toHaveBeenCalledWith({ topics: ['old-topic'] });
    const parsed = parseResult(result as { content: Array<{ text: string }> }) as {
      deleted: boolean;
    };
    expect(parsed.deleted).toBe(true);
  });
});
