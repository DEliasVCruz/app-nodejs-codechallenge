import { nanoid } from "nanoid";
import pino, { type Logger } from "pino";

import { z, type ZodSchema } from "zod";

import { parseJsonPreprocessor } from "@bk/schemas";

import {
  Kafka,
  type EachMessagePayload,
  type ConsumerCrashEvent,
} from "kafkajs";

export interface KafkaRpcClient<Req, Res> {
  request(payload: Req, timeout?: number): Promise<Res>;
  disconnect(): Promise<void>;
}

export interface Pending<Res> {
  resolve: (value: Res) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

const create = async <Req, Res>(
  kafka: Kafka,
  rpcName: string,
  clientName: string,
  timeoutMs: number = 30_000,
  schema: ZodSchema<Res>,
  logger?: Logger,
): Promise<KafkaRpcClient<Req, Res>> => {
  let ready: Promise<void>;

  const pending = new Map<string, Pending<Res>>();
  const log = logger ?? pino({ name: `kafa-rpc-client-${clientName}` });

  const requestTopic = `${rpcName}-requests`;
  const replyTopic = `${rpcName}-replies`;

  log.info({ rpcName: rpcName }, "rpc_setup_started");
  const producer = kafka.producer();
  const consumer = kafka.consumer({
    groupId: `${clientName}-rpc-client-${rpcName}`,
  });

  const init = async (): Promise<void> => {
    await producer.connect();
    log.info("producer_connected");

    await consumer.connect();
    log.info("consumer_connected");

    await consumer.subscribe({
      topic: replyTopic,
      fromBeginning: false,
    });
    log.info({ replyTopic: replyTopic }, "replies_subscribe_succeeded");

    await consumer.run({ eachMessage: onMessage });
    log.info("consumer_started");

    // Perform clean up and reconnect on error
    consumer.on(consumer.events.CRASH, async (event: ConsumerCrashEvent) => {
      log.error(event.payload.error, "consumer_crashed");

      rejectAllPending(event.payload.error);

      await consumer.disconnect().catch((e: Error) => {
        log.warn(e, "consumer_disconnect_failed");
      });

      await producer.disconnect().catch((e: Error) => {
        log.warn(e, "producer_disconnect_failed");
      });

      // Re-init rpc
      ready = init();
    });
  };

  ready = init();

  const rejectAllPending = (err: Error) => {
    pending.values().forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(err);
    });

    pending.clear();
  };

  const onMessage = async ({ message }: EachMessagePayload) => {
    const correlationId = message.headers?.["correlationId"]?.toString();
    if (!correlationId) return;

    const entry = pending.get(correlationId);
    if (!entry) {
      log.debug({ correlationId }, "pending_rpc_match_not_found");
      return;
    }

    clearTimeout(entry.timer);
    pending.delete(correlationId);

    log.info({ correlationId }, "rpc_response_processing_started");

    const schemaChecker = z.preprocess(parseJsonPreprocessor, schema);
    const parsed = schemaChecker.safeParse(message.value!.toString());

    if (!parsed.success) {
      log.error(
        { correlationId, error: (parsed as any).error },
        "rpc_response_parsing_failed",
      );
      return entry.reject(new Error((parsed as any).error));
    }

    entry.resolve(parsed.data);
    log.info({ correlationId }, "rpc_response_resolved");
  };

  const request = async (
    payload: Req,
    timeout: number = timeoutMs,
  ): Promise<Res> => {
    await ready;

    const correlationId = nanoid();

    return new Promise<Res>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(correlationId);
        log.error({ correlationId }, "rpc_timeout_reached");

        reject(new Error("RPC timeout"));
      }, timeout);

      pending.set(correlationId, { resolve, reject, timer });

      producer
        .send({
          topic: requestTopic,
          messages: [
            {
              key: correlationId,
              value: JSON.stringify(payload),
              headers: { correlationId, replyTopic },
            },
          ],
        })
        .then((meta) => {
          log.debug({ correlationId, meta }, "rpc_request_send_succeeded");
        })
        .catch((err) => {
          clearTimeout(timer);
          pending.delete(correlationId);

          log.error(err, "rpc_request_send_failed");

          reject(err);
        });
    });
  };

  const disconnect = async (): Promise<void> => {
    await consumer.disconnect();
    log.info("consumer_disconnected");

    await producer.disconnect();
    log.info("producer_disconnected");
  };

  log.info({ rpcName: rpcName }, "rpc_setup_completed");
  return {
    request,
    disconnect,
  };
};

export default {
  create,
};
