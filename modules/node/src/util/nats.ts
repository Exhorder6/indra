import { RpcException } from "@nestjs/microservices";
import { Client, Msg, NatsError } from "ts-nats";

export abstract class AbstractNatsProvider implements INatsProvider {
  constructor(protected readonly natsClient: Client) {}

  async connectRequestReponse(
    pattern: string,
    processor: (subject: string, data: any) => any,
  ): Promise<void> {
    await this.natsClient.subscribe(
      pattern,
      (err: NatsError | null, msg: Msg) => {
        if (err) {
          throw new RpcException(`Error subcribing to ${pattern}.`);
        } else if (msg.reply) {
          const publish = processor(msg.subject, msg.data);
          this.natsClient.publish(msg.reply, publish);
        }
      },
    );
  }

  abstract setupSubscriptions(): void;
}

export interface INatsProvider {
  setupSubscriptions(): void;
}
