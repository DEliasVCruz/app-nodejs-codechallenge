import type { EachBatchHandler, Producer } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  transactionValidateMessage,
  type TransactionValidateMessage,
  type FraudTransactionVeridictEvent,
} from "./schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<TransactionValidateMessage>;
};

export const handler: (producer: Producer) => EachBatchHandler = (
  producer: Producer,
) => {
  const batchFraudDetectionHandler: EachBatchHandler = async ({
    batch,
    resolveOffset,
    heartbeat,
    commitOffsetsIfNecessary,
    isRunning,
    isStale,
  }) => {
    const messages = batch.messages
      .map(async (messgae) => {
        const parsedValue = await transactionValidateMessage.spa(
          messgae.value?.toString(),
        );

        return { offset: messgae.offset, value: parsedValue };
      })
      .filter(async (message) => {
        return await message.then((payload) => {
          return payload.value.success;
        });
      });

    messages.forEach(async (message) => {
      if (!isRunning() || isStale()) return;

      const payload = (await message.then((content) => {
        return content;
      })) as MessageParsedPayload;

      const scale = BigInt(payload.value.data.scale);
      const value = payload.value.data.amount * ((1n / 10n) ^ scale);

      const response: FraudTransactionVeridictEvent = {
        id: payload.value.data.id.toString(),
        amount: payload.value.data.amount.toString(),
        code: 401,
        status: value > 1000n ? "rejected" : "approved",
      };

      await producer.send({
        topic: "transaction-update",
        messages: [{ value: JSON.stringify(response) }],
      });

      resolveOffset(payload.offset);
      commitOffsetsIfNecessary();

      await heartbeat();
    });
  };

  return batchFraudDetectionHandler;
};
