import { SuiClient } from "@mysten/sui/client";
import { NetworkConfig } from "./interfaces/config";
import { Reserve } from "./types/object";

export abstract class ElendClient {
  public readonly networkConfig: NetworkConfig;
  public readonly suiClient: SuiClient;

  public obligationOwner: string | null;
  public associateReservesObligation: Map<string, Reserve>();

  constructor () {

  }

  abstract async refreshObligation(): Promise<void>;
  abstract async refreshReserves(): Promise<void>;

  abstract async deposit(): Promise<void>;
  abstract async borrow(): Promise<void>;
  abstract async withdraw(): Promise<void>;
  abstract async repay(): Promise<void>;
}