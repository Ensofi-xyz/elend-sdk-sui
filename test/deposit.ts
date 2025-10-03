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
const depositReserve = '0x3a80fd776b73e76e24bea4e7bb0bb0364bc030eb7bbee814132f9546a4e5bbc6';
const depositAmount = 3 * 10 ** 9;
const marketType = '0x1fe250637cb2d5a08f58288664f4f5f8d2eee0001529a4fb30c7449649c95559::elend_market::MAIN_POOL';

const deposit = async () => {
  const suiClient = getSuiClientInstance(rpcUrl, wsRpcUrl);
  const elendClient = await ElendClient.create(Network.Testnet, {
    obligationOwner: signer.toSuiAddress(),
    suiClient,
    isLoadData: true,
  });

  const obligation = elendClient.obligations.get(marketType);
  if (isNil(obligation)) {
    const tx = await elendClient.initObligation(marketType);
    const initObligationRes = await waitSignAndExecuteTransactionIX(suiClient, tx, signer);
    console.log('init obligation res: ', initObligationRes);
  }
  const tx = await elendClient.deposit(depositReserve, depositAmount);

  // const simulate = await suiClient.devInspectTransactionBlock({
  //   transactionBlock: tx,
  //   sender: signer.toSuiAddress(),
  // })
  // console.log(simulate);
  const depositRes = await waitSignAndExecuteTransactionIX(suiClient, tx, signer);
  console.log('deposit res: ', depositRes);
};

deposit();
