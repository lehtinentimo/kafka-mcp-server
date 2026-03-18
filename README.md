# Kafka MCP Server

A Model Context Protocol (MCP) server that exposes Apache Kafka operations as tools. Built with TypeScript, stdio transport, and the [Confluent Kafka client](https://github.com/confluentinc/confluent-kafka-javascript).

## Prerequisites

- Node.js 18.18+ or 20.9+
- A running Kafka-compatible broker (Apache Kafka, Redpanda, etc.)

## Setup

```bash
npm install
npm run build
```

## Configuration

Set the `KAFKA_BROKERS` environment variable (required):

```bash
export KAFKA_BROKERS=localhost:9092
```

Multiple brokers can be comma-separated: `broker1:9092,broker2:9092`.

## Running

```bash
npm start
```

The server communicates over stdio using the MCP protocol.

### Claude Code

Add the MCP server using the CLI:

```bash
claude mcp add kafka-mcp-server -e KAFKA_BROKERS=localhost:9092 node /path/to/kafka-mcp-server/dist/index.js
```

Or add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "kafka": {
      "command": "node",
      "args": ["/path/to/kafka-mcp-server/dist/index.js"],
      "env": {
        "KAFKA_BROKERS": "localhost:9092"
      }
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kafka": {
      "command": "node",
      "args": ["/path/to/kafka-mcp-server/dist/index.js"],
      "env": {
        "KAFKA_BROKERS": "localhost:9092"
      }
    }
  }
}
```

## Tools

### Topics

| Tool | Description | Inputs |
|------|-------------|--------|
| `list-topics` | List all topics | none |
| `describe-topic` | Get topic details (partitions, replicas) | `topic` |
| `create-topic` | Create a new topic | `topic`, `numPartitions` (default 1), `replicationFactor` (default 1) |
| `delete-topic` | Delete a topic | `topic` |

### Produce / Consume

| Tool | Description | Inputs |
|------|-------------|--------|
| `produce` | Send a message to a topic | `topic`, `value`, `key` (optional) |
| `consume` | Read messages from a topic | `topic`, `maxMessages` (default 10), `timeout` (default 5000ms) |

The `consume` tool creates an ephemeral consumer that reads from the earliest offset without committing. It disconnects after reaching `maxMessages` or the timeout.

### Cluster

| Tool | Description | Inputs |
|------|-------------|--------|
| `get-cluster-info` | Get broker information | none |
| `list-consumer-groups` | List all consumer groups | none |
| `describe-consumer-group` | Get consumer group details | `groupId` |

## Development

```bash
npm run build          # Compile TypeScript
npm start              # Run the server
npm run lint           # Run ESLint
npm run lint:fix       # Run ESLint with auto-fix
npm run format         # Format code with Prettier
npm run format:check   # Check formatting
```
