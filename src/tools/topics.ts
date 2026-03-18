import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAdmin } from '../kafka.js';

export function registerTopicTools(server: McpServer): void {
  server.registerTool('list-topics', { description: 'List all Kafka topics' }, async () => {
    try {
      const admin = await getAdmin();
      const topics = await admin.listTopics();
      return {
        content: [{ type: 'text', text: JSON.stringify({ topics }, null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to list topics: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  });

  server.registerTool(
    'describe-topic',
    {
      description: 'Describe a Kafka topic including partition details',
      inputSchema: { topic: z.string().describe('Topic name') },
    },
    async ({ topic }) => {
      try {
        const admin = await getAdmin();
        const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
        // Library types say { topics: [...] } but runtime returns an array directly
        const topicArray = Array.isArray(metadata) ? metadata : metadata.topics;
        const topicMeta = topicArray[0];
        const result = {
          name: topicMeta.name,
          partitions: topicMeta.partitions.map((p: (typeof topicMeta.partitions)[number]) => ({
            id: p.partitionId,
            leader: p.leader,
            replicas: p.replicas,
            isr: p.isr,
          })),
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to describe topic "${topic}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'create-topic',
    {
      description: 'Create a new Kafka topic',
      inputSchema: {
        topic: z.string().describe('Topic name'),
        numPartitions: z.number().int().positive().default(1).describe('Number of partitions'),
        replicationFactor: z.number().int().positive().default(1).describe('Replication factor'),
      },
    },
    async ({ topic, numPartitions, replicationFactor }) => {
      try {
        const admin = await getAdmin();
        await admin.createTopics({
          topics: [
            {
              topic,
              numPartitions,
              replicationFactor,
            },
          ],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ topic, created: true }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to create topic "${topic}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'delete-topic',
    {
      description: 'Delete a Kafka topic',
      inputSchema: { topic: z.string().describe('Topic name') },
    },
    async ({ topic }) => {
      try {
        const admin = await getAdmin();
        await admin.deleteTopics({ topics: [topic] });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ topic, deleted: true }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to delete topic "${topic}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
