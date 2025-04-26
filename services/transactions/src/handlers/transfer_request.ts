import { DateTime } from "luxon";

import {
  type Client,
  type Transfer,
  TransferFlags,
  CreateTransferError,
} from "tigerbeetle-node";

import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz_-";
const nanoid = customAlphabet(alphabet, 29);

import { z } from "zod";

import type { EachBatchHandler, Producer, Message } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  parseJsonPreprocessor,
  transferRequestMessage,
  DEFAULT_TRANSCATION_EXPIRATION_TIME,
  type TransferRequest,
  type TransferCreatedMessage,
} from "@/schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<TransferRequest>;
};

export const handler: (producer: Producer, tb: Client) => EachBatchHandler = (
  producer: Producer,
  tb: Client,
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
    const requests: Array<Transfer> = [];

    messages.forEach((message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;

      const transaction = {
        id: payload.value.data.number,
        debit_account_id: payload.value.data.debit_account_id,
        credit_account_id: payload.value.data.credit_account_id,
        amount: payload.value.data.amount,
        pending_id: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        timeout: DEFAULT_TRANSCATION_EXPIRATION_TIME,
        ledger: payload.value.data.ledger,
        code: payload.value.data.code,
        flags: TransferFlags.pending,
        timestamp: 0n,
      };

      requests.push(transaction);

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

    const transfer_errors = await tb.createTransfers(requests);
    for (const error of transfer_errors) {
      responses.splice(error.index, 1);

      switch (error.result) {
        case CreateTransferError.exists:
          console.log(`Batch transfe at ${error.index} already exists.`);
          break;
        default:
          console.error(
            `Batch tranfer at ${error.index} failed to create: ${
              CreateTransferError[error.result]
            }.`,
          );
      }
    }

    // TODO: Reporpouse transaction create to be used for failed topoic
    const topicMessages = [
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
