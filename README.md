# SeQureChain

**Blockchain-Based Evidence Management System — A Decentralized Application (DApp)**

SeQureChain replaces centralized digital evidence management with a decentralized, cryptographically verifiable architecture. It anchors evidence file hashes on the Ethereum Sepolia blockchain, stores files on IPFS via Pinata, and authenticates users through MetaMask wallet signatures instead of passwords — removing single points of failure, insider tampering risk, and weak authentication from the evidence chain of custody.

> Final Year Project — BSCS, Computer Science

---

## Table of Contents

- [Abstract](#abstract)
- [Background and Motivation](#background-and-motivation)
- [Problem Statement](#problem-statement)
- [Project Objectives](#project-objectives)
- [Scope](#scope)
- [Literature Review](#literature-review)
- [Comparative Analysis](#comparative-analysis)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [System Design (UML Overview)](#system-design-uml-overview)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Smart Contract](#smart-contract)
- [Development Methodology](#development-methodology)
- [Testing Summary](#testing-summary)
- [Results: Objective Achievement](#results-objective-achievement)
- [Security Model](#security-model)
- [Known Limitations](#known-limitations)
- [Future Work](#future-work)
- [References](#references)
- [License](#license)

---

## Abstract

Digital evidence is foundational to criminal justice, and any corruption, manipulation, or inaccessibility can be irreparable, resulting in wrongful acquittal or conviction. The core structural weakness of traditional evidence management systems is centralization: a compromised server, a rogue insider, or compromised credentials can put an entire repository's integrity at risk — a vulnerability repeatedly demonstrated in real-world cases.

SeQureChain is a blockchain-based digital evidence management system (BBEMS), built as a decentralized application (DApp), designed to eliminate these vulnerabilities through cryptographic assurance and distributed architecture. It combines four technologies for layered, mathematically verifiable security:

- **IPFS (via Pinata Cloud)** — decentralized, content-addressed file storage, where any data modification is immediately detectable via a changed hash
- **Ethereum Sepolia + `EvidenceManager.sol`** — immutable on-chain storage of evidence hashes
- **MetaMask** — secure user authentication and digital signing
- **React Native + Expo** — a single codebase supporting web, Android, and iOS

The system was tested across 50 end-to-end evidence submission sessions with varied file types and sizes, achieving a 100% blockchain confirmation rate, an average upload time of ~22 seconds, and a 100% success rate detecting tampering across 20 simulated attack scenarios. These results demonstrate that production-grade, secure blockchain evidence management is achievable at the undergraduate level, and that the constraints of centralized systems can be overcome through careful decentralized design.

## Background and Motivation

Law enforcement agencies handle large volumes of evidence annually, often using systems that vary by city/region and rely on insecure transfer methods — USB drives, email, unsecured networks, or manual handling. This creates real courtroom consequences: defense counsel routinely challenge evidence handling, sometimes resulting in cases being dismissed entirely.

This is not isolated to one country. Police databases worldwide have been hit by ransomware; insiders have tampered with evidence; people have been wrongly convicted due to evidence mishandling. These patterns point to a structural problem with how digital evidence is managed — one that calls for a system that is secure, transparent, and decentralized by design.

## Problem Statement

Existing digital evidence management systems are centralized and depend on trust in individuals and passwords — a form of trust that cannot be mathematically verified. This creates five core weaknesses:

| ID | Problem | Description |
|---|---|---|
| **P1** | Single Point of Failure | A compromised or destroyed central server can take down all stored evidence. A 2020 ransomware attack on the City of Torrance, California police department encrypted evidence files from 47 cases. |
| **P2** | Mutable Records and Insider Threats | Administrators can alter evidence and logs without detection. A 2021 National Institute of Justice study found insider threats caused ~23% of security incidents in law enforcement IT systems — higher than other sectors. |
| **P3** | Authentication Cannot Prove Individual Identity | Shared/reused/phished passwords make it impossible to prove which officer submitted evidence — a common point of legal challenge. |
| **P4** | No Way to Prove Files Are Not Changed | Hashes stored in the same system as the files they verify can be altered together by anyone with system access, defeating their purpose. |
| **P5** | Gaps in the Chain of Evidence | Evidence passes through many hands (officer → station → lab → court). Manual, paper/email-based tracking creates loopholes and opportunities for loss or intentional distortion. |

### Formal Problem Statement

What a court perceives as evidence may not faithfully represent what was discovered at the scene, for two root reasons: (1) centralized systems make tampering easy, and (2) the architecture requires blind trust in whoever maintains the records — trust that cannot be independently verified. SeQureChain addresses both by removing single-location storage (via IPFS) and single-location hash records (via Ethereum), making evidence integrity publicly verifiable by anyone, with no single party — prosecution or defense — in control.

## Project Objectives

| Objective | Addresses | Mechanism | Success Criterion |
|---|---|---|---|
| **OBJ-1**: DApp Implementation | P1, P4 | React Native, Hardhat, Solidity | Fully functional DApp across web, Android, iOS |
| **OBJ-2**: IPFS Decentralized Storage | P1, P4 | Pinata Cloud, CIDv1 | All files pinned with valid, retrievable CID |
| **OBJ-3**: On-Chain Hash Recording | P2, P4 | `EvidenceManager.sol`, Sepolia | 100% of hashes recorded as confirmed, verifiable transactions |
| **OBJ-4**: ECDSA Authentication | P3 | MetaMask, `window.ethereum` | Authentication exclusively via wallet signatures; zero password-based access |
| **OBJ-5**: Cross-Platform Frontend | P1, Usability | Expo SDK 50 | Consistent functionality across Chrome, Android, iOS |
| **OBJ-6**: Integrity Verification | P4, P5 | SHA-256 hashing, blockchain query | 100% accuracy detecting tampered files |
| **OBJ-7**: Role-Based Access Control | Governance | AppContext, Firebase roles | Six roles enforced, no privilege escalation |
| **OBJ-8**: Live Dashboard | Usability | Firebase real-time DB, charts | Stats update dynamically without manual refresh |
| **OBJ-9**: Chain-of-Custody Tracking | P5 | Blockchain transaction history | Complete, immutable audit trail per evidence item |
| **OBJ-10**: Performance Optimization | Usability | Async upload, tx polling | End-to-end upload/confirmation under 60 seconds for ≤100MB files |

## Scope

### In Scope
- Uploading, IPFS storage, retrieval, and SHA-256 verification of evidence files
- On-chain hash recording via `EvidenceManager.sol` on Ethereum Sepolia
- MetaMask wallet authentication (no username/password)
- Role-based access control for law enforcement users
- Cross-platform support (web, Android, iOS via Expo)
- Real-time dashboard (recent uploads, 14-day activity)
- Full blockchain-backed action history for every piece of evidence

### Out of Scope
- Ethereum mainnet deployment (Sepolia testnet only, for demonstration)
- Integration with existing government/law enforcement databases
- AI/ML-based evidence analysis
- End-to-end file encryption (access is gateway-controlled via IPFS, not encrypted)
- Live evidence ingestion or real-time location tracking

## Literature Review

**Blockchain in digital forensics:** Lone and Mir (2019) proposed a Hyperledger Composer-based evidence tracking framework, showing blockchain consensus provides a form of trust no single organization can offer alone. Brotsis et al. (2019) compared Ethereum, Hyperledger, and IOTA for forensic suitability, finding public blockchains like Ethereum better support independent verifiability — a key reason SeQureChain chose a public chain over a private one. Kim, Ihm, and Son (2021) proposed separating frequently-changing data from immutable data in a two-level blockchain system, an idea reflected in SeQureChain's split between mutable metadata (Firestore) and immutable evidence records (Ethereum). Al-Shaikhli et al. (2023) found blockchain-based evidence tracking reduced courtroom evidence challenges by 78% compared to traditional documentation.

**IPFS for decentralized storage:** Benet (2014) introduced IPFS's content-addressing model, where a file's identifier (CID) is derived from its actual content — any modification changes the CID. Nizamuddin et al. (2019) demonstrated combining IPFS with Ethereum to create tamper-evident document systems, the same combination SeQureChain relies on: IPFS ensures retrieved files match what was stored, while Ethereum ensures the CID itself cannot be altered after being recorded.

**Documented failures of centralized systems:** Commercial evidence management systems (JEMS, Axon Evidence, IBM OpenPages) use SQL-based centralized architectures and have suffered real breaches. A 2020 ransomware wave hit twelve U.S. police agencies, compromising over half a million files and 200 cases at the Torrance Police Department, and leaving the Santa Clara County District Attorney's office without evidence system access for six weeks — directly disrupting prosecutions.

## Comparative Analysis

| Dimension | Traditional CEMS | Permissioned Blockchain Systems | SeQureChain (BBEMS) |
|---|---|---|---|
| Storage Architecture | Centralized SQL server | Distributed, org-controlled | IPFS-based, fully decentralized P2P |
| Tamper Detection | Mutable audit logs | Consensus-based resistance | SHA-256 hashes anchored on public Ethereum |
| Authentication | Username/password | Certificate-based | MetaMask wallet + ECDSA signatures |
| Independent Verification | Not possible without central access | Restricted to consortium | Publicly verifiable via blockchain explorers |
| Chain-of-Custody | Manual documentation | Automated, network-restricted | Fully automated, transparent transaction history |
| Insider Modification Risk | High | Moderate | Minimal — records immutable post-confirmation |
| Breach Impact | Total evidence loss possible | Partial, consortium-scoped | Hashes remain secure and verifiable regardless |
| Non-Repudiation | Weak | Moderate | Strong — ECDSA (secp256k1) signatures |
| Infrastructure Cost | High | Moderate | Low — gas fees + IPFS pinning only |

## Key Features

- **Wallet-based authentication** — MetaMask + ECDSA signatures, no passwords stored or transmitted
- **Decentralized file storage** — IPFS via Pinata Cloud, content-addressed (CIDv1)
- **Immutable hash anchoring** — SHA-256 file hashes recorded on Ethereum Sepolia via `EvidenceManager.sol`
- **Independent tamper detection** — any party can re-hash a file and compare it against the on-chain record, with no need to trust the evidence custodian
- **Full chain-of-custody** — every upload and amendment is a timestamped blockchain transaction
- **Role-based access control** — six predefined law-enforcement roles enforced at the application layer
- **Cross-platform** — single React Native + Expo codebase for Web, Android, and iOS
- **Live dashboard** — real-time upload statistics and 14-day activity visualization

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React Native (Expo SDK 50) | Single codebase for web, Android, iOS — eliminates platform-specific duplication |
| State Management | React Context API | Lightweight, no extra dependencies, fits the app's scale |
| Backend | Node.js v20 LTS + Express | Non-blocking I/O for concurrent uploads; mature ecosystem |
| Database | Firebase Firestore | Real-time, scalable, minimal configuration |
| File Storage | Pinata Cloud (IPFS) | Managed pinning, high availability, CIDv1 support |
| Blockchain Network | Ethereum Sepolia (Chain ID 11155111) | Public testnet replicating mainnet behavior at no cost |
| Smart Contract | Solidity v0.8.20 | Widely adopted, strong tooling, built-in safety features |
| Wallet Integration | MetaMask v11.x | Industry standard, EIP-1193 support, secure ECDSA signing |
| RPC Provider | Alchemy (Sepolia, free tier) | Reliable blockchain access without exposing private keys |
| Contract Tooling | Hardhat v2.22.x | Local testing, debugging, and deployment environment |
| Blockchain Library | ethers.js v6 | Provider integration and ABI encoding |
| Testing | Jest + manual testing | Combines automated unit tests with end-to-end validation |

## System Architecture

```
User → MetaMask (signs transaction) → Ethereum Sepolia (immutable hash record)
User → Frontend → Backend → Pinata IPFS (file storage, returns CID)
Backend → Firebase Firestore (metadata only — read/write, never the blockchain)
```

SeQureChain is organized into four layers: a **presentation layer** (React Native + Expo client), an **application layer** (Node.js/Express backend), a **blockchain layer** (Ethereum Sepolia + `EvidenceManager.sol`), and a **storage layer** (Pinata IPFS + Firebase). The critical design rule: **the backend has read-only access to the blockchain.** All state-changing transactions are signed client-side by the user's own MetaMask wallet, and the officer's ECDSA private key never leaves MetaMask.

This means that even if the Node.js server were fully compromised, an attacker could not forge a blockchain transaction on an officer's behalf — the server can only *read* the blockchain, never write to it. Only a user-signed MetaMask transaction can ever change on-chain state.

### The Four-Step Upload Protocol

| Step | Operation | Component Interaction | Security Property |
|---|---|---|---|
| 1 | IPFS Upload | Frontend → Backend → Pinata | Content addressing ensures tamper-evidence; any file modification produces a different CID |
| 2 | Metadata Persistence | Backend → Firestore | Establishes an operational record prior to blockchain anchoring |
| 3 | Blockchain Transaction | Frontend → MetaMask → Sepolia | ECDSA-based signing ensures non-repudiation; private key stays in the wallet |
| 4 | Transaction Confirmation | Frontend → Alchemy → Firestore | On-chain validation ensures immutability and finality of the recorded hash |

The protocol is deliberately ordered so that all data is safely persisted *before* the user is asked to approve a blockchain transaction — if the user rejects the MetaMask prompt, no data is lost.

## System Design (UML Overview)

The full design includes nine UML diagrams (use case, ER, activity, sequence, component, state machine, class, data flow, and database schema) covering the complete evidence lifecycle. Summary of key design elements:

- **Use Case Diagram** — two actor types: `User` (Officer/Admin/Evidence Officer) with full upload/amend/verify capability, and `Judge/Lawyer` with read-only access. Eight primary use cases: Connect Wallet, Upload Evidence, Add Amendment, View Evidence List, Search by CID, View & Download Evidence, View Evidence History, and Integrity Verification.
- **Entity Relationship Diagram** — 8 core entities: `Users`, `Wallet`, `Evidence`, `Amendment`, `IPFS_Storage`, `Blockchain_Record`, `Audit_Log`, `SmartContract`.
- **Activity Diagram** — full user journey from app launch through MetaMask authentication, registration check, dashboard, evidence entry, IPFS upload, Firebase save, MetaMask transaction approval, and Sepolia confirmation — including explicit failure/error branches at each step.
- **Sequence Diagram** — 28 messages across User, Frontend, Backend, Pinata IPFS, Firestore, MetaMask, and Ethereum Sepolia for a single upload. Notably, MetaMask signing and submission (messages 15–19) happen directly between the frontend and MetaMask/Ethereum — the backend is not involved in this exchange.
- **Component Diagram** — three subsystems: Frontend (9 components: AppContext, LandingScreen, UploadEvidence, Dashboard, EvidenceHistory/Browse, Settings/Integrity, Theme/Utils, Header/Drawer, ExpoModules), Backend (6 components: server.js, evidence/ipfs/users/blockchain routes, database.js), and External Services (9: MetaMask, Pinata, Alchemy, Firebase, Ethereum Sepolia, EvidenceManager.sol/Hardhat, ethers.js, multer).
- **State Machine Diagram** — evidence records progress through 10 states from `NOT CONNECTED` through `CONNECTING`, `WALLET CONNECTED`, `AUTHENTICATED`, `UPLOADING`, `AWAITING METAMASK TX`, `TX PENDING`, to a final `CONFIRMED` state that is permanent and cannot be changed.
- **Class Diagram** — 9 classes: `User` (entity), `Wallet` (boundary), `Evidence` (entity), `Amendment` (entity), `IPFSStorage` (service), `BlockchainRecord` (entity), `EvidenceManager` (contract), `AuditLog` (entity), `AppContext` (controller).
- **Data Flow Diagram (Level 1)** — 10 processes (Auth, Upload Evidence, Hash & IPFS Upload, Blockchain Record, Sign TX, Save Metadata, Verify, Retrieve, Chain of Custody, Search/Filter) across 4 data stores (Firestore, Ethereum Sepolia, IPFS Pinata, Audit Log).
- **Database Schema** — 7 persisted data structures: `users`, `evidence`, `amendments`, `blockchain_records`, `ipfs_files`, `EvidenceRecord` (on-chain), `audit_logs`.

## Repository Structure

```
SequreChainDapp/
├── frontend/              # React Native + Expo app (web, Android, iOS)
├── backend/                # Node.js + Express REST API
├── contracts/               # EvidenceManager.sol smart contract source
├── scripts/                 # Hardhat deployment scripts
├── hardhat.config.js        # Hardhat configuration
├── package.json              # Root dependencies (Hardhat/contracts)
├── .env.example              # Template for root/contract environment variables
├── .gitignore
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v20 LTS
- MetaMask browser extension
- Free accounts: [Pinata](https://pinata.cloud), [Firebase](https://firebase.google.com), [Alchemy](https://alchemy.com)
- Sepolia testnet ETH from a [faucet](https://sepoliafaucet.com)

### 1. Clone the repository

```bash
git clone https://github.com/hmzasaed/SequreChainDapp.git
cd SequreChainDapp
```

### 2. Smart Contract (root)

```bash
npm install
cp .env.example .env
# fill in SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY in .env
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

Note the deployed contract address printed in the terminal — you'll need it for both backend and frontend `.env` files.

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in Firebase, Pinata, Alchemy, and CONTRACT_ADDRESS values
npm start
```

### 4. Frontend

```bash
cd ../frontend
npm install
cp .env.example .env
# fill in EXPO_PUBLIC_API_URL, EXPO_PUBLIC_CONTRACT_ADDRESS, Firebase client config
npx expo start
```

Press `w` to open the web build, or scan the QR code with Expo Go on Android/iOS.

## Environment Variables

This project uses three separate `.env` files (root/contracts, `backend/`, `frontend/`). **None of the real `.env` files are committed to this repository** — only `.env.example` templates are tracked, since the real files contain live API keys and a deployer wallet private key.

To set up locally:

```bash
cp .env.example .env                    # root (Hardhat/contracts)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Then fill in each `.env` with your own credentials. See each `.env.example` file for the full list of required variables and where to obtain them.

⚠️ **Never commit a real `.env` file.** If a private key or API key is ever pushed to a public repo, treat it as compromised immediately — rotate/regenerate the key and, for a wallet private key, move any funds to a new wallet, since deleting the file afterward does not remove it from git history.

## Smart Contract

`EvidenceManager.sol` — deployed on Ethereum Sepolia (Chain ID `11155111`).

| Function | Visibility | Gas Cost | Description |
|---|---|---|---|
| `submitEvidence()` | external payable | ~80,000 gas | Records a new evidence entry on-chain; `msg.sender` is the submitting officer; emits `EvidenceSubmitted` |
| `getEvidenceReadOnly()` | view | 0 gas (off-chain call) | Retrieves all stored fields for a given evidence ID |
| `verifyIntegrity()` | view | 0 gas (off-chain call) | Compares a provided hash against the on-chain record; returns `true`/`false` |
| `evidenceExistsCheck()` | view | 0 gas (off-chain call) | Checks whether an evidence ID already exists, preventing duplicate submissions |
| `getEvidenceCount()` | view | 0 gas (off-chain call) | Returns the total number of evidence records on-chain |

## Development Methodology

SeQureChain was built using Agile (sprint-based) development across seven two-week sprints over roughly six months. Agile was chosen over waterfall for three reasons: (1) blockchain testnet development involves frequent external changes (gas prices, RPC providers, MetaMask API updates) that require quick adaptation, (2) the project integrates four external services (Ethereum, IPFS, Firebase, MetaMask), and an issue in any one often requires re-scoping other work, and (3) biweekly supervisor feedback kept technical work aligned with academic requirements.

| Sprint | Duration | Deliverable |
|---|---|---|
| 1 | Weeks 1–2 | Smart contract implementation, Hardhat compilation, Sepolia deployment |
| 2 | Weeks 3–4 | MetaMask-based authentication flow and session handling |
| 3 | Weeks 5–6 | IPFS integration via Pinata, SHA-256 hash computation |
| 4 | Weeks 7–8 | Firebase Firestore integration for metadata, CRUD operations |
| 5 | Weeks 9–12 | Cross-platform frontend (all primary screens, responsive design) |
| 6 | Weeks 13–16 | System integration testing, performance optimization, defect resolution |
| 7 | Weeks 17–18 | Documentation: SRS, final report |

## Testing Summary

### Performance Metrics

| Metric | Measured Value | Target | Status |
|---|---|---|---|
| IPFS Upload — 1 MB (PDF) | 4.2s avg (n=10) | ≤ 30s | PASS |
| IPFS Upload — 10 MB (MP4) | 11.8s avg (n=5) | ≤ 30s | PASS |
| IPFS Upload — 45 MB (MP4) | 28.4s avg (n=3) | ≤ 30s | PASS |
| MetaMask Signing Time | 2.1s avg | User-dependent | Acceptable |
| Blockchain Confirmation (Sepolia) | 14.6s avg (n=50) | ≤ 120s | PASS |
| End-to-End Upload Time | ~22s avg | ≤ 60s | PASS |
| Firebase Read Latency | < 200ms | ≤ 1000ms | PASS |
| Frontend Load Time (Web) | 3.1s | ≤ 5s | PASS |
| Integrity Verification Response | < 500ms | ≤ 2000ms | PASS |
| Concurrent Upload Handling (50 requests) | 50/50 successful, 0 failures | Zero failures | PASS |
| Tamper Detection Accuracy | 20/20 detected (100%) | 100% | PASS |
| Blockchain Confirmation Reliability | 50/50 confirmed (100%) | 100% | PASS |

### Integration Testing

End-to-end upload flows were validated across PDF, large video (45MB MP4), and structured JSON GPS data — all completed successfully with confirmed on-chain transactions. Integrity verification was tested against both unmodified files (correctly returned `true`) and deliberately tampered files (correctly returned `false` in all 20 cases), confirming the system reliably detects tampering without false negatives.

## Results: Objective Achievement

| Objective | Target | Status | Evidence |
|---|---|---|---|
| OBJ-1: DApp Implementation | Fully functional DApp | Achieved (100%) | 50/50 transactions confirmed on Sepolia |
| OBJ-2: IPFS Storage | Reliable decentralized storage | Achieved (100%) | 50/50 files pinned with valid CIDv1 |
| OBJ-3: On-Chain Hash Recording | Complete hash recording | Achieved (100%) | 50/50 hashes independently verified via explorer |
| OBJ-4: MetaMask Authentication | No password-based auth | Achieved (100%) | All sessions authenticated via wallet only |
| OBJ-5: Cross-Platform Compatibility | Web, Android, iOS | Achieved (100%) | Verified on Chrome, Android (Expo Go), iOS (Expo Go) |
| OBJ-6: Integrity Verification | Detect all tampered files | Achieved (100%) | 20/20 tampered files correctly identified |
| OBJ-7: Role-Based Access Control | Six roles enforced | Achieved (100%) | All roles tested with correct permission enforcement |
| OBJ-8: Live Dashboard | Real-time monitoring | Achieved (100%) | Dynamic stats, 14-day activity, no manual refresh needed |
| OBJ-9: Chain-of-Custody Tracking | Complete audit trail | Achieved (100%) | Full blockchain transaction history per record |
| OBJ-10: Performance Requirement | Under 60s end-to-end | Achieved (100%) | ~22s average across all test cases |

## Security Model

| Attack Vector | Traditional CEMS Vulnerability | SeQureChain Defense | Effectiveness |
|---|---|---|---|
| Evidence File Tampering | Undetectable due to mutable storage/logs | SHA-256 hash anchored on-chain; any change is a detectable mismatch | Critical |
| Credential/Key Compromise | Full access via stolen/shared credentials | Private keys remain client-side in MetaMask, never transmitted | Critical |
| Database Breach (Firestore) | Exposure of evidence + metadata | Only metadata stored off-chain; integrity preserved via blockchain hashes | High |
| Insider Modification | Unauthorized changes possible; logs alterable | Blockchain transactions immutable; `msg.sender` permanently records identity | Critical |
| Man-in-the-Middle | Data interception/modification in transit | HTTPS + ECDSA-signed transactions ensure integrity and authenticity | High |
| IPFS File Substitution | No mechanism to detect altered files | Content addressing — any change produces a different CID | Critical |
| Replay Attack | Duplicate submissions may be accepted | Ethereum nonce mechanism + contract-level `evidenceExistsCheck()` | High |
| Denial-of-Service | Centralized system fully unavailable | Decentralized architecture avoids single point of failure | Medium |
| Phishing / Malicious Tx Approval | Users unknowingly authorize malicious actions | MetaMask displays transaction details for user-side verification | Medium |

## Known Limitations

- Deployed on Ethereum **Sepolia testnet** only — mainnet deployment would currently cost real funds (~0.002 ETH per upload at time of testing); Layer-2 networks could reduce this 10–100x
- IPFS files are not end-to-end encrypted; access is controlled via the Pinata gateway, not cryptographic locking
- Mobile MetaMask login currently requires manually entering a wallet address rather than deep-linking, which WalletConnect v2 would resolve

## Future Work

1. **Layer-2 / Mainnet migration** — deploy to Polygon, Arbitrum, or Base to cut gas costs 10–100x while retaining Ethereum-level security; mainnet deployment would enable real law enforcement use
2. **WalletConnect v2 integration** — enable MetaMask deep-linking on Android/iOS, removing manual address entry
3. **Client-side AES-256 encryption** — encrypt evidence before IPFS upload so a Pinata account breach can't expose file contents
4. **Zero-knowledge integrity proofs** — ZK-SNARK verification to confirm a file matches its on-chain hash without revealing file contents, important for sensitive evidence
5. **AI anomaly detection** — machine learning models trained on access patterns to flag unusual access hours, bulk downloads, or unrecognized wallets as potential insider threats
6. **Cross-jurisdiction federation protocol** — enable multiple agencies to run SeQureChain with verifiable cross-chain evidence transfer for inter-jurisdictional and international investigations
7. **Hardware Security Module (HSM) support** — card-based evidence submission with X.509 certificate authentication for organizations unable to use browser-based wallets

## References

- J. Benet, "IPFS — Content Addressed, Versioned, P2P File System," arXiv:1407.3561, 2014
- S. Lone & R. Mir, "Forensic chain: Blockchain based digital forensics chain of custody with PoC in Hyperledger Composer," *Digital Investigation*, vol. 28, pp. 44–55, 2019
- S. Brotsis et al., "Blockchain solutions for forensic evidence preservation in IoT environments," *IEEE IFIP/IEEE NOMS*, Taipei, 2019
- N. Nizamuddin, K. Salah, M. A. Azad, J. Arshad, M. H. Rehman, "Decentralized document version control using Ethereum blockchain and IPFS," *Computers & Electrical Engineering*, vol. 76, pp. 183–197, 2019
- V. Buterin, "A Next-Generation Smart Contract and Decentralized Application Platform," Ethereum White Paper, 2014
- D. Kim, S.-Y. Ihm, Y. Son, "Two-Level Blockchain System for Digital Crime Evidence Management," *Sensors*, vol. 21, no. 9, 2021
- A. Al-Shaikhli et al., "Blockchain-Based Digital Forensic Evidence Management System," *Applied Sciences*, vol. 13, no. 20, 2023
- I. Kreso, "Using blockchain technology for preserving digital evidence in digital forensics," *Knowledge — International Journal*, vol. 68, no. 3, 2025
- B. Mbimbi, D. Murray, M. Wilson, "Private Blockchain-Driven Digital Evidence Management Systems," *Information*, vol. 16, no. 7, 2025
- MetaMask Developer Documentation — https://docs.metamask.io
- Pinata IPFS API v2 Documentation — https://docs.pinata.cloud
- Google Firebase, Cloud Firestore Documentation — https://firebase.google.com/docs/firestore
- Ethereum Foundation, EIP-1193: Ethereum Provider JavaScript API — https://eips.ethereum.org/EIPS/eip-1193
- Ethereum Foundation, Sepolia Testnet Documentation — https://ethereum.org/en/developers/docs/networks/#sepolia
- Protocol Labs, InterPlanetary File System (IPFS) Documentation — https://docs.ipfs.tech
- S. Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System," 2008
- IEEE Computer Society, "IEEE Recommended Practice for Software Requirements Specifications," IEEE Std. 830-1998
- J. Morgan, "The Impact of False or Misleading Forensic Evidence on Wrongful Convictions," National Institute of Justice, U.S. Dept. of Justice, 2023

## License

This project is licensed under the MIT License — see [LICENSE](./LICENSE) for details.

## Acknowledgements

Built with the open-source tools, documentation, and communities of Ethereum, IPFS, Hardhat, React Native, Expo, and Firebase.
