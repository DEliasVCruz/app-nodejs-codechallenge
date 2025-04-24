import type { EachBatchHandler, Producer, Message } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  transactionValidateMessage,
  type TransactionValidateMessage,
  type FraudTransactionVeridictMessage,
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

    const responses: Array<Message> = [];
    const processedOffsets: Array<string> = [];

    messages.forEach(async (message) => {
      if (!isRunning() || isStale()) return;

      const payload = (await message.then((content) => {
        return content;
      })) as MessageParsedPayload;

      const scale = BigInt(payload.value.data.scale);
      const value = payload.value.data.amount * ((1n / 10n) ^ scale);

      const response: FraudTransactionVeridictMessage = {
        number: payload.value.data.number.toString(),
        transaction_id: payload.value.data.transaction_id,
        amount: payload.value.data.amount.toString(),
        debit_account_id: payload.value.data.debit_account_id.toString(),
        credit_account_id: payload.value.data.credit_account_id.toString(),
        code: 401,
        ledger: payload.value.data.ledger,
        status: value > 1000n ? "rejected" : "approved",
      };

      responses.push({ value: JSON.stringify(response) });
      processedOffsets.push(payload.offset);

      await commitOffsetsIfNecessary();

      await heartbeat();
    });

    await producer.send({
      topic: "transaction-fraud-validation",
      messages: responses,
    });

    await commitOffsetsIfNecessary();

    processedOffsets.forEach(async (offset) => {
      resolveOffset(offset);
      await commitOffsetsIfNecessary();
    });
  };

  return batchFraudDetectionHandler;
};
