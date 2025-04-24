import type { EachBatchHandler } from "kafkajs";

export const batchFraudDetectionHandler: EachBatchHandler = async ({
  batch,
  resolveOffset,
  heartbeat,
  commitOffsetsIfNecessary,
  uncommittedOffsets,
  isRunning,
  isStale,
  pause,
}) => {
  for (let message of batch.messages) {
    console.log({
      topic: batch.topic,
      partition: batch.partition,
      highWatermark: batch.highWatermark,
      message: {
        offset: message.offset,
        key: message.key.toString(),
        value: message.value.toString(),
        headers: message.headers,
      },
    });

    resolveOffset(message.offset);
    await heartbeat();
  }
};
