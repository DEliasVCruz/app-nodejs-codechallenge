import { DateTime } from "luxon";

import { z } from "zod";

import {
  id,
  type Client,
  type Transfer,
  CreateTransferError,
} from "tigerbeetle-node";

import type { EachBatchHandler, Producer, Message } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  parseJsonPreprocessor,
  fraudTransactionVeridictMessage,
  getTransferFlagByStatus,
  type FraudTransactionVeridictEvent,
  type TransferUpdateMessage,
} from "@/schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<FraudTransactionVeridictEvent>;
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

    if (!messages.length) {
      await heartbeat();

      return;
    }

    const responses: Array<Message> = [];
    const processedOffsets: Array<string> = [];
    const requests: Array<Transfer> = [];

    messages.forEach(async (message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;

      const flag = getTransferFlagByStatus(payload.value.data.status);

      const transaction = {
        id: id(),
        debit_account_id: payload.value.data.debit_account_id,
        credit_account_id: payload.value.data.credit_account_id,
        amount: payload.value.data.amount,
        pending_id: payload.value.data.number,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        timeout: 0,
        ledger: payload.value.data.ledger,
        code: payload.value.data.code,
        flags: flag,
        timestamp: 0n,
      };

      requests.push(transaction);
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

    const transfer_errors = await tb.createTransfers(requests);
    for (const error of transfer_errors) {
      switch (error.result) {
        case CreateTransferError.exists:
          console.error(`Batch transfe at ${error.index} already exists.`);
          break;
        default:
          console.error(
            `Batch account at ${error.index} failed to create: ${
              CreateTransferError[error.result]
            }.`,
          );
      }
    }

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
