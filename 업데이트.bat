@echo off
chcp 65001 > nul
title 에듀파인 품의 도우미 원클릭 자동 업데이트
color 0b

echo.
echo ========================================================================
echo   🚀 K-에듀파인 품의 도우미 - 원클릭 자동 업데이트
echo ========================================================================
echo.
echo   1. 깃허브(GitHub)에서 최신 버전 정보를 확인하고 다운로드합니다...
echo   2. 잠시만 기다려 주세요...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "$repo = 'yerang-k/edufine-draft-assistant';" ^
  "try {" ^
  "  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "  $release = Invoke-RestMethod -Uri ('https://api.github.com/repos/' + $repo + '/releases/latest') -Headers @{ 'User-Agent' = 'Edufine-Updater' };" ^
  "  $tag = $release.tag_name;" ^
  "  Write-Host ('   >> [최신 버전 감지] ' + $tag) -ForegroundColor Yellow;" ^
  "  $asset = $release.assets | Where-Object { $_.name -like '*.zip' } | Select-Object -First 1;" ^
  "  if (-not $asset) { throw '최신 릴리즈 압축파일(.zip)을 찾을 수 없습니다.' };" ^
  "  $tempZip = Join-Path $env:TEMP ('edufine_update_' + [System.Guid]::NewGuid().ToString() + '.zip');" ^
  "  $tempDir = Join-Path $env:TEMP ('edufine_update_' + [System.Guid]::NewGuid().ToString());" ^
  "  Write-Host '   >> 최신 파일 다운로드 중...' -ForegroundColor Cyan;" ^
  "  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tempZip;" ^
  "  Write-Host '   >> 압축 해제 및 파일 갱신 중...' -ForegroundColor Cyan;" ^
  "  Expand-Archive -Path $tempZip -DestinationPath $tempDir -Force;" ^
  "  $targetDir = '%~dp0';" ^
  "  $innerFolder = Get-ChildItem -Path $tempDir | Where-Object { $_.PSIsContainer } | Select-Object -First 1;" ^
  "  $sourcePath = if ($innerFolder) { $innerFolder.FullName } else { $tempDir };" ^
  "  Copy-Item -Path ($sourcePath + '\*') -Destination $targetDir -Recurse -Force;" ^
  "  Remove-Item -Path $tempZip -Force -ErrorAction SilentlyContinue;" ^
  "  Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "  Write-Host '   >> 파일 교체 완료!' -ForegroundColor Green;" ^
  "  exit 0;" ^
  "} catch {" ^
  "  Write-Host ('`n   [오류 발생] ' + $_.Exception.Message) -ForegroundColor Red;" ^
  "  exit 1;" ^
  "}"

if %errorlevel% neq 0 (
  echo.
  echo ------------------------------------------------------------------------
  echo  ❌ 업데이트 중 오류가 발생했습니다.
  echo  인터넷 연결을 확인하시거나 아래 웹페이지에서 직접 다운로드해 주세요:
  echo  👉 https://github.com/yerang-k/edufine-draft-assistant/releases/latest
  echo ------------------------------------------------------------------------
) else (
  echo.
  echo ========================================================================
  echo  🎉 축하합니다! 최신 버전으로 업데이트가 성공적으로 완료되었습니다!
  echo ========================================================================
  echo.
  echo  [마지막 필수 단계 (1초 소요)]
  echo  1. 열려 있는 브라우저(크롬/웨일/엣지)의 확장 프로그램 페이지로 이동합니다.
  echo     (주소창에 chrome://extensions 또는 whale://extensions 입력)
  echo  2. [에듀파인 품의 도우미] 카드의 [새로고침(🔄)] 아이콘을 클릭합니다!
  echo.
)

echo 아무 키나 누르면 창이 닫힙니다.
pause > nul
