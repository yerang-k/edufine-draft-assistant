// Copyright (c) 2026 KIMYERANG (에듀파인 품의 도우미). 무단 복제·배포·수정 금지
// 확장 프로그램 아이콘 클릭 시 사이드 패널 열기
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.log("SidePanel setPanelBehavior notice:", err));
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("에듀파인 품의 도우미 설치 완료");
});
