import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { z } from "zod";

import { transactions, type NewTransaction } from "@db/queries/transactions";

import type { EachBatchHandler } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  parseJsonPreprocessor,
  transactionCreatedMessage,
  type TransactionCreatedMessage,
} from "@bk/schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<TransactionCreatedMessage>;
};

export const handler: (db: NodePgDatabase) => EachBatchHandler = (
  db: NodePgDatabase,
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
          transactionCreatedMessage,
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

    const processedOffsets: Array<string> = [];
    const requests: Array<NewTransaction> = [];

    console.log(
      `[info/transactions-created/consumer] transaction creation recieved`,
      messages,
    );
    messages.forEach((message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;
      // Create transaction record in database

      console.log("The date", payload.value.data.creation_date);
      requests.push({
        id: payload.value.data.transaction_id,
        credit_account_number: payload.value.data.credit_account_id.toString(),
        debit_account_number: payload.value.data.debit_account_id.toString(),
        number: payload.value.data.number.toString(),
        operation_id: payload.value.data.code,
        value: payload.value.data.amount.toString(),
        creation_date: new Date(payload.value.data.creation_date),
        status: payload.value.data.status,
      });
      processedOffsets.push(payload.offset);
    });

    const results = await transactions.insertBatch(db, requests);
    console.log(
      `[info/transactions-created/consumer] update count: ${results.length}`,
    );

    processedOffsets.forEach((offset) => {
      resolveOffset(offset);
    });

    await heartbeat();
  };

  return batchTransferRequestHandler;
};
