import { IElendMarketReserveCalculationOperation } from '../../interfaces/operations';

export class ElendMarketReserveCalculationOperation implements IElendMarketReserveCalculationOperation {
  constructor() {}

  getTotalSuppliedUSDValueOnMarket(): void {
    throw new Error('Method not implemented.');
  }
  getTotalBorrowedUSDValueOnMarket(): void {
    throw new Error('Method not implemented.');
  }
  getDetailSuppliedOnMarket(): void {
    throw new Error('Method not implemented.');
  }
  getDetailBorrowedOnMarket(): void {
    throw new Error('Method not implemented.');
  }
  getDetailSupplyApy(): void {
    throw new Error('Method not implemented.');
  }
  getDetailBorrowApy(): void {
    throw new Error('Method not implemented.');
  }
  totalSupplyAPYWithNewAvailableSupplyAmount(): void {
    throw new Error('Method not implemented.');
  }
  totalBorrowAPYWithNewBorrowedAmount(): void {
    throw new Error('Method not implemented.');
  }
}
