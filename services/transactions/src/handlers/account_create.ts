import { DateTime } from "luxon";

import { z } from "zod";

import type { EachBatchHandler, Producer, Message } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  parseJsonPreprocessor,
  accountCreateMessage,
  type AccountCreateRequest,
  type AccountCreatedMessage,
} from "@/schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<AccountCreateRequest>;
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
          accountCreateMessage,
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

    messages.forEach(async (message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;
      // Send to tiger beatle for processing

      const response: AccountCreatedMessage = {
        account_id: payload.value.data.account_id,
        update_date: DateTime.utc().toISO(),
        status: "created",
      };

      responses.push({ value: JSON.stringify(response) });
      processedOffsets.push(payload.offset);
    });

    await producer
      .send({
        topic: "account-created",
        messages: responses,
      })
      .catch((e) =>
        console.error(`[error/account-create/consumer] ${e.message}`, e),
      );

    processedOffsets.forEach((offset) => {
      resolveOffset(offset);
    });

    await heartbeat();
  };

  return batchTransferUpdateHandler;
};
