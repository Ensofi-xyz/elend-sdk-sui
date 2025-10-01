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
const depositReserve = '0x2d15ad1c4674211f70a4ee9e9219f5a353ddbfb06842d702344225e7dc7a98d5';
const marketType = '0x65c854c8514a8ad9ff42da649f7171a6f764f8bd019400ca290f4d277ac6e198::elend_market::MAIN_POOL';

const claim = async () => {
  const suiClient = getSuiClientInstance(rpcUrl, wsRpcUrl);
  const elendClient = await ElendClient.create(Network.Testnet, {
    obligationOwner: signer.toSuiAddress(),
    suiClient,
    isLoadData: true,
  });
  const tx = await elendClient.claim_reward(depositReserve, marketType, 0);

  // const simulate = await suiClient.devInspectTransactionBlock({
  //   transactionBlock: tx,
  //   sender: signer.toSuiAddress(),
  // })
  // console.log(simulate);
  const claimRes = await waitSignAndExecuteTransactionIX(suiClient, tx, signer);
  console.log('deposit res: ', claimRes);
};

claim();
