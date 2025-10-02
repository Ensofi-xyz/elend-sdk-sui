// decimal.ts
import { Decimal as DecimalJs } from 'decimal.js';

export class Decimal {
  static readonly WAD: bigint = 10n ** 18n;
  static readonly U64_MAX: bigint = 18446744073709551615n;

  readonly value: bigint;

  constructor(value: bigint) {
    this.value = value;
  }

  // --- constructors ---
  static one(): Decimal {
    return new Decimal(Decimal.WAD);
  }

  static from(v: number | bigint): Decimal {
    return new Decimal(BigInt(v) * Decimal.WAD);
  }

  static fromU128(v: bigint): Decimal {
    return new Decimal(v * Decimal.WAD);
  }

  static fromPercent(v: number): Decimal {
    return new Decimal((BigInt(v) * Decimal.WAD) / 100n);
  }

  static fromPercentU64(v: bigint): Decimal {
    return new Decimal((v * Decimal.WAD) / 100n);
  }

  static fromBps(v: bigint): Decimal {
    return new Decimal((v * Decimal.WAD) / 10000n);
  }

  static fromScaledVal(v: bigint): Decimal {
    return new Decimal(v);
  }

  toScaledVal(): bigint {
    return this.value;
  }

  toU128(): bigint {
    return this.value / Decimal.WAD;
  }

  toDecimalJs(): DecimalJs {
    return new DecimalJs(BigInt(this.value) / BigInt(Decimal.WAD));
  }

  // --- arithmetic ---
  add(b: Decimal): Decimal {
    return new Decimal(this.value + b.value);
  }

  sub(b: Decimal): Decimal {
    return new Decimal(this.value - b.value);
  }

  saturatingSub(b: Decimal): Decimal {
    return this.value < b.value ? new Decimal(0n) : new Decimal(this.value - b.value);
  }

  mul(b: Decimal): Decimal {
    return new Decimal((this.value * b.value) / Decimal.WAD);
  }

  div(b: Decimal): Decimal {
    return new Decimal((this.value * Decimal.WAD) / b.value);
  }

  mulU256(v: bigint): Decimal {
    return new Decimal(this.value * v);
  }

  divU256(v: bigint): Decimal {
    return new Decimal(this.value / v);
  }

  // --- pow ---
  pow(e: bigint): Decimal {
    let curBase = new Decimal(this.value);
    let result = Decimal.from(1);

    let exp = e;
    while (exp > 0n) {
      if (exp % 2n === 1n) {
        result = result.mul(curBase);
      }
      curBase = curBase.mul(curBase);
      exp = exp / 2n;
    }
    return result;
  }

  // --- rounding ---
  floor(): bigint {
    return this.value / Decimal.WAD;
  }

  saturatingFloor(): bigint {
    if (this.value > Decimal.U64_MAX * Decimal.WAD) {
      return Decimal.U64_MAX;
    }
    return this.floor();
  }

  ceil(): bigint {
    return (this.value + Decimal.WAD - 1n) / Decimal.WAD;
  }

  // --- comparisons ---
  eq(b: Decimal): boolean {
    return this.value === b.value;
  }
  ge(b: Decimal): boolean {
    return this.value >= b.value;
  }
  gt(b: Decimal): boolean {
    return this.value > b.value;
  }
  le(b: Decimal): boolean {
    return this.value <= b.value;
  }
  lt(b: Decimal): boolean {
    return this.value < b.value;
  }

  min(b: Decimal): Decimal {
    return this.value < b.value ? this : b;
  }

  max(b: Decimal): Decimal {
    return this.value > b.value ? this : b;
  }
}
