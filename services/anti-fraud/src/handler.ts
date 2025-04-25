import type { EachBatchHandler, Producer, Message } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  transactionValidateMessage,
  parseJsonPreprocessor,
  type TransactionValidateMessage,
  type FraudTransactionVeridictMessage,
} from "./schemas";

import { z } from "zod";

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
    isRunning,
    isStale,
  }) => {
    const messages = batch.messages
      .map((messgae) => {
        const schemaChecker = z.preprocess(
          parseJsonPreprocessor,
          transactionValidateMessage,
        );

        const parsedValue = schemaChecker.safeParse(messgae.value?.toString());

        return { offset: messgae.offset, value: parsedValue };
      })
      .filter(async (message) => {
        if (!message.value.success) {
          console.error(
            `[error/account-create/parse] ${message.value.error.message}`,
            message.value.error,
          );
        }

        return message.value.success;
      });

    const responses: Array<Message> = [];
    const processedOffsets: Array<string> = [];

    messages.forEach((message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;

      const scale = BigInt(payload.value.data.scale);
      const value = payload.value.data.amount * (1n / (10n ^ scale));

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
    });

    await producer
      .send({
        topic: "transaction-fraud-validation",
        messages: responses,
      })
      .catch((e) =>
        console.error(`[error/transaction-verify/consumer] ${e.message}`, e),
      );

    processedOffsets.forEach((offset) => {
      resolveOffset(offset);
    });

    await heartbeat();
  };

  return batchFraudDetectionHandler;
};
