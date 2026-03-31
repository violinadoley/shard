import { fcl } from "./flow";

export interface WalletState {
  connected: boolean;
  addr: string | null;
  cid: string | null;
  loggedIn: boolean;
}

export function initWallet() {
  fcl.currentUser().subscribe((user: any) => {
    console.log("User changed:", user);
  });
}

export async function connectWallet() {
  await fcl.authenticate();
}

export async function disconnectWallet() {
  await fcl.unauthenticate();
}

export function getWalletAddress(): string | null {
  const snapshot = fcl.currentUser().snapshot();
  return snapshot.addr || null;
}

export function isLoggedIn(): boolean {
  const snapshot = fcl.currentUser().snapshot();
  return snapshot.loggedIn || false;
}