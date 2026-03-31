import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

const FLOW_NETWORK = "testnet";

fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "flow.network": FLOW_NETWORK,
  "app.detail.title": "Shard",
  "app.detail.icon": "https://avatars.githubusercontent.com/u/62306725?s=200&v=4",
  "0xFlowToken": "0x7e60df042a9c0868",
});

export { fcl, t };

export async function sendTransaction(code: string, args: any[] = []) {
  const transactionId = await fcl.send([
    fcl.transaction(code),
    fcl.args(args),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.payer(fcl.currentUser().authorization),
    fcl.authorizations([fcl.currentUser().authorization]),
    fcl.limit(9999),
  ]);

  const transaction = await fcl.tx(transactionId).onceSealed();
  return transaction;
}

export async function executeScript(code: string, args: any[] = []) {
  const result = await fcl.query({
    code: code,
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