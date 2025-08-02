@echo off
echo ================================================
echo    GOOGLEBOT SITE CRAWLER - PRERENDER CACHE
echo ================================================
echo.
echo This will simulate both desktop and mobile Googlebot
echo visits to all URLs in your sitemap to force fresh
echo Prerender.io cache creation.
echo.
echo Total URLs to process: 46
echo Total requests: 92 (46 desktop + 46 mobile)
echo Estimated time: 8-10 minutes
echo.
pause
echo.

@echo off
setlocal enabledelayedexpansion
echo ================================================
echo    GOOGLEBOT SITE CRAWLER - PRERENDER CACHE
echo ================================================
echo.
echo This will simulate both desktop and mobile Googlebot
echo visits to all URLs in your sitemap to force fresh
echo Prerender.io cache creation.
echo.
echo Total URLs to process: 46
echo Total requests: 92 (46 desktop + 46 mobile)
echo Estimated time: 8-10 minutes
echo.
pause
echo.

set /a counter=1
set /a total=92

for /f "tokens=*" %%a in (all-sitemap-urls.txt) do (
    echo [!counter!/!total!] Processing: %%a
    echo.
    
    REM Desktop Googlebot visit
    echo   ^> Desktop Googlebot visit...
    curl -s -H "User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.5" -H "Accept-Encoding: gzip, deflate" -H "Cache-Control: max-age=0" "%%a" > nul
    if !errorlevel! equ 0 (
        echo     ✓ Desktop visit successful
    ) else (
        echo     ✗ Desktop visit failed
    )
    
    set /a counter+=1
    timeout /t 2 /nobreak > nul
    
    REM Mobile Googlebot visit
    echo   ^> Mobile Googlebot visit...
    curl -s -H "User-Agent: Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.5" -H "Viewport-Width: 360" "%%a" > nul
    if !errorlevel! equ 0 (
        echo     ✓ Mobile visit successful
    ) else (
        echo     ✗ Mobile visit failed
    )
    
    set /a counter+=1
    echo   ⏱ Waiting 3 seconds before next URL...
    echo.
    timeout /t 3 /nobreak > nul
)

echo ================================================
echo             CRAWL COMPLETED!
echo ================================================
echo ✓ Processed all 46 URLs
echo ✓ Made 92 total requests (desktop + mobile)
echo ✓ Prerender.io should now cache fresh content
echo.
echo NEXT STEPS:
echo 1. Wait 5-10 minutes for Prerender.io to process
echo 2. Test cached versions at: https://service.prerender.io/YOUR_URL
echo 3. Submit updated sitemap to Google Search Console
echo 4. Request indexing for key pages in Search Console
echo.
pause
