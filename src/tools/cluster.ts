import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdmin } from "../kafka.js";

export function registerClusterTools(server: McpServer): void {
  server.registerTool(
    "get-cluster-info",
    { description: "Get Kafka cluster metadata including broker details" },
    async () => {
      try {
        const admin = await getAdmin();
        const metadata = await admin.fetchTopicMetadata();
        // Library types say { topics: [...] } but runtime returns an array directly
        const topics = Array.isArray(metadata) ? metadata : metadata.topics;
        const brokerSet = new Map<number, { nodeId: number; host: string; port: number }>();
        for (const topic of topics) {
          for (const p of topic.partitions) {
            if (p.leaderNode) {
              brokerSet.set(p.leaderNode.id, {
                nodeId: p.leaderNode.id,
                host: p.leaderNode.host,
                port: p.leaderNode.port,
              });
            }
            if (p.replicaNodes) {
              for (const node of p.replicaNodes) {
                brokerSet.set(node.id, {
                  nodeId: node.id,
                  host: node.host,
                  port: node.port,
                });
              }
            }
          }
        }
        const result = {
          brokers: Array.from(brokerSet.values()),
        };
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to get cluster info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "list-consumer-groups",
    { description: "List all Kafka consumer groups" },
    async () => {
      try {
        const admin = await getAdmin();
        const { groups } = await admin.listGroups();
        const result = {
          groups: groups.map((g) => ({
            groupId: g.groupId,
            protocolType: g.protocolType,
            state: g.state,
          })),
        };
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to list consumer groups: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "describe-consumer-group",
    {
      description: "Describe a Kafka consumer group including members and their assignments",
      inputSchema: { groupId: z.string().describe("Consumer group ID") },
    },
    async ({ groupId }) => {
      try {
        const admin = await getAdmin();
        const description = await admin.describeGroups([groupId]);
        const group = description.groups[0];
        const result = {
          groupId: group.groupId,
          state: group.state,
          members: group.members.map((m) => ({
            memberId: m.memberId,
            clientId: m.clientId,
            partitions: m.assignment,
          })),
        };
        return {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to describe consumer group "${groupId}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
