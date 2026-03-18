import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const { mockConnect, mockDisconnect, mockSubscribe, mockRun } = vi.hoisted(() => ({
  mockConnect: vi.fn().mockResolvedValue(undefined),
  mockDisconnect: vi.fn().mockResolvedValue(undefined),
  mockSubscribe: vi.fn().mockResolvedValue(undefined),
  mockRun: vi.fn(),
}));

vi.mock('../kafka.js', () => ({
  kafka: {
    consumer: vi.fn().mockReturnValue({
      connect: mockConnect,
      disconnect: mockDisconnect,
      subscribe: mockSubscribe,
      run: mockRun,
    }),
  },
}));

import { registerConsumeTools } from '../tools/consume.js';

describe('consume tool', () => {
  let handler: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mockServer = {
      registerTool: (_name: string, _config: unknown, fn: unknown) => {
        handler = fn as typeof handler;
      },
    } as unknown as McpServer;
    registerConsumeTools(mockServer);
  });

  it('collects messages until maxMessages is reached', async () => {
    mockRun.mockImplementation(
      async ({
        eachMessage,
      }: {
        eachMessage: (payload: {
          topic: string;
          partition: number;
          message: { offset: string; key: Buffer | null; value: Buffer | null; timestamp: string };
        }) => Promise<void>;
      }) => {
        for (let i = 0; i < 3; i++) {
          await eachMessage({
            topic: 't',
            partition: 0,
            message: {
              offset: String(i),
              key: Buffer.from(`k${i}`),
              value: Buffer.from(`v${i}`),
              timestamp: '1000',
            },
          });
        }
      },
    );

    const result = (await handler({
      topic: 't',
      maxMessages: 2,
      timeout: 5000,
    })) as { content: Array<{ text: string }> };

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages[0].key).toBe('k0');
    expect(parsed.messages[1].offset).toBe('1');
  });

  it('handles null key and value', async () => {
    mockRun.mockImplementation(
      async ({
        eachMessage,
      }: {
        eachMessage: (payload: {
          topic: string;
          partition: number;
          message: { offset: string; key: null; value: null; timestamp: string };
        }) => Promise<void>;
      }) => {
        await eachMessage({
          topic: 't',
          partition: 0,
          message: { offset: '0', key: null, value: null, timestamp: '1000' },
        });
      },
    );

    const result = (await handler({
      topic: 't',
      maxMessages: 10,
      timeout: 100,
    })) as { content: Array<{ text: string }> };

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.messages[0].key).toBeNull();
    expect(parsed.messages[0].value).toBeNull();
  });

  it('returns error when consumer.run rejects', async () => {
    mockRun.mockRejectedValue(new Error('topic not found'));

    const result = (await handler({
      topic: 'bad-topic',
      maxMessages: 10,
      timeout: 5000,
    })) as { isError: boolean; content: Array<{ text: string }> };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('topic not found');
  });

  it('disconnects consumer in finally block', async () => {
    mockRun.mockResolvedValue(undefined);

    await handler({ topic: 't', maxMessages: 10, timeout: 100 });

    expect(mockDisconnect).toHaveBeenCalled();
  });
});
