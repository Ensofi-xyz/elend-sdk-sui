import { SuiClient } from "@mysten/sui/client";
import { NetworkConfig } from "./interfaces/config";
import { Reserve } from "./types/object";
import { IBorrowElendMarketOperation, IDepositElendMarketOperation, IElendMarketCalculationOperation, IElendMarketQueryOperation, IElendMarketRewardOperation, IRepayElendMarketOperation, IWithdrawElendMarketOperation } from "./interfaces/operations";

export class ElendClient {
  public readonly networkConfig: NetworkConfig;
  public readonly suiClient: SuiClient;

  public obligationOwner: string | null;
  public associateReservesObligation: Map<string, Reserve>;

  public depositOperation: IDepositElendMarketOperation;
  public borrowOperation: IBorrowElendMarketOperation;
  public withdrawOperation: IWithdrawElendMarketOperation;
  public repayOperation: IRepayElendMarketOperation;

  public rewardOperation: IElendMarketRewardOperation;
  public queryOperation: IElendMarketQueryOperation;
  public calculationOperation: IElendMarketCalculationOperation;

  constructor () {

  }

  refreshObligation(): Promise<void>;
  refreshReserves(): Promise<void>;

  deposit(): Promise<void>;
  borrow(): Promise<void>;
  withdraw(): Promise<void>;
  repay(): Promise<void>;
}