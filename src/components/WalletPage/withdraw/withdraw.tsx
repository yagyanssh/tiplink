import { ActionType } from '../actions'
import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { withdrawSol } from '@/services/walletService'
import { ChevronRight, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConnection } from '@solana/wallet-adapter-react'


interface WithdrawalOptionProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}

const WithdrawalOption: React.FC<WithdrawalOptionProps> = ({
  icon,
  title,
  description,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="flex items-center justify-between w-full p-4 text-left border rounded-lg mb-2 hover:bg-gray-50"
  >
    <div className="flex items-center">
      {icon}
      <div className="ml-3">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
    <ChevronRight className="text-gray-400" />
  </button>
)

interface WalletWithdrawalFormProps {
  onCancel: () => void
}

const WalletWithdrawalForm: React.FC<WalletWithdrawalFormProps> = ({
  onCancel,
}) => {
  const [amount, setAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null);
  const { publicKey } = useWallet()
  // const { connection } = useConnection()

  const handleWithdraw = async () => {
    if (!publicKey) {
      setError('Wallet not connected')
      return
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a vaild amount')
      return
    }
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const signature = await withdrawSol(publicKey, amountNum)
      console.log('Withraw Successful:', signature)
      setSuccess(`Withdrawal successful! Transaction Signature: ${signature}`);
    } catch (error) {
      console.log('Withdrawal Failed:', error)
      setError('Withdrawl failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Withdraw to Wallet</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Asset</label>
        <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option>SOL</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Amount
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="SOL"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-md text-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-4 flex space-x-2">
            <button className="bg-gray-100 text-gray-600 px-2 rounded-full">
              Max
            </button>
            <button className="bg-gray-100 text-gray-600 p-2 rounded-full">
              ↕
            </button>
          </div>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          onClick={handleWithdraw}
          disabled={isLoading}
          type="submit"
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          {isLoading ? 'Processing...' : 'Confirm Withdraw'}
        </button>
      </div>
    </div>
  )
}

// Main Component
type WithdrawalOption = 'none' | 'wallet' | 'bank' | 'gift'

interface WithdrawalComponentProps {
  setCurrent: (action: ActionType | null) => void
}

const WithdrawalComponent: React.FC<WithdrawalComponentProps> = ({
  setCurrent,
}) => {
  const [selectedOption, setSelectedOption] = useState<WithdrawalOption>('none')

  const renderContent = () => {
    switch (selectedOption) {
      case 'wallet':
        return (
          <WalletWithdrawalForm onCancel={() => setSelectedOption('none')} />
        )
      case 'none':
      default:
        return (
          <>
            <h2 className="text-xl font-semibold mb-4">Withdraw</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select destination for withdrawal:
            </p>

            <WithdrawalOption
              icon={<span className="text-gray-400">🏦</span>}
              title="To Bank Account"
              description="Withdraw to a bank account you specify (US and Europe only)."
              onClick={() => setSelectedOption('bank')}
            />

            <WithdrawalOption
              icon={<span className="text-gray-400">🎁</span>}
              title="Gift Card"
              description="Buy gift cards from various brands with crypto!"
              onClick={() => setSelectedOption('gift')}
            />

            <WithdrawalOption
              icon={<Wallet className="text-gray-400" />}
              title="To Connected Wallet"
              description="Assets will be sent to the connected wallet."
              onClick={() => setSelectedOption('wallet')}
            />
            <Button
              variant="outline"
              className="w-full hover:bg-blue-400/10"
              onClick={() => setCurrent(null)}
            >
              Cancel
            </Button>
          </>
        )
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
      {renderContent()}
    </div>
  )
}

export default WithdrawalComponent
