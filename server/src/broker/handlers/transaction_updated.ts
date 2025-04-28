import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { z } from "zod";

import type { TransactionStatus } from "@transactions/schemas";

import type { EachBatchHandler } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  transactionUpdatedMessage,
  type TransactionUpdateMessage,
} from "@bk/schemas";

import { parseJsonPreprocessor } from "@/utils";

import { transactions } from "@db/queries/transactions";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<TransactionUpdateMessage>;
};

export const handler: (db: NodePgDatabase) => EachBatchHandler = (
  db: NodePgDatabase,
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
          transactionUpdatedMessage,
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

    const processedOffsets: Array<string> = [];
    const requests: Map<TransactionStatus, Array<string>> = new Map();

    messages.forEach((message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;

      const records = requests.get(payload.value.data.status) ?? [];
      records.push(payload.value.data.transaction_id);

      requests.set(payload.value.data.status, records);

      processedOffsets.push(payload.offset);
    });

    for (const [status, account_ids] of requests.entries()) {
      if (account_ids.length === 0) {
        continue;
      }

      const results = await transactions.updateStatusBatch(
        db,
        account_ids,
        status as TransactionStatus,
      );

      console.log(
        `[info/transactions-updated/consumer] update count: ${results.length}`,
      );
    }

    processedOffsets.forEach((offset) => {
      resolveOffset(offset);
    });

    await heartbeat();
  };

  return batchTransferUpdateHandler;
};
