import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';

import { ConfigLoader } from '../src/core';
import { ElendClient } from '../src/elend-client';
import { Network } from '../src/types/common';
import { waitSignAndExecuteTransactionIX } from '../src/utils';
import { getSignerByPrivateKey, getSuiClientInstance } from '../src/utils/sui-client';

const rpcUrl = 'https://fullnode.testnet.sui.io:443';
const wsRpcUrl = 'https://fullnode.testnet.sui.io:443';

const signer = getSignerByPrivateKey('suiprivkey1qpf275dj6muyampyc5emgyrslt9whguk2mvurn3am9x7yr5937yzkjaafxy');
const withdrawReserve = '0x543539fa66035a81df16fe5eb7e4c1b839ab53f8bce3d07e0efdbed988a3f133'; //USDC
const withdrawAmount = 10 * 10 ** 6;

const withdraw = async () => {
  const suiClient = getSuiClientInstance(rpcUrl, wsRpcUrl);
  const elendClient = await ElendClient.create(Network.Testnet, {
    obligationOwner: signer.toSuiAddress(),
    suiClient,
    isLoadData: true,
  });
  const tx = await elendClient.withdraw(withdrawReserve, withdrawAmount);

  const withdrawRes = await waitSignAndExecuteTransactionIX(suiClient, tx, signer);
  console.log('deposit res: ', withdrawRes);
};

withdraw();
