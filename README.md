# Parlay
# Parlay - P2P Betting on Solana with Farcaster Integration

Parlay is a decentralized peer-to-peer betting platform built on Solana, integrated with Farcaster for social features. Users can create bets, share them with friends through Farcaster, and settle them using Solana's fast and low-cost transactions.

## Features

- Create and accept bets using Solana
- Share bets through Farcaster Frames
- Social betting with friends
- Real-time updates and notifications
- User-friendly interface with Solana wallet integration

## Prerequisites

- Node.js 18+
- Solana CLI tools
- Farcaster account
- Solana wallet (Phantom, Solflare, etc.)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create .env.local file
cp .env.example .env.local

# Add your environment variables
NEXT_PUBLIC_SOLANA_RPC_URL=your_solana_rpc_url
NEXT_PUBLIC_FARCASTER_HUB_URL=your_farcaster_hub_url
```

3. Set up Solana:
```bash
# Configure Solana for devnet
solana config set --url devnet

# Create a new wallet
solana-keygen new --no-bip39-passphrase
```

4. Run the development server:
```bash
npm run dev
```

## Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to your hosting platform of choice (Vercel recommended).

3. Deploy Solana program:
```bash
solana program deploy target/deploy/parlay_betting.so
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT
