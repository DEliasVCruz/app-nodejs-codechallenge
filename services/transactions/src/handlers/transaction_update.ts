import { DateTime } from "luxon";

import type { EachBatchHandler, Producer, Message } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  fraudTransactionVeridictMessage,
  type FraudTransactionVeridictEvent,
  type TransferUpdate,
} from "@/schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<FraudTransactionVeridictEvent>;
};

export const handler: (producer: Producer) => EachBatchHandler = (
  producer: Producer,
) => {
  const batchTransferUpdateHandler: EachBatchHandler = async ({
    batch,
    resolveOffset,
    heartbeat,
    commitOffsetsIfNecessary,
    isRunning,
    isStale,
  }) => {
    const messages = batch.messages
      .map(async (messgae) => {
        const parsedValue = await fraudTransactionVeridictMessage.spa(
          messgae.value?.toString(),
        );

        return { offset: messgae.offset, value: parsedValue };
      })
      .filter(async (message) => {
        return await message.then((payload) => {
          return payload.value.success;
        });
      });

    const responses: Array<Message> = [];
    const processedOffsets: Array<string> = [];

    messages.forEach(async (message) => {
      if (!isRunning() || isStale()) return;

      const payload = (await message.then((content) => {
        return content;
      })) as MessageParsedPayload;

      // Send to tiger beatle for processing

      const response: TransferUpdate = {
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

      await commitOffsetsIfNecessary();

      await heartbeat();
    });

    await producer.send({
      topic: "transaction-update",
      messages: responses,
    });

    await commitOffsetsIfNecessary();

    processedOffsets.forEach(async (offset) => {
      resolveOffset(offset);
      await commitOffsetsIfNecessary();
    });
  };

  return batchTransferUpdateHandler;
};
