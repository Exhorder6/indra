import { Injectable, Logger } from "@nestjs/common";
import { arrayify, hexlify, randomBytes, verifyMessage, isHexString } from "ethers/utils";
import { fromExtendedKey } from "ethers/utils/hdnode";

import { ChannelRepository } from "../channel/channel.repository";
import { LoggerService } from "../logger/logger.service";
import { isValidHex, isXpub, isEthAddress } from "../util";
import { MessagingAuthService } from "@connext/messaging";

// TODO: integrate JWT token

const logger = new Logger("AuthService");
const nonceLen = 16;
const nonceTTL = 24 * 60 * 60 * 1000; // 1 day

export function getAuthAddressFromXpub(xpub: string): string {
  return fromExtendedKey(xpub).derivePath("0").address;
}

export function getMultisigAddressFromXpub(xpub: string): string {
  return "TODO"
}

@Injectable()
export class AuthService {
  private nonces: { [key: string]: { nonce: string; expiry: number } } = {};
  constructor(
    private readonly channelRepo: ChannelRepository,
    private readonly messagingAuthSerivice: MessagingAuthService,
  ) {}

  // FIXME-- fix this client api contract error...
  // TODO-- get ops/start_prod.sh placeholders filled out
  async getNonce(userPublicIdentifier: string): Promise<string> {
    const nonce = hexlify(randomBytes(nonceLen));
    const expiry = Date.now() + nonceTTL;
    // FIXME-- store nonce in redis instead of here...
    this.nonces[userPublicIdentifier] = { expiry, nonce };
    logger.debug(
      `getNonce: Gave xpub ${userPublicIdentifier} a nonce that expires at ${expiry}: ${nonce}`,
    );
    return nonce;
  }

  async verifyAndVend(signedNonce: string, userPublicIdentifier: string): Promise<string> {
    const xpubAddress = getAuthAddressFromXpub(userPublicIdentifier);
    logger.debug(`Got address ${xpubAddress} from xpub ${userPublicIdentifier}`);

    const multisigAddress = getMultisigAddressFromXpub(userPublicIdentifier);

    const { nonce, expiry } = this.nonces[userPublicIdentifier];
    const addr = verifyMessage(arrayify(nonce), signedNonce);
    if (addr !== xpubAddress) {
      throw new Error(`verification failed`);
    }
    if (Date.now() > expiry) {
      throw new Error(`verification failed... nonce expired for xpub: ${userPublicIdentifier}`);
    }

    const permissions = {
      publish: {
        allow: [`${userPublicIdentifier}.>`, `${multisigAddress}`],
        // deny: [],
      },
      subscribe: {
        allow: [`${userPublicIdentifier}.>`, `${multisigAddress}`, `app-registry.>`, ``],
        // deny: [],
      },
      // response: {
      // TODO: consider some sane ttl to safeguard DDOS
      // },
    };

    // TODO... fixup this admin stuff
    // if (isAdmin) {
    //   do permissions stuff...
    // }

    const jwt = this.messagingAuthSerivice.vend(userPublicIdentifier, nonceTTL, permissions);
    logger.debug(``);
    return jwt;
  }

  useAdminToken(callback: any): any {
    // get token from subject
    return async (subject: string, data: { token: string }): Promise<string> => {
      // // verify token is admin token
      const { token } = data;
      if (token !== process.env.INDRA_ADMIN_TOKEN) {
        return this.badToken(`Unrecognized admin token: ${token}.`);
      }
      return callback(data);
    };
  }

  useAdminTokenWithPublicIdentifier(callback: any): any {
    // get token from subject
    return async (subject: string, data: { token: string }): Promise<string> => {
      // // verify token is admin token
      const { token } = data;
      if (token !== process.env.INDRA_ADMIN_TOKEN) {
        return this.badToken(`Unrecognized admin token: ${token}.`);
      }

      // Get & validate xpub from subject
      const xpub = subject.split(".").pop(); // last item of subscription is xpub
      if (!xpub || !isXpub(xpub)) {
        return this.badSubject(`Subject's last item isn't a valid xpub: ${subject}`);
      }
      return callback(xpub, data);
    };
  }

  parseXpub(callback: any): any {
    return async (subject: string, data: { token: string }): Promise<string> => {
      // Get & validate xpub from subject
      const xpub = subject.split(".")[0]; // first item of subscription is xpub
      if (!xpub || !isXpub(xpub)) {
        return this.badSubject(`Subject's first item isn't a valid xpub: ${subject}`);
      }
      return callback(xpub, data);
    };
  }

  parseMultisig(callback: any): any {
    return async (subject: string, data: { token: string }): Promise<string> => {
      const multisig = subject.split(".")[0]; // first item of subject is multisig
      if (!multisig || !isEthAddress(multisig)) {
        return this.badSubject(`Subject's first item isn't a valid multisig address: ${subject}`);
      }
      return callback(multisig, data);
    };
  }
}
