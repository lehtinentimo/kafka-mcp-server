import { KafkaJS } from "@confluentinc/kafka-javascript";

const brokers = process.env.KAFKA_BROKERS;
if (!brokers) {
  console.error(
    "KAFKA_BROKERS environment variable is required. Set it to a comma-separated list of broker addresses (e.g. KAFKA_BROKERS=localhost:9092)."
  );
  process.exit(1);
}

const kafka = new KafkaJS.Kafka({
  kafkaJS: {
    brokers: brokers.split(",").map((b) => b.trim()),
  },
});

let adminPromise: Promise<KafkaJS.Admin> | null = null;
let producerPromise: Promise<KafkaJS.Producer> | null = null;

export function getAdmin(): Promise<KafkaJS.Admin> {
  if (!adminPromise) {
    adminPromise = (async () => {
      const a = kafka.admin();
      await a.connect();
      return a;
    })();
  }
  return adminPromise;
}

export function getProducer(): Promise<KafkaJS.Producer> {
  if (!producerPromise) {
    producerPromise = (async () => {
      const p = kafka.producer();
      await p.connect();
      return p;
    })();
  }
  return producerPromise;
}

export { kafka };
