# 🏠 Shield Stake Estate

> **Privacy-Preserving Real Estate Investment Platform powered by FHE (Fully Homomorphic Encryption)**

A decentralized property investment platform where users can stake in real estate properties with complete privacy. Investment amounts are encrypted on-chain using Zama's FHEVM technology, ensuring only the investor can view their stake.

## 🎬 Demo

### Live Demo
🌐 **[https://shield-stake-estate.vercel.app/](https://shield-stake-estate.vercel.app/)**

### Video Demo
📹 Watch the demo video: [demo.mp4](./demo.mp4)

![Shield Stake Estate](./demo.mp4)

## ✨ Features

### 🔐 Privacy-First Investment
- **Encrypted Stakes**: All investment amounts encrypted using FHE
- **Owner-Only Decryption**: Only you can view your investment amounts
- **On-Chain Privacy**: Encrypted data stored directly on blockchain

### 🌐 Multi-Network Support
- **Hardhat Local Network**: Fast development and testing
- **Sepolia Testnet**: Real blockchain environment testing
- **Easy Network Switching**: One-click network switching via RainbowKit

### 💼 Property Management
- **Browse Properties**: View available real estate investment opportunities
- **Property Details**: Location, target amount, ROI, current funding
- **Real-Time Updates**: Live funding progress tracking
- **Create Properties**: Admin can add new investment opportunities

### 🔗 Wallet Integration
- **RainbowKit Integration**: Beautiful wallet connection UI
- **MetaMask Support**: Seamless MetaMask integration
- **Multi-Wallet**: Support for various Web3 wallets
- **Network Detection**: Automatic network detection and switching

## 🏗️ Architecture

### Smart Contracts
- **PropertyStaking.sol**: Main contract with FHE encryption
  - Create properties with encrypted parameters
  - Stake with encrypted amounts
  - View encrypted stakes with decryption
  - Signature-based authorization
  - Nonce-based replay protection

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **RainbowKit**: Wallet connection and network switching
- **Wagmi**: React hooks for Ethereum
- **TailwindCSS**: Utility-first styling
- **shadcn/ui**: Beautiful UI components
- **Zama FHE SDK**: Encryption/decryption library

### Technology Stack
```
┌─────────────────────────────────────────────┐
│           Frontend (Next.js)                │
│  ┌──────────────────────────────────────┐   │
│  │  RainbowKit + Wagmi + Zama FHE SDK   │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────┐
│        Blockchain (Ethereum/Sepolia)        │
│  ┌──────────────────────────────────────┐   │
│  │   PropertyStaking.sol (FHE-enabled)  │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/DickTrevelyan/shield-stake-estate.git
cd shield-stake-estate
```

2. **Install dependencies**
```bash
# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

3. **Set up environment variables**

**Backend (.env)**
```bash
SEPOLIA_PRIVATE_KEY=your_private_key_here
LOCAL_PRIVATE_KEY=0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/8f7d90378a814251afabcf6425269276
INFURA_API_KEY=8f7d90378a814251afabcf6425269276
```

**Frontend (.env.local)**
```bash
NEXT_PUBLIC_LOCAL_RPC_URL=http://localhost:8545
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/8f7d90378a814251afabcf6425269276
```

### Development

#### 1. Start Local Hardhat Node
```bash
# Terminal 1
npx hardhat node
```

#### 2. Deploy Contracts
```bash
# Terminal 2 - Deploy to local network
npx hardhat run deploy/deployPropertyStaking.ts --network localhost

# Or deploy to Sepolia
npx hardhat run deploy/deployPropertyStaking.ts --network sepolia
```

#### 3. Start Frontend
```bash
# Terminal 3
cd frontend
npm run dev
```

#### 4. Open Application
Navigate to `http://localhost:3000`

### MetaMask Setup

#### Add Hardhat Local Network
- **Network Name**: Hardhat Local
- **RPC URL**: http://localhost:8545
- **Chain ID**: 31337
- **Currency Symbol**: ETH

#### Add Sepolia Testnet
- **Network Name**: Sepolia
- **RPC URL**: https://rpc.sepolia.org
- **Chain ID**: 11155111
- **Currency Symbol**: ETH
- **Block Explorer**: https://sepolia.etherscan.io

## 📖 User Guide

### For Investors

#### 1. Connect Wallet
- Click "Connect Wallet" button in the header
- Select your wallet (MetaMask recommended)
- Approve the connection

#### 2. Select Network
- Click the network indicator in the wallet button
- Choose between Hardhat Local or Sepolia
- Approve network switch in MetaMask

#### 3. Browse Properties
- Scroll through available properties
- View details: location, target amount, ROI, funding progress

#### 4. Invest in Property
- Click "Invest" on desired property
- Enter investment amount in ETH
- Sign the transaction in MetaMask
- Your investment amount is encrypted and stored on-chain

#### 5. View Your Stakes
- Click "View My Stake" on any property you've invested in
- Sign the decryption authorization message
- View your decrypted investment amount
- Only you can see this information!

### For Property Owners

#### 1. Create New Property
- Click "Create Property" button
- Fill in property details:
  - Name
  - Location
  - Image URL
  - Target Amount
  - Expected ROI
- Sign the transaction
- Property appears in the grid

## 🔒 Security Features

### Encryption
- **FHE (Fully Homomorphic Encryption)**: Zama's FHEVM technology
- **On-Chain Encryption**: Data encrypted before blockchain submission
- **Private by Default**: Investment amounts never exposed

### Authorization
- **Wallet Signatures**: All sensitive operations require signatures
- **Nonce Protection**: Replay attack prevention
- **Owner-Only Access**: Only stake owner can decrypt their data

### Smart Contract Security
- **OpenZeppelin Libraries**: Industry-standard security
- **Access Control**: Role-based permissions
- **Input Validation**: Comprehensive parameter checking
- **Event Logging**: Complete audit trail

## 🧪 Testing

### Run Contract Tests
```bash
# Test on local network
npx hardhat test

# Test on Sepolia
npx hardhat test --network sepolia

# Generate coverage report
npx hardhat coverage
```

### Test Scenarios
- ✅ Property creation with signature verification
- ✅ Encrypted staking with FHE
- ✅ Stake decryption authorization
- ✅ Nonce replay protection
- ✅ Multi-user stake management
- ✅ Network switching functionality

## 📁 Project Structure

```
shield-stake-estate/
├── contracts/
│   ├── PropertyStaking.sol      # Main FHE-enabled contract
│   └── FHECounter.sol           # Example counter contract
├── deploy/
│   ├── deploy.ts                # FHECounter deployment
│   └── deployPropertyStaking.ts # PropertyStaking deployment
├── test/
│   ├── PropertyStaking.ts       # Local network tests
│   └── PropertyStakingSepolia.ts # Sepolia tests
├── tasks/
│   ├── accounts.ts              # Account management
│   └── PropertyStaking.ts       # Contract interaction tasks
├── frontend/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page
│   │   └── providers.tsx        # Wagmi + RainbowKit setup
│   ├── components/
│   │   ├── Header.tsx           # Navigation with wallet button
│   │   ├── Hero.tsx             # Landing section
│   │   ├── PropertyCard.tsx     # Property display card
│   │   ├── PropertyGrid.tsx     # Properties list
│   │   ├── InvestModal.tsx      # Investment interface
│   │   ├── ViewStakeModal.tsx   # Stake viewing/decryption
│   │   ├── CreatePropertyModal.tsx # Property creation
│   │   └── TransactionHistory.tsx  # Transaction log
│   ├── hooks/
│   │   ├── usePropertyStaking.tsx  # Contract interactions
│   │   └── useFhevmProvider.tsx    # FHE provider
│   ├── fhevm/
│   │   ├── useFhevm.tsx         # FHE React hooks
│   │   └── fhevmTypes.ts        # FHE type definitions
│   ├── lib/
│   │   ├── encryption.ts        # Encryption utilities
│   │   └── utils.ts             # Helper functions
│   └── abi/
│       ├── PropertyStakingABI.ts    # Contract ABI
│       └── PropertyStakingAddresses.ts # Deployed addresses
├── hardhat.config.ts            # Hardhat configuration
├── package.json                 # Dependencies
└── README.md                    # This file
```

## 🛠️ Available Scripts

### Contract Scripts
```bash
npm run compile      # Compile contracts
npm run test         # Run tests
npm run coverage     # Generate coverage
npm run lint         # Lint contracts
npm run clean        # Clean artifacts
```

### Frontend Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Lint code
npm run genabi       # Generate ABI files
```

## 🌍 Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git push origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Set root directory to `frontend`
- Add environment variables:
  - `NEXT_PUBLIC_SEPOLIA_RPC_URL`
  - `NEXT_PUBLIC_LOCAL_RPC_URL`

3. **Deploy**
- Click "Deploy"
- Your app will be live at `https://your-app.vercel.app`

### Deploy Contracts to Sepolia

```bash
# Deploy
npx hardhat run deploy/deployPropertyStaking.ts --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Zama**: For the amazing FHEVM technology
- **RainbowKit**: For the beautiful wallet connection UI
- **Wagmi**: For the excellent React hooks
- **Next.js**: For the powerful React framework
- **Vercel**: For seamless deployment

## 📞 Support

- **Live Demo**: [https://shield-stake-estate.vercel.app/](https://shield-stake-estate.vercel.app/)
- **GitHub Issues**: [Report bugs or request features](https://github.com/DickTrevelyan/shield-stake-estate/issues)
- **Zama Documentation**: [FHEVM Docs](https://docs.zama.ai)
- **Zama Discord**: [Join the community](https://discord.gg/zama)

## 🔗 Links

- **Live Application**: https://shield-stake-estate.vercel.app/
- **GitHub Repository**: https://github.com/DickTrevelyan/shield-stake-estate
- **Zama FHEVM**: https://docs.zama.ai/fhevm
- **RainbowKit**: https://www.rainbowkit.com/
- **Wagmi**: https://wagmi.sh/

## 📈 Performance Optimizations

### Smart Contract Optimizations
- **Gas Efficiency**: Custom errors instead of require() strings for reduced gas costs
- **Storage Layout**: Optimized struct packing to minimize storage slots
- **Batch Operations**: Added batch functions for multiple property checks
- **View Functions**: Optimized read-only functions for better performance

### Frontend Optimizations
- **Bundle Splitting**: Webpack splitChunks configuration for optimal loading
- **Image Optimization**: WebP/AVIF format support with responsive sizing
- **Code Splitting**: Vendor and common chunk separation
- **Compression**: Gzip compression and SWC minification enabled

### Recent Updates (v1.2.0)
- ✅ Enhanced form validation with real-time error feedback
- ✅ Improved mobile responsiveness across all components
- ✅ Added comprehensive loading states and user feedback
- ✅ Optimized contract storage layout for gas efficiency
- ✅ Enhanced error messages with detailed parameters
- ✅ Added batch operations for reduced transaction costs
- ✅ Improved frontend bundle size and loading performance

---

**Built with ❤️ using Zama FHEVM, Next.js, and RainbowKit**

🔐 **Privacy-Preserving • Decentralized • Secure**
