'use server'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import prisma from '@/db'
import { User } from '@prisma/client'
import axios from 'axios'
import { pvtKeyEncryptionManager } from '@/actions/pvtKeyEncryptMgmt'
import base58 from 'bs58'
import { pvtKeyDecryptionManager } from '@/actions/pvtKeyDecryptMgmt'

const customRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || ''
const coinGeckoUrl = process.env.NEXT_PUBLIC_COIN_GECKO_API || ''

export async function createWallet(user: User) {
  const existingWallet = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      publicKey: true,
    },
  })
  if (!existingWallet?.publicKey) {
    try {
      const keypair = Keypair.generate()
      const publicKey = keypair.publicKey.toString()
      const privateKey = base58.encode(keypair.secretKey)
      await pvtKeyEncryptionManager(privateKey)
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          publicKey: publicKey,
        },
      })
      return publicKey
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error}`)
    }
  }
}

// reconstrucitng keypair from secret key as 1:1 mapping is maintained between secret key and keypair
export async function getKeypairFromSecretKey(secretKey: Uint8Array) {
  const keypair = Keypair.fromSecretKey(secretKey)
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey,
  }
}

export async function signTransaction(
  transaction: Transaction,
  secretKey: Uint8Array,
) {
  // we need to reconstruct the keypair from the secret key to sign the transaction only public key won't work
  const keypair = Keypair.fromSecretKey(secretKey)
  transaction.sign(keypair)
  return transaction
}

export async function convertSoltoUSD(sol: number) {
  if (!coinGeckoUrl) {
    console.error('RPC URL is not defined.')
    return
  }

  try {
    const res = await axios.get(coinGeckoUrl, {
      params: {
        ids: 'solana',
        vs_currencies: 'usd',
      },
    })
    const price = res?.data?.solana?.usd
    return (sol * price).toFixed(2)
  } catch (error) {
    console.error('Failed to fetch price:', error)
  }
}

export async function fetchUserBalance(publicKey?: string) {
  if (!customRpcUrl) {
    console.error('RPC URL is not defined.')
    return
  }

  try {
    const res = await axios.post(customRpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [`${publicKey}`],
    })
    const balance = res?.data?.result?.value
    const solBalance = balance / LAMPORTS_PER_SOL
    const usdBalance = await convertSoltoUSD(solBalance)
    return { usdBalance, solBalance }
  } catch (error) {
    console.error('Failed to fetch balance:', error)
  }
}

export async function withdrawSol(
  nativeWalPubKey: PublicKey,
  amount: number
) {
  const connection = new Connection(customRpcUrl, 'confirmed');
  try {
    const decryptedPvtKey = await pvtKeyDecryptionManager();
    const secretKeyUint8Array = base58.decode(decryptedPvtKey);
    const keypair = Keypair.fromSecretKey(secretKeyUint8Array);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: nativeWalPubKey,
        lamports: amount * LAMPORTS_PER_SOL,
      }),
    );
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;

    transaction.sign(keypair);
        
    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
    console.log('Transaction signature:', signature);
    return signature;
  } catch (error) {
    console.error('Error in withdrawSol function:', error);
    throw error;
  }
}