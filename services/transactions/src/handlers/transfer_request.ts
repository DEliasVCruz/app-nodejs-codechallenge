import { DateTime } from "luxon";

import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz_-";
const nanoid = customAlphabet(alphabet, 29);

import { z } from "zod";

import type { EachBatchHandler, Producer, Message } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  parseJsonPreprocessor,
  transferRequestMessage,
  type TransferRequest,
  type TransferCreatedMessage,
} from "@/schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<TransferRequest>;
};

export const handler: (producer: Producer) => EachBatchHandler = (
  producer: Producer,
) => {
  const batchTransferRequestHandler: EachBatchHandler = async ({
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
          transferRequestMessage,
        );

        const parsedValue = schemaChecker.safeParse(messgae.value?.toString());

        return { offset: messgae.offset, value: parsedValue };
      })
      .filter((message) => {
        if (!message.value.success) {
          console.error(
            `[error/account-create/parse] ${message.value.error.message}`,
            message.value.error,
          );
        }

        return message.value.success;
      });

    if (!messages.length) {
      await heartbeat();

      return;
    }

    const responses: Array<Message> = [];
    const processedOffsets: Array<string> = [];

    messages.forEach((message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;

      // Send to tiger beatle for processing

      const response: TransferCreatedMessage = {
        transaction_id: nanoid(),
        number: payload.value.data.number.toString(),
        amount: payload.value.data.amount.toString(),
        debit_account_id: payload.value.data.debit_account_id.toString(),
        credit_account_id: payload.value.data.credit_account_id.toString(),
        creation_date: DateTime.utc().toISO(),
        code: payload.value.data.code,
        ledger: payload.value.data.ledger,
        status: "pending",
        scale: 6,
      };

      responses.push({ value: JSON.stringify(response) });
      processedOffsets.push(payload.offset);
    });

    const topicMessages = [
      {
        topic: "transaction-created",
        messages: responses,
      },
      {
        topic: "transaction-validate",
        messages: responses,
      },
    ];

    await producer
      .sendBatch({ topicMessages })
      .catch((e) =>
        console.error(`[error/transaction-request/consumer] ${e.message}`, e),
      );

    processedOffsets.forEach((offset) => {
      resolveOffset(offset);
    });

    await heartbeat();
  };

  return batchTransferRequestHandler;
};
