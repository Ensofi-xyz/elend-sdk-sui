import { Decimal as DecimalJs } from 'decimal.js';

export enum LSTAsset {
  HASUI = 'haSUI',
}

const haSuiLstEndpoint = 'https://www.haedal.xyz/api/stats/home';

export const getHaSuiLstInterest = async (): Promise<DecimalJs> => {
  try {
    const response = await fetch(haSuiLstEndpoint);
    const apy = (await response.json()).data.apy;

    return new DecimalJs(apy).div(100);
  } catch (error) {
    console.error('Error fetching haSUI APY:', error);
    return new DecimalJs(0);
  }
};
