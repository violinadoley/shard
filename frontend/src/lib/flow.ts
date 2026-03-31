import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

const FLOW_NETWORK = "testnet";

// Shard contract address on testnet
export const SHARD_CONTRACT_ADDRESS = "ec3c1566d2b4bb6c";

fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "flow.network": FLOW_NETWORK,
  "app.detail.title": "Shard",
  "app.detail.icon": "https://avatars.githubusercontent.com/u/62306725?s=200&v=4",
  "0xFlowToken": "0x7e60df042a9c0868",
  "0xShard": SHARD_CONTRACT_ADDRESS,
});

export { fcl, t };

export async function sendTransaction(
  code: string,
  args: any[] = [],
  proposer?: any,
  payer?: any,
  authorizations?: any[]
) {
  const transactionId = await fcl.send([
    fcl.transaction(code),
    fcl.args(args),
    fcl.proposer(proposer || fcl.currentUser().authorization),
    fcl.payer(payer || fcl.currentUser().authorization),
    fcl.authorizations(authorizations || [fcl.currentUser().authorization]),
    fcl.limit(9999),
  ]);

  const transaction = await fcl.tx(transactionId).onceSealed();
  return transaction;
}

export async function executeScript(code: string, args: any[] = []) {
  const result = await fcl.query({
    cadence: code,
    args: args,
  });
  return result;
}

export function currentUser() {
  return fcl.currentUser();
}

export function currentUserSnapshot() {
  return fcl.currentUser().snapshot();
}

// Contract addresses for scripts
export const addresses = {
  Shard: SHARD_CONTRACT_ADDRESS,
};