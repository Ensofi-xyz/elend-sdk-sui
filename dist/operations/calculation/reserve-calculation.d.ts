import { Decimal as DecimalJs } from 'decimal.js';
import { IElendMarketReserveCalculationOperation } from '../../interfaces/operations';
import { Reserve } from '../../types';
import { DetailBorrowApyRes, DetailBorrowedRes, DetailSuppliedRes, DetailSupplyApyRes } from '../../types/client';
import { UserActionType } from '../../types/common';
import { Decimal } from '../../utils';
import { ElendMarketQueryOperation } from '../query/query';
export declare class ElendMarketReserveCalculationOperation implements IElendMarketReserveCalculationOperation {
    private readonly queryOperation;
    constructor(queryOperation: ElendMarketQueryOperation);
    getTotalSuppliedUSDValueOnMarket(reserves: Reserve[]): DecimalJs;
    getTotalBorrowedUSDValueOnMarket(reserves: Reserve[]): DecimalJs;
    getDetailSuppliedOnMarket(reserves: Reserve[]): DetailSuppliedRes[];
    getDetailBorrowedOnMarket(reserves: Reserve[]): DetailBorrowedRes[];
    getDetailSupplyApy(reserve: Reserve, marketType: string, currentTimestampMs: number): Promise<DetailSupplyApyRes>;
    getDetailBorrowApy(reserve: Reserve, marketType: string, currentTimestampMs: number): Promise<DetailBorrowApyRes>;
    totalSupplyAPYWithNewAvailableSupplyAmount(reserve: Reserve, marketType: string, newAvailableAmount: bigint, currentTimestampMs: number, userAction: UserActionType): Promise<DecimalJs>;
    totalBorrowAPYWithNewBorrowedAmount(reserve: Reserve, marketType: string, newAvailableLiquidity: bigint, newBorrowedAmount: Decimal, currentTimestampMs: number, userAction: UserActionType): Promise<DecimalJs>;
    getTotalSupply(reserve: Reserve): DecimalJs;
    getBorrowedAmount(reserve: Reserve): DecimalJs;
    getLiquidityAvailableAmount(reserve: Reserve): DecimalJs;
    getAccumulatedProtocolFees(reserve: Reserve): DecimalJs;
    getReserveMarketPrice(reserve: Reserve): DecimalJs;
    getMintDecimals(reserve: Reserve): number;
    calculateUtilizationRatio(reserve: Reserve, slot?: number): number;
    calculateSupplyAPR(reserve: Reserve, timestampMs: number): number;
    calculateBorrowAPR(reserve: Reserve, timestampMs?: number): number;
    calculateBorrowRate(reserve: Reserve, timestampMs?: number): number;
    getEstimatedDebtAndSupply(reserve: Reserve, timestampMs: number): {
        totalBorrow: DecimalJs;
        totalSupply: DecimalJs;
    };
    getBorrowRate(reserve: Reserve, utilizationRate: number): number;
    private compoundInterest;
    private approximateCompoundedInterest;
}
