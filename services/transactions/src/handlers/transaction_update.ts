import { DateTime } from "luxon";

import { z } from "zod";

import type { EachBatchHandler, Producer, Message } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  parseJsonPreprocessor,
  fraudTransactionVeridictMessage,
  type FraudTransactionVeridictEvent,
  type TransferUpdateMessage,
} from "@/schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<FraudTransactionVeridictEvent>;
};

export const handler: (producer: Producer) => EachBatchHandler = (
  producer: Producer,
) => {
  const batchTransferUpdateHandler: EachBatchHandler = async ({
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
          fraudTransactionVeridictMessage,
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

    if (!messages.length) {
      await heartbeat();

      return;
    }

    messages.forEach(async (message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;
      // Send to tiger beatle for processing

      const response: TransferUpdateMessage = {
        transaction_id: payload.value.data.transaction_id,
        number: payload.value.data.number.toString(),
        debit_account_id: payload.value.data.debit_account_id.toString(),
        credit_account_id: payload.value.data.credit_account_id.toString(),
        update_date: DateTime.utc().toISO(),
        status: payload.value.data.status,
        scale: 6,
      };

      responses.push({ value: JSON.stringify(response) });
      processedOffsets.push(payload.offset);
    });

    await producer
      .send({
        topic: "transaction-update",
        messages: responses,
      })
      .catch((e) =>
        console.error(`[error/transaction-update/consumer] ${e.message}`, e),
      );

    processedOffsets.forEach((offset) => {
      resolveOffset(offset);
    });

    await heartbeat();
  };

  return batchTransferUpdateHandler;
};
