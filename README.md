# 2026 WBC 即時戰況與賽程數據面板

這是一個專為 2026 年世界棒球經典賽 (World Baseball Classic) 打造的單頁式前端專案，使用 Vite + Vanilla JS + CSS Glassmorphism 實作。

## 網站功能
- **🔴 台灣 vs 日本 Live**：提供即時的計分板與好壞球、壘包戰況，並包含一個右側隱藏的「管理控制台 (Admin Panel)」可以單機模擬擊球與好壞球變化。
- **📅 賽程與結果**：顯示 2026 WBC 已完賽的賽程結果比分卡。
- **📊 奪冠機率分析**：基於動態數學模型，能隨著 Live 計分板上的台日戰況即時連動，呈現各隊長條圖的奪冠機率變化。

## 專案技術棧
- **架構**：HTML5 + Vanilla JavaScript (ESM)
- **建置工具**：Vite 8
- **樣式**：純 CSS (無依賴 Tailwind 等框架，手刻玻璃擬物化 Glassmorphism 質感 UI)

## 如何在本機運行開發環境
1. 確認已經安裝 Node.js (建議 v18 以上)。
2. Clone 專案後進入資料夾：
   ```bash
   cd wbc-live
   ```
3. 安裝依賴套件：
   ```bash
   npm install
   ```
4. 啟動開發伺服器：
   ```bash
   npm run dev
   ```
5. 使用瀏覽器打開 `http://localhost:5173`。

## 如何部署到 GitHub Pages

1. 在 `vite.config.js` 檔案中，設定 `base` 為你的儲存庫名稱 (例如 `base: '/wbc-live/'`)。
2. 執行建置：
   ```bash
   npm run build
   ```
3. 你的靜態檔案將會產生在 `dist` 目錄下。
4. 使用 GitHub Pages 或工具 (例如 `gh-pages` npm 套件) 來把 `dist` 目錄推送到 `gh-pages` 分支。
   ```bash
   npm init -y  # 確保 package.json 正確
   npm install gh-pages --save-dev
   npm run deploy # 需在 package.json 設定 "deploy": "gh-pages -d dist"
   ```

由 AI Assistant 開發設計。
