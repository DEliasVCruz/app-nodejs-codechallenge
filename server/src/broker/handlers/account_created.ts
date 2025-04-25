import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { z } from "zod";

import type { AccountStatus } from "@accounts/schemas";
import { accounts } from "@db/queries/accounts";

import type { EachBatchHandler } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  parseJsonPreprocessor,
  accountCreatedMessage,
  type AccountCreatedMessage,
} from "@bk/schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<AccountCreatedMessage>;
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
          accountCreatedMessage,
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

    const processedOffsets: Array<string> = [];
    const requests: Record<AccountStatus, Array<string>> = {
      created: [],
      pending: [],
    };

    messages.forEach((message) => {
      if (!isRunning() || isStale()) return;

      const payload = message as MessageParsedPayload;

      requests[payload.value.data.status].push(payload.value.data.account_id);
      processedOffsets.push(payload.offset);
    });

    for (const [status, account_ids] of Object.entries(requests)) {
      if (account_ids.length === 0) {
        continue;
      }

      await accounts.updateStatusBatch(
        db,
        account_ids,
        status as AccountStatus,
      );
    }

    processedOffsets.forEach((offset) => {
      resolveOffset(offset);
    });

    await heartbeat();
  };

  return batchTransferRequestHandler;
};
