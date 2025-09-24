import { IElendMarketObligationCalculationOperation } from '../../interfaces/operations';

export class ElendMarketObligationCalculationOperation implements IElendMarketObligationCalculationOperation {
  getTotalSuppliedUSDValueObligation(): void {
    throw new Error('Method not implemented.');
  }
  getTotalBorrowedUSDValueObligation(): void {
    throw new Error('Method not implemented.');
  }
  getDetailSuppliedOnMarketObligation(): void {
    throw new Error('Method not implemented.');
  }
  getDetailBorrowedOnMarketObligation(): void {
    throw new Error('Method not implemented.');
  }
  calculateCurrentHealthRatioObligation(): void {
    throw new Error('Method not implemented.');
  }
  calculateRemainingBorrowAmount(): void {
    throw new Error('Method not implemented.');
  }
  calculateAllowedWithdrawAmount(): void {
    throw new Error('Method not implemented.');
  }
}
