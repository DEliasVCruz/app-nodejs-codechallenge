import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { EachBatchHandler } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
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
    commitOffsetsIfNecessary,
    isRunning,
    isStale,
  }) => {
    const messages = batch.messages
      .map(async (messgae) => {
        const parsedValue = await transferRequestMessage.spa(
          messgae.value?.toString(),
        );

        return { offset: messgae.offset, value: parsedValue };
      })
      .filter(async (message) => {
        return await message.then((payload) => {
          return payload.value.success;
        });
      });

    const processedOffsets: Array<string> = [];

    messages.forEach(async (message) => {
      if (!isRunning() || isStale()) return;

      const payload = (await message.then((content) => {
        return content;
      })) as MessageParsedPayload;

      // Create transaction record in database

      processedOffsets.push(payload.offset);

      await commitOffsetsIfNecessary();

      await heartbeat();
    });

    await commitOffsetsIfNecessary();

    processedOffsets.forEach(async (offset) => {
      resolveOffset(offset);
      await commitOffsetsIfNecessary();
    });
  };

  return batchTransferRequestHandler;
};
