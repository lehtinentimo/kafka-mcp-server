#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTopicTools } from './tools/topics.js';
import { registerProduceTools } from './tools/produce.js';
import { registerConsumeTools } from './tools/consume.js';
import { registerClusterTools } from './tools/cluster.js';

const server = new McpServer({
  name: 'kafka-mcp-server',
  version: '1.0.0',
});

registerTopicTools(server);
registerProduceTools(server);
registerConsumeTools(server);
registerClusterTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
