import { DateTime } from "luxon";

import {
  type Client,
  type Account,
  AccountFlags,
  CreateAccountError,
} from "tigerbeetle-node";

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

export const handler: (producer: Producer, tb: Client) => EachBatchHandler = (
  producer: Producer,
  tb: Client,
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

    if (!messages.length) {
      await heartbeat();

      return;
    }

    const responses: Array<Message> = [];
    const processedOffsets: Array<string> = [];
    const requests: Array<Account> = [];

    messages.forEach(async (message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;

      const account = {
        id: payload.value.data.number,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: payload.value.data.ledger,
        code: payload.value.data.operation,
        flags: AccountFlags.credits_must_not_exceed_debits,
        timestamp: 0n,
      };

      requests.push(account);

      const response: AccountCreatedMessage = {
        account_id: payload.value.data.account_id,
        update_date: DateTime.utc().toISO(),
        status: "created",
      };

      responses.push({ value: JSON.stringify(response) });
      processedOffsets.push(payload.offset);
    });

    const account_errors = await tb.createAccounts(requests);
    for (const error of account_errors) {
      switch (error.result) {
        case CreateAccountError.exists:
          console.error(`Batch account at ${error.index} already exists.`);
          break;
        default:
          console.error(
            `Batch account at ${error.index} failed to create: ${
              CreateAccountError[error.result]
            }.`,
          );
      }
    }

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
