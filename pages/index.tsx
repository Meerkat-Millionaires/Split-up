import { executeTransaction } from '@cardinal/staking'
import {
  Fanout,
  FanoutClient,
  FanoutMembershipVoucher,
  MembershipModel,
} from '@glasseaters/hydra-sdk'
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from '@solana/web3.js'
import { Header } from 'common/Header'
import { notify } from 'common/Notification'
import { tryPublicKey } from 'common/utils'
import { asWallet } from 'common/Wallets'
import type { NextPage } from 'next'
import Image from 'next/image'
import { useEnvironmentCtx } from 'providers/EnvironmentProvider'
import { HydraWalletInitParams, useHydraContext } from 'providers/HydraProvider'
import { useState } from 'react'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  const wallet = useWallet()
  const { connection } = useEnvironmentCtx()
  const { hydraWallet, createHydraWallet } = useHydraContext()

  const [walletName, setWalletName] = useState<undefined | string>(undefined)
  const [hydraWalletMembers, setHydraWalletMembers] = useState<
    { memberKey?: string; shares?: number }[]
  >([{ memberKey: undefined, shares: undefined }])

  const validateAndCreateWallet = async () => {
    try {
      if (!walletName) {
        throw 'Specify a wallet name'
      }
      if (walletName.includes(' ')) {
        throw 'Wallet name cannot contain spaces'
      }
      let shareSum = 0
      for (const member of hydraWalletMembers) {
        if (!member.memberKey) {
          throw 'Please specify all member public keys'
        }
        if (!member.shares) {
          throw 'Please specify all member shares'
        }
        const memberPubkey = tryPublicKey(member.memberKey)
        if (!memberPubkey) {
          throw 'Invalid member public key, unable to cast to PublicKey'
        }
        shareSum += member.shares
      }
      if (shareSum !== 100) {
        throw 'Sum of all shares must equal 100'
      }
      if (!hydraWalletMembers || hydraWalletMembers.length == 0) {
        throw 'Please specify at least one member'
      }

      const params: HydraWalletInitParams = {
        walletName,
        members: [
          ...hydraWalletMembers.map((member) => ({
            publicKey: tryPublicKey(member.memberKey)!,
            shares: member.shares!,
          })),
        ],
      }

      await createHydraWallet(params)
    } catch (e) {
      notify({ message: `Error creating hydra wallet: ${e}`, type: 'error' })
    }
  }

  return (
    <div className="bg-white">
      <Header />

      <main className={styles.main}>
        {hydraWallet && (
          <div className="text-gray-700 bg-green-300 w-full max-w-lg text-center py-3 mb-10">
            <p className="font-bold uppercase tracking-wide">
              Hydra Wallet Created
            </p>
            <p>
              {' '}
              Access the wallet at{' '}
              <a href={`/wallet/${hydraWallet.walletName}`}>
                localhost:3000/
                {hydraWallet ? hydraWallet.walletName : null}
              </a>
            </p>
          </div>
        )}
        <form className="w-full max-w-lg">
          <div className="w-full mb-6">
            <label
              className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
              htmlFor="grid-first-name"
            >
              Hydra Wallet Name
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
              id="grid-first-name"
              type="text"
              placeholder="cardinal-wallet"
              onChange={(e) => {
                setWalletName(e.target.value)
              }}
              value={walletName}
            />
          </div>
          <div className="flex flex-wrap mb-6">
            <div className="w-full md:w-4/5 pr-3 mb-6 md:mb-0">
              <label
                className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                htmlFor="grid-first-name"
              >
                Wallet Address
              </label>
              {hydraWalletMembers.map((member, i) => {
                return (
                  <input
                    key={i}
                    className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                    id="grid-first-name"
                    type="text"
                    placeholder="Cmw...4xW"
                    onChange={(e) => {
                      const walletMembers = hydraWalletMembers
                      walletMembers[i]!.memberKey = e.target.value
                      setHydraWalletMembers(walletMembers)
                    }}
                    value={member.memberKey}
                  />
                )
              })}
            </div>
            <div className="w-full md:w-1/5">
              <label
                className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2"
                htmlFor="grid-first-name"
              >
                Shares / 100
              </label>
              {hydraWalletMembers.map((member, i) => {
                return (
                  <div className="flex flex-row" key={i}>
                    <input
                      className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                      id="grid-last-name"
                      type="text"
                      placeholder="10"
                      onChange={(e) => {
                        const walletMembers = hydraWalletMembers
                        walletMembers[i]!.shares = parseInt(e.target.value)
                        setHydraWalletMembers(walletMembers)
                      }}
                      value={member.shares}
                    />
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex justify-between">
            <div>
              <button
                type="button"
                className="bg-gray-200 text-gray-600 hover:bg-gray-300 px-4 py-3 rounded-md mr-3"
                onClick={() =>
                  setHydraWalletMembers([
                    ...hydraWalletMembers,
                    {
                      memberKey: undefined,
                      shares: undefined,
                    },
                  ])
                }
              >
                Add Member
              </button>
              <button
                type="button"
                className="bg-gray-200 text-gray-600 hover:bg-gray-300 px-4 py-3 rounded-md "
                onClick={() =>
                  setHydraWalletMembers(
                    hydraWalletMembers.filter(
                      (item, index) => index !== hydraWalletMembers.length - 1
                    )
                  )
                }
              >
                Remove Member
              </button>
            </div>
            <div>
              <button
                type="button"
                className="bg-blue-400 text-white hover:bg-blue-500 px-4 py-3 rounded-md "
                onClick={() => validateAndCreateWallet()}
              >
                Create Hydra Wallet
              </button>
            </div>
          </div>
        </form>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  )
}

export default Home
