import { DateTime } from "luxon";

import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz_-";
const nanoid = customAlphabet(alphabet, 29);

import type { EachBatchHandler, Producer, Message } from "kafkajs";
import type { SafeParseSuccess } from "zod";
import {
  transferRequestMessage,
  type TransferRequest,
  type TransferCreatedMessage,
} from "@/schemas";

type MessageParsedPayload = {
  offset: string;
  value: SafeParseSuccess<TransferRequest>;
};

export const handler: (producer: Producer) => EachBatchHandler = (
  producer: Producer,
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

    const responses: Array<Message> = [];
    const processedOffsets: Array<string> = [];

    messages.forEach(async (message) => {
      if (!isRunning() || isStale()) return;

      const payload = (await message.then((content) => {
        return content;
      })) as MessageParsedPayload;

      // Send to tiger beatle for processing

      const response: TransferCreatedMessage = {
        transaction_id: nanoid(),
        number: payload.value.data.number.toString(),
        amount: payload.value.data.amount.toString(),
        debit_account_id: payload.value.data.debit_account_id.toString(),
        credit_account_id: payload.value.data.credit_account_id.toString(),
        creation_date: DateTime.utc().toISO(),
        code: payload.value.data.code,
        ledger: payload.value.data.ledger,
        scale: 6,
      };

      responses.push({ value: JSON.stringify(response) });
      processedOffsets.push(payload.offset);

      await commitOffsetsIfNecessary();

      await heartbeat();
    });

    await producer.send({
      topic: "transaction-created",
      messages: responses,
    });

    await commitOffsetsIfNecessary();

    processedOffsets.forEach(async (offset) => {
      resolveOffset(offset);
      await commitOffsetsIfNecessary();
    });
  };

  return batchTransferRequestHandler;
};
