import { SuiClient } from "@mysten/sui/client";
import { NetworkConfig } from "./interfaces/config";
import { Reserve } from "./types/object";
import { 
  IBorrowElendMarketOperation, 
  IDepositElendMarketOperation, 
  IElendMarketObligationCalculationOperation, 
  IElendMarketQueryOperation, 
  IElendMarketReserveCalculationOperation, 
  IElendMarketRewardOperation, 
  IRepayElendMarketOperation, 
  IWithdrawElendMarketOperation 
} from "./interfaces/operations";

export class ElendClient {
  public readonly networkConfig: NetworkConfig;
  public readonly suiClient: SuiClient;

  public obligationOwner: string | null;
  public associateReservesObligation: Map<string, Reserve>;

  depositOperation: IDepositElendMarketOperation;
  borrowOperation: IBorrowElendMarketOperation;
  withdrawOperation: IWithdrawElendMarketOperation;
  repayOperation: IRepayElendMarketOperation;

  rewardOperation: IElendMarketRewardOperation;
  queryOperation: IElendMarketQueryOperation;

  reserveCalculationOperation: IElendMarketReserveCalculationOperation;
  obligationCalculationOperation: IElendMarketObligationCalculationOperation;
  rewardCalculationOperation: IElendMarketRewardOperation;

  constructor () {

  }

  refreshObligation(): Promise<void> {

  }
  
  refreshReserves(): Promise<void> {

  }

  deposit(): Promise<void> {

  };

  borrow(): Promise<void> {

  }

  withdraw(): Promise<void> {

  }

  repay(): Promise<void> {

  }
}