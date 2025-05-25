'use client'

import React from 'react'
import CreateBet from '@/components/CreateBet'

export default function Home() {
  const handleBetCreated = (betId: string) => {
    console.log('Bet created:', betId)
    // TODO: Implement bet sharing functionality
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Parlay
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Create or accept P2P bets on sports matches. Use Parlay Points to place your bets and win more points!
        </p>
      </div>

      <CreateBet onBetCreated={handleBetCreated} />
    </div>
  )
} 
