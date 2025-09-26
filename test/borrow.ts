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
const borrowReserve = '0xa50848b8ea74455f810fc882fd1c309a07fde5ed6022488d3fb97cfa1c790c00'; //USDC
const borrowAmount = 5000000; // 5 USDC

const borrow = async () => {
  const suiClient = getSuiClientInstance(rpcUrl, wsRpcUrl);
  const elendClient = await ElendClient.create(Network.Testnet, {
    obligationOwner: signer.toSuiAddress(),
    suiClient,
    isLoadReserves: true,
  });
  const tx = await elendClient.borrow(borrowReserve, borrowAmount);

  // const simulate = await suiClient.devInspectTransactionBlock({
  //   transactionBlock: tx,
  //   sender: signer.toSuiAddress(),
  // })
  // console.log(simulate);
  const borrowRes = await waitSignAndExecuteTransactionIX(suiClient, tx, signer);
  console.log('borrow res: ', borrowRes);
};

borrow();
