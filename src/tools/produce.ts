import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getProducer } from "../kafka.js";

export function registerProduceTools(server: McpServer): void {
  server.registerTool(
    "produce",
    {
      description: "Produce a message to a Kafka topic",
      inputSchema: {
        topic: z.string().describe("Topic name"),
        value: z.string().describe("Message value"),
        key: z.string().optional().describe("Optional message key"),
      },
    },
    async ({ topic, value, key }) => {
      try {
        const producer = await getProducer();
        const records = await producer.send({
          topic,
          messages: [{ key: key ?? null, value }],
        });
        const record = records[0];
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  topic: record.topicName,
                  partition: record.partition,
                  offset: record.offset ?? record.baseOffset,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to produce message: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
