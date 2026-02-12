# 启动开发服务器
$env:VITE_GEMINI_API_KEY="AIzaSyDlMgLB4nLORuACi7vsmhrXk_ChXYEKEHU"
Write-Host "Starting development server..." -ForegroundColor Green
Write-Host "API Key configured" -ForegroundColor Green
Write-Host ""
Write-Host "The server will start at http://localhost:3000" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
npm run dev
