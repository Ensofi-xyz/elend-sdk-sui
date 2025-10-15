import { Decimal as DecimalJs } from 'decimal.js';
export declare enum LSTAsset {
    HASUI = "haSUI"
}
export declare const getHaSuiLstInterest: () => Promise<DecimalJs>;
