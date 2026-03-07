# ⚾ WBC Live Scoreboard (世界棒球經典賽 即時戰況儀表板)

這是一個專為 **World Baseball Classic (世界棒球經典賽)** 打造的純前端即時戰況與數據儀表板。
只需開啟網頁，即可自動獲取最新比分、完賽紀錄與各隊奪冠機率分析。

### 🌍 **[線上看即時戰況 (Live Demo)](https://linkejin2023-eng.github.io/wbc-live/)**

---

## ✨ 核心功能 (Features)

1. **純前端無伺服器架構 (Serverless Static Site)**
   - 全面移除 Node.js 後端，大幅提升讀取速度。
   - 直接從前端使用 `fetch()` 串接 MLB 官方 Stats API 取回比賽資料。
   - 可輕鬆寄存在 GitHub Pages、Surge、Vercel 等任何靜態網站代管服務上。

2. **精準的 WBC 賽事過濾器 (WBC Exclusive)**
   - 強制鎖定 API 的 `sportId=51` (國際棒球賽事)。
   - 自動判別 `gameType === 'E'` 來精準過濾掉所有混雜在內的大聯盟春訓熱身賽（Exhibition Games）。
   - 保證網頁上呈現的完全是純粹的 WBC 國家隊對決！

3. **四大即時數據儀表板**
   - **🔴 即時戰況 (Live Box Score)**: 智慧辨識目前您的時區（橫跨昨、今、明三天抓取），將「現正進行中(In Progress)」與「即將開打(Scheduled)」的比賽優先推送到畫面上方的下拉選單供您隨時切換。包含好壞球數(Count)、壘包狀況(Bases)與半局(Inning)皆即時更新。
   - **📅 賽程與結果 (Past Results)**: 自動抓取本屆所有已完賽（包含提前結束 `Completed Early` / `abstractGameState: Final`）的戰績。並貼心地依據分組（`Pool A`、`Pool B` 等）排版，並附上真實比賽場地名稱（如 Tokyo Dome）。
   - **📊 奪冠機率分析 (Championship Probabilities)**: 自動爬取 API 中各國目前的勝敗場次 (`leagueRecord`)，導入積分演算法並繪製為動態的機率長條圖排行榜。
   - **⚙️ 賽局設定 (Settings)**: 保留未來的擴充空間。

---

## 🚀 開發與本地執行 (Local Development)

本專案使用 Vite 建置，開發環境十分輕量簡單：

1. **安裝依賴套件 (Install dependencies)**
   ```bash
   npm install
   ```

2. **啟動本地測試環境 (Start the dev server)**
   ```bash
   npm run dev
   ```
   即可在 `http://localhost:5173` 預覽。

3. **打包發布 (Build for production)**
   ```bash
   npm run build
   ```
   打包後的靜態檔案會產出於 `dist/` 資料夾中。

---

## 📦 自動部署 (Deployment)

目前專案已經設定好與 **GitHub Pages** 的整合：
您可以修改完程式碼後，透過以下指令一鍵推送打包結果至線上：

```bash
npm run build
npx gh-pages -d dist
```

> **備註**: `vite.config.js` 的 `base` 路徑請務必符合您的 GitHub Repository 名稱 (如 `/wbc-live/`) 才能正確載入 CSS/JS 資源。
