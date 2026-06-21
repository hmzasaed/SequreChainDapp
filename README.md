# SeQureChain v9.0
Blockchain Evidence Management — Firebase + Pinata IPFS + Ethereum Sepolia

## Setup
1. npm run install:all
2. cp backend/.env.example backend/.env  (fill all values)
3. npx hardhat compile && npx hardhat run scripts/deploy.js --network sepolia
4. cd backend && npm run dev
5. cd frontend && npm run web

## Running on Mobile

### Prerequisites
- **Expo Go app** installed on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **MetaMask app** installed on your phone ([iOS](https://apps.apple.com/app/metamask-blockchain-wallet/id1438144202) | [Android](https://play.google.com/store/apps/details?id=io.metamask))
- Phone and development machine on the **same local network**

### Steps to Run on Mobile

1. **Start the backend server**:
   ```bash
   cd backend
   npm run dev
   ```
   - Backend should be available at `http://localhost:3001`
   - API base should be `http://localhost:3001/api`

2. **Find your PC IP address** on Windows:
   ```powershell
   ipconfig
   ```
   - Use the IPv4 address for your active Wi-Fi or Ethernet adapter
   - Example: `192.168.1.100`

3. **Set the mobile API URL in the frontend**:
   - Open `frontend/src/context/AppContext.js`
   - Update this line:
     ```js
     const API_URL = 'http://192.168.100.18:3001/api';
     ```
   - Replace with your machine IP and backend port, for example:
     ```js
     const API_URL = 'http://192.168.1.100:3001/api';
     ```

4. **Start Expo**:
   ```bash
   cd frontend
   npm start
   ```

5. **Open the app on your phone**:
   - Scan the Expo QR code from the terminal or Expo Dev Tools
   - If prompted, choose **Expo Go**

6. **Use the mobile app**:
   - Confirm the UI loads
   - Login/Register with wallet info
   - Upload evidence and verify data connectivity

### Notes for Emulators / Simulators
- **Android emulator**: use `npm run android`
- **iOS simulator**: use `npm run ios`
- In emulator mode, you can often keep `API_URL` as your PC local network IP as above

### Troubleshooting
- If the app cannot reach the backend:
  - confirm the backend is running on `http://<your-pc-ip>:3001`
  - verify phone and PC are on the same network
  - check Windows firewall does not block port `3001`
- Do not use `localhost` or `127.0.0.1` on the phone; use your computer’s LAN IP

## Key: Firebase setup
- Go to console.firebase.google.com
- Create project → Firestore Database → Start in test mode
- Project Settings → Service Accounts → Generate New Private Key
- Paste entire JSON (minified one line) into FIREBASE_SERVICE_ACCOUNT in backend/.env
