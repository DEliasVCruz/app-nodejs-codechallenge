import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { z } from "zod";

import { accountsTable } from "@db/schemas/accounts";

import type { EachBatchHandler } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  parseJsonPreprocessor,
  transferRequestMessage,
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
          transferRequestMessage,
        );

        const parsedValue = schemaChecker.safeParse(messgae.value?.toString());

        return { offset: messgae.offset, value: parsedValue };
      })
      .filter((message) => {
        return message.value.success;
      });

    const processedOffsets: Array<string> = [];

    messages.forEach((message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;
      // Create transaction record in database

      const query = db.select().from(accountsTable).toSQL();
      console.log("The query for create", query);

      processedOffsets.push(payload.offset);
    });

    processedOffsets.forEach((offset) => {
      resolveOffset(offset);
    });

    await heartbeat();
  };

  return batchTransferRequestHandler;
};
