# Std6730202688IPFinal2026

Final Exam: Internet Programming (2026) — HR Manager & Salary Analytics System

- `backend/`  — Express.js API (in-memory data, K-Means salary clustering)
- `frontend/` — React Native (Expo) app

Login: `admin` / `password123`

## Run backend
```bash
cd backend
npm install
npm start          # http://localhost:3000
```

## Run frontend
```bash
cd frontend
npm install
npx expo install expo-constants react-dom react-native-web @expo/metro-runtime
npx expo start     # press "w" for web, or scan QR with Expo Go
```

The API URL is detected automatically (same machine as Metro, port 3000).
To change it, edit `frontend/src/config.js`
(`USE_CLOUD = true` uses the course cloud server).
