"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decimal = void 0;
// decimal.ts
const decimal_js_1 = require("decimal.js");
class Decimal {
    constructor(value) {
        this.value = value;
    }
    // --- constructors ---
    static one() {
        return new Decimal(Decimal.WAD);
    }
    static from(v) {
        return new Decimal(BigInt(v) * Decimal.WAD);
    }
    static fromDecimalJs(v) {
        const scaled = v.mul(new decimal_js_1.Decimal(Decimal.WAD.toString())).floor();
        const intStr = scaled.toFixed(0);
        return new Decimal(BigInt(intStr));
    }
    static fromU128(v) {
        return new Decimal(v * Decimal.WAD);
    }
    static fromPercent(v) {
        return new Decimal((BigInt(v) * Decimal.WAD) / 100n);
    }
    static fromPercentU64(v) {
        return new Decimal((v * Decimal.WAD) / 100n);
    }
    static fromBps(v) {
        return new Decimal((v * Decimal.WAD) / 10000n);
    }
    static fromScaledVal(v) {
        return new Decimal(v);
    }
    toScaledVal() {
        return this.value;
    }
    toU128() {
        return this.value / Decimal.WAD;
    }
    toDecimalJs() {
        return new decimal_js_1.Decimal(this.value.toString()).div(new decimal_js_1.Decimal(Decimal.WAD.toString()));
    }
    // --- arithmetic ---
    add(b) {
        return new Decimal(this.value + b.value);
    }
    sub(b) {
        return new Decimal(this.value - b.value);
    }
    saturatingSub(b) {
        return this.value < b.value ? new Decimal(0n) : new Decimal(this.value - b.value);
    }
    mul(b) {
        return new Decimal((this.value * b.value) / Decimal.WAD);
    }
    div(b) {
        return new Decimal((this.value * Decimal.WAD) / b.value);
    }
    mulU256(v) {
        return new Decimal(this.value * v);
    }
    divU256(v) {
        return new Decimal(this.value / v);
    }
    // --- pow ---
    pow(e) {
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
    floor() {
        return this.value / Decimal.WAD;
    }
    saturatingFloor() {
        if (this.value > Decimal.U64_MAX * Decimal.WAD) {
            return Decimal.U64_MAX;
        }
        return this.floor();
    }
    ceil() {
        return (this.value + Decimal.WAD - 1n) / Decimal.WAD;
    }
    // --- comparisons ---
    eq(b) {
        return this.value === b.value;
    }
    ge(b) {
        return this.value >= b.value;
    }
    gt(b) {
        return this.value > b.value;
    }
    le(b) {
        return this.value <= b.value;
    }
    lt(b) {
        return this.value < b.value;
    }
    min(b) {
        return this.value < b.value ? this : b;
    }
    max(b) {
        return this.value > b.value ? this : b;
    }
}
exports.Decimal = Decimal;
Decimal.WAD = 10n ** 18n;
Decimal.U64_MAX = 18446744073709551615n;
//# sourceMappingURL=decimal.js.map