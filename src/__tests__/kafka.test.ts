import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConnect, mockAdmin, mockProducer } = vi.hoisted(() => {
  const mockConnect = vi.fn().mockResolvedValue(undefined);
  const mockAdmin = { connect: mockConnect };
  const mockProducer = { connect: mockConnect };
  return { mockConnect, mockAdmin, mockProducer };
});

vi.mock("@confluentinc/kafka-javascript", () => ({
  KafkaJS: {
    Kafka: class {
      admin() { return mockAdmin; }
      producer() { return mockProducer; }
    },
  },
}));

describe("kafka singletons", () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnect.mockClear();
    process.env.KAFKA_BROKERS = "localhost:9092";
  });

  it("getAdmin returns the same promise on concurrent calls", async () => {
    const { getAdmin } = await import("../kafka.js");
    const p1 = getAdmin();
    const p2 = getAdmin();
    expect(p1).toBe(p2);
    const admin = await p1;
    expect(admin).toBe(mockAdmin);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it("getProducer returns the same promise on concurrent calls", async () => {
    const { getProducer } = await import("../kafka.js");
    const p1 = getProducer();
    const p2 = getProducer();
    expect(p1).toBe(p2);
    const producer = await p1;
    expect(producer).toBe(mockProducer);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });
});
