import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { kafka } from '../kafka.js';

export function registerConsumeTools(server: McpServer): void {
  server.registerTool(
    'consume',
    {
      description: 'Consume messages from a Kafka topic (ephemeral consumer, reads from earliest)',
      inputSchema: {
        topic: z.string().describe('Topic name'),
        maxMessages: z
          .number()
          .int()
          .positive()
          .default(10)
          .describe('Maximum number of messages to consume'),
        timeout: z.number().int().positive().default(5000).describe('Timeout in milliseconds'),
      },
    },
    async ({ topic, maxMessages, timeout }) => {
      const groupId = `mcp-consumer-${randomUUID()}`;
      const consumer = kafka.consumer({
        'auto.offset.reset': 'earliest',
        kafkaJS: { groupId },
      });

      try {
        await consumer.connect();
        await consumer.subscribe({
          topics: [topic],
        });

        const messages: Array<{
          topic: string;
          partition: number;
          offset: string;
          key: string | null;
          value: string | null;
          timestamp: string;
        }> = [];

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => resolve(), timeout);

          consumer
            .run({
              eachMessage: async ({ topic: t, partition, message }) => {
                messages.push({
                  topic: t,
                  partition,
                  offset: message.offset,
                  key: message.key ? message.key.toString() : null,
                  value: message.value ? message.value.toString() : null,
                  timestamp: message.timestamp,
                });

                if (messages.length >= maxMessages) {
                  clearTimeout(timer);
                  resolve();
                }
              },
            })
            .catch((err: unknown) => {
              clearTimeout(timer);
              reject(err);
            });
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ messages }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to consume messages: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      } finally {
        try {
          await consumer.disconnect();
        } catch {
          // ignore disconnect errors
        }
      }
    },
  );
}
