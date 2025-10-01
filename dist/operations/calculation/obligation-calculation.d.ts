import { Decimal as DecimalJs } from 'decimal.js';
import { IElendMarketObligationCalculationOperation } from '../../interfaces/operations';
import { Obligation, Reserve } from '../../types';
import { DetailBorrowedRes, DetailSuppliedRes } from '../../types/client';
export declare class ElendMarketObligationCalculationOperation implements IElendMarketObligationCalculationOperation {
    constructor();
    getTotalSuppliedUSDValueObligation(obligation: Obligation, associateReserves: Map<string, Reserve>, reserveTokenPrice: Map<string, DecimalJs>): DecimalJs;
    getTotalBorrowedUSDValueObligation(obligation: Obligation, associateReserves: Map<string, Reserve>, reserveTokenPrice: Map<string, DecimalJs>): DecimalJs;
    getDetailSuppliedOnMarketObligation(obligation: Obligation, associateReserves: Map<string, Reserve>, reserveTokenPrice: Map<string, DecimalJs>, reserves?: Reserve[]): DetailSuppliedRes[];
    getDetailBorrowedOnMarketObligation(obligation: Obligation, associateReserves: Map<string, Reserve>, reserveTokenPrice: Map<string, DecimalJs>, reserves?: Reserve[]): DetailBorrowedRes[];
    calculateCurrentHealthRatioObligation(obligation: Obligation, associateReserves: Map<string, Reserve>, reserveTokenPrice: Map<string, DecimalJs>): DecimalJs;
    calculateRemainingBorrowAmount(obligation: Obligation, associateReserves: Map<string, Reserve>, reserveTokenPrice: Map<string, DecimalJs>, borrowReserve: string): DecimalJs;
    calculateAllowedWithdrawAmount(obligation: Obligation, associateReserves: Map<string, Reserve>, reserveTokenPrice: Map<string, DecimalJs>, reserve: string, permissiveWithdrawMax: boolean): DecimalJs;
    private collateralToLiquidity;
    private estimateAllowedBorrowValue;
    private estimateTotalBorrowFactorDebtValue;
    private estimateUnhealthyBorrowValue;
}
