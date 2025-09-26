import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';

import { ConfigLoader } from '../src/core';
import { ElendClient } from '../src/elend-client';
import { Network } from '../src/types/common';
import { waitSignAndExecuteTransactionIX } from '../src/utils';
import { getSignerByPrivateKey, getSuiClientInstance } from '../src/utils/sui-client';

const rpcUrl = 'https://fullnode.testnet.sui.io:443';
const wsRpcUrl = 'https://fullnode.testnet.sui.io:443';

const signer = getSignerByPrivateKey('suiprivkey1qzwd7tkdp4u2s7j9g5s624hud7d3ltq6q6xp9k6pq4s9jehu4zsnylljw8k');
const depositReserve = '0xada20c93464a88cf430480ae6da2fcdc0521bc804b1a108c86465edcd7188d77'; //SUI
const depositAmount = 1 * 10 ** 9;

const deposit = async () => {
  const suiClient = getSuiClientInstance(rpcUrl, wsRpcUrl);
  const elendClient = await ElendClient.create(Network.Testnet, {
    obligationOwner: signer.toSuiAddress(),
    suiClient,
    isLoadReserves: true,
  });
  if (isNil(elendClient.obligation)) {
    const tx = await elendClient.initObligation();
    const initObligationRes = await waitSignAndExecuteTransactionIX(suiClient, tx, signer);
    console.log('init obligation res: ', initObligationRes);
  }
  const tx = await elendClient.deposit(depositReserve, depositAmount);

  const depositRes = await waitSignAndExecuteTransactionIX(suiClient, tx, signer);
  console.log('deposit res: ', depositRes);
};

deposit();
