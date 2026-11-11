// Copyright (c) 2026 KIMYERANG (에듀파인 품의 도우미). 무단 복제·배포·수정 금지
// 이미지 최적화 (초고속 전송을 위해 960px & 압축률 최적화)
function resizeImageBase64(base64Str, maxDimension = 960) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
}

// 텍스트에서 안전하게 JSON 파싱
function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    throw new Error("AI 응답을 JSON으로 변환할 수 없습니다.");
  }
}

// 숫자 -> 한글 금액 변환 함수
function numberToKorean(num) {
  if (!num || isNaN(num) || num === 0) return "영";
  const units = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const smallUnits = ["", "십", "백", "천"];
  const bigUnits = ["", "만", "억", "조"];

  let result = "";
  let unitIndex = 0;

  while (num > 0) {
    let chunk = num % 10000;
    if (chunk > 0) {
      let chunkStr = "";
      for (let i = 0; i < 4; i++) {
        let digit = chunk % 10;
        if (digit > 0) {
          chunkStr = units[digit] + smallUnits[i] + chunkStr;
        }
        chunk = Math.floor(chunk / 10);
      }
      result = chunkStr + bigUnits[unitIndex] + " " + result;
    }
    num = Math.floor(num / 10000);
    unitIndex++;
  }
  return result.trim();
}

// 구글 AI(Gemini) 오류 메시지 친절한 한국어 자동 번역 헬퍼
function getKoreanErrorMessage(err) {
  if (!err) return "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  const rawMsg = typeof err === "string" ? err : (err.message || String(err));
  const lower = rawMsg.toLowerCase();

  // 1. 무료 사용량 / 일일 호출 한도 초과 (429, Resource Exhausted)
  if (
    lower.includes("resource_exhausted") ||
    lower.includes("quota exceeded") ||
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("queries per minute") ||
    lower.includes("free tier") ||
    lower.includes("check your plan and billing")
  ) {
    return "⚠️ [무료 AI 호출 한도 초과]\n구글 Gemini의 무료 일일/분당 사용 한도가 소진되었습니다.\n• 약 1~2분 뒤 다시 시도하시거나\n• Google AI Studio에서 새 API 키를 발급받아 [설정]에 등록해 주세요.";
  }

  // 2. API 키 유효성 오류 (400, 403, Invalid API Key)
  if (
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("invalid api key") ||
    lower.includes("bad_api_key") ||
    lower.includes("api_key_expired") ||
    (lower.includes("400") && lower.includes("key"))
  ) {
    return "⚠️ [API 키 오류]\n등록된 Gemini API 키가 올바르지 않거나 만료되었습니다.\n우측 상단 [설정]을 눌러 API 키를 다시 확인하고 저장해 주세요.";
  }

  // 3. 계정 권한 / 서비스 지역 제한
  if (
    lower.includes("permission_denied") ||
    lower.includes("forbidden") ||
    lower.includes("location is not supported")
  ) {
    return "⚠️ [계정 권한 오류]\n해당 구글 계정 또는 네트워크 환경에서 Gemini API 접근이 제한되었습니다.\n다른 구글 계정으로 발급받은 API 키를 사용해 보세요.";
  }

  // 4. 네트워크 연결 실패
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("net::") ||
    lower.includes("connection refused")
  ) {
    return "⚠️ [네트워크 연결 오류]\n인터넷 연결이 불안정하거나 구글 서버에 접속할 수 없습니다.\n학교 인터넷망 또는 보안 프로그램을 확인해 주세요.";
  }

  // 5. 응답 시간 초과 (Timeout)
  if (
    lower.includes("aborterror") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("deadline_exceeded")
  ) {
    return "⚠️ [응답 시간 초과]\n구글 AI 서버의 응답이 지연되었습니다.\n캡처 이미지 수를 줄이거나 잠시 후 다시 시도해 주세요.";
  }

  // 6. 구글 서버 일시적 과부하
  if (
    lower.includes("overloaded") ||
    lower.includes("service unavailable") ||
    lower.includes("503") ||
    lower.includes("500") ||
    lower.includes("internal error")
  ) {
    return "⚠️ [구글 서버 일시 과부하]\n구글 AI 서버 사용량이 일시적으로 폭증했습니다.\n약 10초 뒤 다시 [AI 분석]을 눌러주세요.";
  }

  // 7. 안전성 필터 차단
  if (
    lower.includes("safety") ||
    lower.includes("harm_category") ||
    lower.includes("blocked")
  ) {
    return "⚠️ [AI 안전 필터 차단]\n캡처 이미지나 텍스트의 특정 단어가 AI 안전 기준에 의해 차단되었습니다.\n다른 이미지나 텍스트로 시도해 주세요.";
  }

  // 8. 상품 인식 실패 / 파싱 오류
  if (
    lower.includes("상품을 감지하지 못했습니다") ||
    lower.includes("상품 내역을 감지하지 못했습니다") ||
    lower.includes("json") ||
    lower.includes("unexpected token") ||
    lower.includes("비어있습니다")
  ) {
    return "⚠️ [상품 인식 실패]\n이미지에서 상품명과 가격 글자를 명확히 읽어내지 못했습니다.\n더 크고 선명하게 캡처하시거나 [텍스트 복사 모드]를 이용해 보세요.";
  }

  // 9. 일반 기본 안내
  return `⚠️ [AI 분석 실패]\n${rawMsg}`;
}

// 상태 변수
let activeMode = "image"; // 'image' | 'text'
let uploadedImages = []; // 다중 캡처 이미지 배열
let parsedItems = [];

// DOM 요소
const modeBtnImage = document.getElementById("modeBtnImage");
const modeBtnText = document.getElementById("modeBtnText");
const imageModeCard = document.getElementById("imageModeCard");
const textModeCard = document.getElementById("textModeCard");
const imgBadgeCount = document.getElementById("imgBadgeCount");

const dropzone = document.getElementById("dropzone");
const filePickerInput = document.getElementById("filePickerInput");
const imageGallery = document.getElementById("imageGallery");
const galleryGrid = document.getElementById("galleryGrid");
const galleryCount = document.getElementById("galleryCount");
const btnClearAllImgs = document.getElementById("btnClearAllImgs");
const textInputArea = document.getElementById("textInputArea");

const usageSelect = document.getElementById("usageSelect");
const customUsage = document.getElementById("customUsage");
const refSelect = document.getElementById("refSelect");
const customRef = document.getElementById("customRef");
const btnAnalyze = document.getElementById("btnAnalyze");
const btnAnalyzeText = document.getElementById("btnAnalyzeText");
const btnAppendAnalyze = document.getElementById("btnAppendAnalyze");
const btnManualAddRow = document.getElementById("btnManualAddRow");
const statusMsg = document.getElementById("statusMsg");

const resultCard = document.getElementById("resultCard");
const tabBtnDraft = document.getElementById("tabBtnDraft");
const tabBtnItems = document.getElementById("tabBtnItems");
const tabContentDraft = document.getElementById("tabContentDraft");
const tabContentItems = document.getElementById("tabContentItems");

const draftTitle = document.getElementById("draftTitle");
const draftBody = document.getElementById("draftBody");
const itemsTableBody = document.getElementById("itemsTableBody");
const itemCount = document.getElementById("itemCount");
const totalAmountText = document.getElementById("totalAmountText");
const quickQtyList = document.getElementById("quickQtyList");
const quickTotalBadge = document.getElementById("quickTotalBadge");
const budgetSummaryBox = document.getElementById("budgetSummaryBox");
const budgetSummaryList = document.getElementById("budgetSummaryList");

const btnInjectEdufine = document.getElementById("btnInjectEdufine");
const btnCopyGridData = document.getElementById("btnCopyGridData");
const btnDownloadExcel = document.getElementById("btnDownloadExcel");
const btnCopyDraft = document.getElementById("btnCopyDraft");

// 최상단 품의 모드 탭 요소
const mainTabBtnSingle = document.getElementById("mainTabBtnSingle");
const mainTabBtnMulti = document.getElementById("mainTabBtnMulti");
const sectionSingleWorkflow = document.getElementById("sectionSingleWorkflow");
const sectionMultiWorkflow = document.getElementById("sectionMultiWorkflow");

// 다중 예산 분할 품의 DOM 요소 및 상태 변수
let currentMultiBudget = 1;
let multiBudgetItems = []; // [{ name, spec, qty, unit: "선택", unitPrice, totalPrice, budgetNum, injected: false }]
let multiBudgetImages = {}; // 예산별 독립 캡처 이미지 보관: { [budgetNum]: [base64, ...] }
let multiCurrentItems = [];

function getCurBudgetImages() {
  if (!multiBudgetImages[currentMultiBudget]) {
    multiBudgetImages[currentMultiBudget] = [];
  }
  return multiBudgetImages[currentMultiBudget];
}

const multiCurrentBudgetBadge = document.getElementById("multiCurrentBudgetBadge");
const multiBudgetSelect = document.getElementById("multiBudgetSelect");
const multiNoticeBudgetNum = document.getElementById("multiNoticeBudgetNum");
const multiInputCardTitle = document.getElementById("multiInputCardTitle");
const multiFilePickerInput = document.getElementById("multiFilePickerInput");
const multiDropzone = document.getElementById("multiDropzone");
const multiImageGallery = document.getElementById("multiImageGallery");
const multiGalleryGrid = document.getElementById("multiGalleryGrid");
const multiGalleryCount = document.getElementById("multiGalleryCount");
const btnClearMultiImgs = document.getElementById("btnClearMultiImgs");
const btnMultiAnalyze = document.getElementById("btnMultiAnalyze");
const btnMultiAnalyzeText = document.getElementById("btnMultiAnalyzeText");
const multiStatusMsg = document.getElementById("multiStatusMsg");

const multiItemsCard = document.getElementById("multiItemsCard");
const multiCurrentBudgetLabel = document.getElementById("multiCurrentBudgetLabel");
const multiCurrentItemCount = document.getElementById("multiCurrentItemCount");
const multiCurrentTotal = document.getElementById("multiCurrentTotal");
const multiCurrentQtyList = document.getElementById("multiCurrentQtyList");
const btnMultiInjectItems = document.getElementById("btnMultiInjectItems");
const btnMultiInjectItemsText = document.getElementById("btnMultiInjectItemsText");
const btnMultiNextBudget = document.getElementById("btnMultiNextBudget");
const btnMultiNextBudgetText = document.getElementById("btnMultiNextBudgetText");

const multiSummaryList = document.getElementById("multiSummaryList");
const multiGrandSummaryText = document.getElementById("multiGrandSummaryText");
const btnMultiResetAll = document.getElementById("btnMultiResetAll");

const multiUsageSelect = document.getElementById("multiUsageSelect");
const multiCustomUsage = document.getElementById("multiCustomUsage");
const multiRefSelect = document.getElementById("multiRefSelect");
const multiCustomRef = document.getElementById("multiCustomRef");
const btnMultiGenDraft = document.getElementById("btnMultiGenDraft");
const multiDraftTitle = document.getElementById("multiDraftTitle");
const multiDraftBody = document.getElementById("multiDraftBody");
const btnMultiInjectDraft = document.getElementById("btnMultiInjectDraft");

const btnRegenDraftText = document.getElementById("btnRegenDraftText");

// 버전 정보 표시
const manifestVer = chrome.runtime.getManifest()?.version || "2.1.0";
const appVersionBadge = document.getElementById("appVersionBadge");
const settingsVersion = document.getElementById("settingsVersion");
if (appVersionBadge) appVersionBadge.textContent = `v${manifestVer}`;
if (settingsVersion) settingsVersion.textContent = `v${manifestVer}`;
console.log(`[에듀파인 품의 도우미] 로드됨: v${manifestVer}`);

// 설정 모달
const btnSettings = document.getElementById("btnSettings");
const settingsModal = document.getElementById("settingsModal");
const apiKeyInput = document.getElementById("apiKeyInput");
const btnSaveSettings = document.getElementById("btnSaveSettings");
const btnCancelSettings = document.getElementById("btnCancelSettings");
const btnTestKey = document.getElementById("btnTestKey");
const apiTestResult = document.getElementById("apiTestResult");

// 관련 근거 관리 요소
const newRefInput = document.getElementById("newRefInput");
const btnAddRef = document.getElementById("btnAddRef");
const refListContainer = document.getElementById("refListContainer");

// 기본 관련 근거 프리셋
const DEFAULT_REF_LIST = [
  "2026학년도 학교교육과정 운영계획",
  "2026학년도 학년운영계획",
  "2026학년도 AI디지털 활용 선도학교 운영계획",
  "2026학년도 학생 자치활동 운영계획"
];

let savedRefList = [];

// 관련 근거 초기 로드 및 렌더링
function loadRefList() {
  chrome.storage.local.get(["savedRefList"], (res) => {
    savedRefList = res.savedRefList || DEFAULT_REF_LIST;
    renderRefDropdown();
    renderRefListSettings();
  });
}

function renderRefDropdown() {
  [refSelect, multiRefSelect].forEach(selectElem => {
    if (!selectElem) return;
    const currentVal = selectElem.value;
    selectElem.innerHTML = `<option value="">(선택 안 함 / 없음)</option>`;
    savedRefList.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      selectElem.appendChild(opt);
    });
    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "+ 직접 입력...";
    selectElem.appendChild(customOpt);

    if (savedRefList.includes(currentVal) || currentVal === "custom") {
      selectElem.value = currentVal;
    }
  });
}

function renderRefListSettings() {
  refListContainer.innerHTML = "";
  if (savedRefList.length === 0) {
    refListContainer.innerHTML = `<div style="font-size:11.5px; color:var(--text-3); text-align:center; padding:8px;">등록된 관련 근거가 없습니다.</div>`;
    return;
  }

  savedRefList.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "ref-item";
    div.innerHTML = `
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:260px; color:var(--text);">${item}</span>
      <button class="ref-item-del" data-idx="${idx}" title="삭제">
        <svg class="svg-icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    refListContainer.appendChild(div);
  });

  refListContainer.querySelectorAll(".ref-item-del").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      savedRefList.splice(idx, 1);
      chrome.storage.local.set({ savedRefList }, () => {
        renderRefDropdown();
        renderRefListSettings();
      });
    });
  });
}

// 새 관련 근거 추가
btnAddRef.addEventListener("click", () => {
  const val = newRefInput.value.trim();
  if (!val) return;
  if (!savedRefList.includes(val)) {
    savedRefList.push(val);
    chrome.storage.local.set({ savedRefList }, () => {
      newRefInput.value = "";
      renderRefDropdown();
      renderRefListSettings();
      refSelect.value = val;
    });
  } else {
    alert("이미 등록되어 있는 관련 근거입니다.");
  }
});

// 엔터키로 추가
newRefInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnAddRef.click();
});

// 관련 근거 드롭다운 변경 시 직접입력 토글
refSelect.addEventListener("change", () => {
  if (refSelect.value === "custom") {
    customRef.style.display = "block";
    customRef.focus();
  } else {
    customRef.style.display = "none";
  }
});

// 초기화
chrome.storage.local.get(["geminiApiKey"], (res) => {
  if (res.geminiApiKey) apiKeyInput.value = res.geminiApiKey;
  loadRefList();
});

// 모드 전환
modeBtnImage.addEventListener("click", () => {
  activeMode = "image";
  modeBtnImage.classList.add("active");
  modeBtnText.classList.remove("active");
  imageModeCard.style.display = "block";
  textModeCard.style.display = "none";
  updateAnalyzeButtonState();
});

modeBtnText.addEventListener("click", () => {
  activeMode = "text";
  modeBtnText.classList.add("active");
  modeBtnImage.classList.remove("active");
  textModeCard.style.display = "block";
  imageModeCard.style.display = "none";
  textInputArea.focus();
  updateAnalyzeButtonState();
});

textInputArea.addEventListener("input", updateAnalyzeButtonState);

function updateAnalyzeButtonState() {
  const hasInput = (activeMode === "image")
    ? uploadedImages.length > 0
    : textInputArea.value.trim().length > 0;

  btnAnalyze.disabled = !hasInput;
  if (btnAppendAnalyze) {
    if (parsedItems && parsedItems.length > 0) {
      btnAppendAnalyze.style.display = "inline-flex";
      btnAppendAnalyze.disabled = !hasInput;
      if (btnAnalyzeText) btnAnalyzeText.textContent = "새로 분석 (기존 초기화)";
    } else {
      btnAppendAnalyze.style.display = "none";
      btnAppendAnalyze.disabled = true;
      if (btnAnalyzeText) btnAnalyzeText.textContent = "AI 상품 분석 및 기안문 작성";
    }
  }
}

// 용도 직접입력 토글 (단일 예산 & 다중 예산)
usageSelect.addEventListener("change", () => {
  if (usageSelect.value === "custom") {
    customUsage.style.display = "block";
    customUsage.focus();
  } else {
    customUsage.style.display = "none";
  }
});

if (multiUsageSelect) {
  multiUsageSelect.addEventListener("change", () => {
    if (multiUsageSelect.value === "custom") {
      multiCustomUsage.style.display = "block";
      multiCustomUsage.focus();
    } else {
      multiCustomUsage.style.display = "none";
    }
  });
}

if (multiRefSelect) {
  multiRefSelect.addEventListener("change", () => {
    if (multiRefSelect.value === "custom") {
      multiCustomRef.style.display = "block";
      multiCustomRef.focus();
    } else {
      multiCustomRef.style.display = "none";
    }
  });
}

// 다중 이미지 처리 함수
function addImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    alert("이미지 파일만 붙여넣을 수 있습니다.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImages.push(e.target.result);
    renderGallery();
    updateAnalyzeButtonState();
    statusMsg.textContent = "";
  };
  reader.readAsDataURL(file);
}

function renderGallery() {
  galleryGrid.innerHTML = "";
  if (uploadedImages.length > 0) {
    imageGallery.style.display = "block";
    galleryCount.textContent = uploadedImages.length;
    imgBadgeCount.textContent = uploadedImages.length;

    uploadedImages.forEach((imgSrc, idx) => {
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.innerHTML = `
        <img src="${imgSrc}" alt="캡처 ${idx + 1}" />
        <button class="gallery-item-del" data-idx="${idx}" title="삭제">
          <svg class="svg-icon" style="width:12px;height:12px;" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;
      galleryGrid.appendChild(item);
    });

    // 개별 삭제 버튼 이벤트
    galleryGrid.querySelectorAll(".gallery-item-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.dataset.idx);
        uploadedImages.splice(idx, 1);
        renderGallery();
        updateAnalyzeButtonState();
      });
    });
  } else {
    imageGallery.style.display = "none";
    imgBadgeCount.textContent = "0";
  }
}

// 전체 삭제
btnClearAllImgs.addEventListener("click", () => {
  uploadedImages = [];
  renderGallery();
  updateAnalyzeButtonState();
});

// 클립보드 붙여넣기 (Ctrl + V)
window.addEventListener("paste", (e) => {
  // 1) 다중 예산 모드일 때의 붙여넣기
  if (currentTopWorkflow === "multi") {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        addMultiImageFile(file);
      }
    }
    return;
  }

  // 2) 단일 예산 모드일 때의 붙여넣기
  if (activeMode === "text" && document.activeElement === textInputArea) {
    return; // 텍스트 영역에 붙여넣을 땐 기본 텍스트 동작 유지
  }

  const items = e.clipboardData?.items;
  if (!items) return;

  let imageFound = false;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      addImageFile(file);
      imageFound = true;
    }
  }

  // 만약 텍스트만 복사된 상태이고 이미지 모드일 때
  if (!imageFound && activeMode === "image") {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText && pastedText.trim().length > 10) {
      if (confirm("클립보드에 텍스트가 감지되었습니다. 초고속 '텍스트 복사 모드'로 붙여넣으시겠습니까?")) {
        modeBtnText.click();
        textInputArea.value = pastedText;
        updateAnalyzeButtonState();
      }
    }
  }
});

// 드롭존 클릭 시 파일 선택 탐색기 열기
dropzone.addEventListener("click", () => {
  filePickerInput.click();
});

// 파일 탐색창에서 이미지 선택 시
filePickerInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files.length > 0) {
    for (let i = 0; i < e.target.files.length; i++) {
      addImageFile(e.target.files[i]);
    }
    // 동일 파일 재선택 가능하도록 초기화
    filePickerInput.value = "";
  }
});

// 드래그 앤 드롭
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  if (e.dataTransfer.files) {
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      addImageFile(e.dataTransfer.files[i]);
    }
  }
});

// 설정 모달
btnSettings.addEventListener("click", () => settingsModal.classList.add("active"));
btnCancelSettings.addEventListener("click", () => settingsModal.classList.remove("active"));

async function testApiKey(key) {
  if (!key) return { success: false, message: "API 키를 입력해주세요." };
  const versions = ["v1beta", "v1"];
  for (const ver of versions) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${key}`);
      const data = await res.json();
      if (res.ok) {
        const usable = (data.models || [])
          .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
          .map(m => m.name.replace("models/", ""));
        return { success: true, version: ver, models: usable };
      } else if (data.error?.message) {
        return { success: false, message: `${data.error.message}` };
      }
    } catch (e) {}
  }
  return { success: false, message: "구글 서버에 연결할 수 없습니다." };
}

btnTestKey.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  apiTestResult.style.color = "var(--accent)";
  apiTestResult.textContent = "API 키 테스트 중...";
  const res = await testApiKey(key);
  if (res.success) {
    apiTestResult.style.color = "var(--ok)";
    apiTestResult.textContent = `연결 성공! (${res.models.length}개 모델 사용 가능)`;
  } else {
    apiTestResult.style.color = "var(--danger)";
    apiTestResult.textContent = getKoreanErrorMessage(res.message);
  }
});

btnSaveSettings.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) return alert("API Key를 입력해주세요.");
  chrome.storage.local.set({ geminiApiKey: key }, () => {
    settingsModal.classList.remove("active");
    alert("API Key가 저장되었습니다.");
  });
});

// 탭 전환
tabBtnDraft.addEventListener("click", () => {
  tabBtnDraft.classList.add("active");
  tabBtnItems.classList.remove("active");
  tabContentDraft.classList.add("active");
  tabContentItems.classList.remove("active");
});

tabBtnItems.addEventListener("click", () => {
  tabBtnItems.classList.add("active");
  tabBtnDraft.classList.remove("active");
  tabContentItems.classList.add("active");
  tabContentDraft.classList.remove("active");
});

// AI 분석 실행 공통 함수 (isAppend가 true이면 기존 품목 뒤에 누적)
async function executeAnalyze(isAppend = false) {
  const { geminiApiKey } = await chrome.storage.local.get(["geminiApiKey"]);
  if (!geminiApiKey) {
    settingsModal.classList.add("active");
    alert("Gemini API Key를 먼저 설정해주세요.");
    return;
  }

  btnAnalyze.disabled = true;
  if (btnAppendAnalyze) btnAppendAnalyze.disabled = true;
  statusMsg.style.color = "var(--accent)";

  try {
    const usage = usageSelect.value === "custom" ? customUsage.value.trim() : usageSelect.value;
    const ref = refSelect.value === "custom" ? customRef.value.trim() : refSelect.value;

    let contentParts = [];
    const promptText = `
당신은 대한민국 학교 행정(K-에듀파인) 품의 공문서 작성 전문가입니다.
제공된 정보(상품 캡처본 또는 쇼핑몰 텍스트)를 바탕으로 물품 품목 내역과 품의 기안문을 작성해주세요.

[추가 입력 정보]
- 물품 용도: ${usage || "교육활동"}
- 관련 근거: ${ref || "(없음)"}

반드시 아래 JSON 형식으로만 응답해야 합니다. 마크다운 코드블록(\`\`\`json) 없이 순수 JSON만 반환하세요:
{
  "representativeName": "대표 물품명 (회사명/광고문구 없는 핵심 명사)",
  "items": [
    {
      "name": "회사명/브랜드/광고수식어를 완전히 뺀 간결한 핵심 물품명",
      "s2bCode": "S2B물품번호가 있으면 기재, 없으면 빈 문자열",
      "spec": "",
      "qty": 1,
      "unit": "개",
      "unitPrice": 15000,
      "totalPrice": 15000
    }
  ]
}

[필수 작성 규칙]:
1. ★★★ 대량 품목 누락 방지 규칙 (매우 중요) ★★★:
   - 이미지나 텍스트에 포함된 모든 상품을 **절대 생략하거나 개수 제한(예: 6개 등)을 두지 말고**, 보이는 상품 전부(10개, 20개 이상이라도 빠짐없이)를 \`items\` 배열에 하나씩 온전히 포함시키세요!
2. ★★★ 상품명(name) 간결화 규칙 ★★★:
   - 제조사/회사명, 브랜드명, 모델번호, 마케팅 수식어(휴대용, 방송용, 강의용, 정품 등)를 완전히 제거하고 공문서에 들어갈 "핵심 물품명(명사)"만 1~3단어로 간결하게 추출하세요!
   - [적용 예시]:
     * "마타스튜디오 와이어리스1 무선 핀마이크 블루투스 스마트폰 C타입..." ➔ "무선 핀마이크"
     * "100W 초고속 충전기 블랙 어댑터..." ➔ "초고속 충전기"
     * "삼성전자 갤럭시 정품 25W PD 충전기..." ➔ "충전기"
     * "로지텍 무선 무소음 마우스 M331..." ➔ "무선 마우스"
3. ★★★ 규격(spec) 작성 규칙 (기본값: 빈 문자열 "") ★★★:
   - 규격(spec)은 **기본적으로 비워두세요("")**!
   - 색상(블랙, 화이트 등), 구성품, 호환성(스마트폰용, C타입 등), 특징/성능 설명, 일반 옵션명은 규격에 절대 넣지 마세요.
   - 오직 용지 규격(A4, B4, 8절), 정확한 용량/무게(500ml, 2L, 1kg, 64GB), 물리적 치수(30cm, 50m, 27인치), 정격 출력(100W, 25W)처럼 **누가 봐도 명백한 단일 물리적 수치/표준 규격(10자 이내)**이 상품명에 명시된 경우에만 그 수치 1개만 짧게 적고, 그 외의 모든 상품은 무조건 빈 문자열("")로 비워두세요!
4. 가격(단가, 금액)은 쉼표/원화 없이 정수 숫자로만 작성하세요.
5. 수량(qty)도 정수 숫자로만 작성하세요.
`;

    contentParts.push({ text: promptText });

    if (activeMode === "image") {
      statusMsg.textContent = `⏳ ${uploadedImages.length}개 캡처 이미지 초고속 압축 중...`;
      const optimizedList = await Promise.all(
        uploadedImages.map(base64Img => resizeImageBase64(base64Img, 960))
      );
      for (const optimized of optimizedList) {
        const pureBase64 = optimized.split(",")[1];
        const mimeType = optimized.split(";")[0].split(":")[1] || "image/jpeg";
        contentParts.push({
          inlineData: {
            mimeType: mimeType,
            data: pureBase64
          }
        });
      }
    } else {
      // 텍스트 모드
      const pastedText = textInputArea.value.trim();
      contentParts.push({ text: `[쇼핑몰에서 복사한 상품 내역 텍스트]\n${pastedText}` });
    }

    // 1. 초고속 모델 선택 (검증된 고속 모델로 즉시 직행)
    const { lastFastGeminiModel } = await chrome.storage.local.get(["lastFastGeminiModel"]);
    const fastCandidates = [
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-3-flash-preview",
      "gemini-3.8-flash",
      "gemini-1.5-flash-latest"
    ];

    let candidateModels = [];
    if (lastFastGeminiModel) {
      candidateModels.push(lastFastGeminiModel);
    }
    for (const m of fastCandidates) {
      if (!candidateModels.includes(m)) candidateModels.push(m);
    }

    const apiVer = "v1beta";
    let res = null;
    let lastErrMsg = "";
    let succeededModel = "";

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      statusMsg.textContent = `AI(${model}) 분석 중...`;

      try {
        const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${geminiApiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const genConfig = {
          temperature: 0.1,
          responseMimeType: "application/json"
        };
        if (model.includes("2.5-flash")) {
          genConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: contentParts }],
            generationConfig: genConfig
          })
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          succeededModel = model;
          chrome.storage.local.set({ lastFastGeminiModel: model });
          break;
        } else {
          const errData = await res.json().catch(() => ({}));
          const msg = errData.error?.message || "";
          lastErrMsg = msg;
          console.log(`[AI 모델 전환] ${model}:`, msg);

          const match = msg.match(/use\s+models\/(gemini-[a-zA-Z0-9.-]+)/i);
          if (match && match[1] && !candidateModels.includes(match[1])) {
            candidateModels.splice(i + 1, 0, match[1]);
          }
        }
      } catch (err) {
        lastErrMsg = err.name === "AbortError" ? "모델 응답 지연으로 고속 백업 모델로 전환" : err.message;
      }
    }

    if (!res || !res.ok) {
      const check = await testApiKey(geminiApiKey);
      if (check.success && check.models.length > 0) {
        const extraModels = check.models.filter(m => m.includes("flash") && !m.includes("tts") && !m.includes("-image") && !candidateModels.includes(m));
        for (const model of extraModels) {
          statusMsg.textContent = `AI(${model}) 분석 중...`;
          try {
            const url = `https://generativelanguage.googleapis.com/${check.version || 'v1beta'}/models/${model}:generateContent?key=${geminiApiKey}`;
            res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: contentParts }],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
              })
            });
            if (res.ok) {
              chrome.storage.local.set({ lastFastGeminiModel: model });
              break;
            }
          } catch (e) {}
        }
      }
    }

    if (!res || !res.ok) throw new Error(lastErrMsg || "AI 분석에 실패했습니다.");

    statusMsg.textContent = "품의 기안문과 엑셀 내역을 생성하고 있습니다...";
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("AI 응답 내용이 비어있습니다.");

    const parsed = extractJson(rawText);
    const newItems = parsed.items || [];

    if (newItems.length === 0) {
      throw new Error("상품 내역을 감지하지 못했습니다. 더 선명한 이미지나 텍스트를 입력해주세요.");
    }

    if (isAppend && parsedItems && parsedItems.length > 0) {
      // 품목 추가 모드: 기존 목록 뒤에 이어붙임
      newItems.forEach((item) => {
        item.spec = sanitizeSpec(item.spec);
        item.qty = Math.max(1, parseInt(item.qty) || 1);
        item.unitPrice = Math.max(0, parseInt(item.unitPrice) || 0);
        item.totalPrice = item.qty * item.unitPrice;
        parsedItems.push(item);
      });
      renderItemsUI();
      syncQuantityAndBudget();
      statusMsg.style.color = "var(--ok)";
      statusMsg.textContent = `기존 품목에 ${newItems.length}건이 추가되었습니다! (총 ${parsedItems.length}건)`;
    } else {
      // 새로 분석 모드
      parsedItems = newItems;
      renderResults(parsed, usage, ref);
      statusMsg.style.color = "var(--ok)";
      statusMsg.textContent = `총 ${parsedItems.length}개 품목 작성 완료! 수량을 조절한 뒤 에듀파인에 입력해보세요.`;
      resultCard.style.display = "block";
    }

    updateAnalyzeButtonState();
  } catch (err) {
    console.error(err);
    statusMsg.style.color = "var(--danger)";
    statusMsg.textContent = getKoreanErrorMessage(err);
  } finally {
    btnAnalyze.disabled = false;
    updateAnalyzeButtonState();
  }
}

// AI 분석 버튼 클릭 (새로 분석)
btnAnalyze.addEventListener("click", () => executeAnalyze(false));

// 품목 추가 분석 버튼 클릭 (기존 목록에 이어붙이기)
if (btnAppendAnalyze) {
  btnAppendAnalyze.addEventListener("click", () => executeAnalyze(true));
}

// 진짜 물리적/표준 규격(A4, 500ml, 100W, 64GB, 30cm 등)만 남기고 나머지 불필요한 옵션/색상/설명은 빈칸("")으로 정리
function sanitizeSpec(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s || s === "-" || s === "없음" || s === "단품" || s === "기본" || s === "상세참조") return "";
  const strictSpecRegex = /^(A[0-6]|B[0-6]|[0-9]+절|[0-9]+(\.[0-9]+)?\s*(mm|cm|m|ml|l|L|g|kg|w|W|v|V|a|A|gb|GB|tb|TB|mah|mAh|인치|inch|호|매)(\s*[xX×*]\s*[0-9]+(\.[0-9]+)?\s*(mm|cm|m)?)?)$/i;
  if (strictSpecRegex.test(s)) return s;
  const tokens = s.split(/[,/|\s]+/).map(t => t.trim()).filter(Boolean);
  for (const tok of tokens) {
    if (strictSpecRegex.test(tok)) return tok;
  }
  return "";
}

// 수량·단가 변경 시 전체 금액 합계, 기안문 본문('다. 소요예산: ...'), 엑셀 데이터 실시간 동기화!
function syncQuantityAndBudget() {
  let totalAmount = 0;
  const budgetGroups = {};

  parsedItems.forEach((item) => {
    const qty = Math.max(1, parseInt(item.qty) || 1);
    const unitPrice = Math.max(0, parseInt(item.unitPrice) || 0);
    const bNum = parseInt(item.budgetNum) || 1;
    item.qty = qty;
    item.unitPrice = unitPrice;
    item.budgetNum = bNum;
    item.totalPrice = qty * unitPrice;
    totalAmount += item.totalPrice;

    budgetGroups[bNum] = (budgetGroups[bNum] || 0) + item.totalPrice;
  });

  if (totalAmountText) totalAmountText.textContent = `${totalAmount.toLocaleString()}원`;
  if (quickTotalBadge) quickTotalBadge.textContent = `총 ${totalAmount.toLocaleString()}원`;
  if (itemCount) itemCount.textContent = parsedItems.length;

  // 다중 예산 사용 시 상단 요약 바 갱신
  const usedBudgetKeys = Object.keys(budgetGroups).sort((a, b) => Number(a) - Number(b));
  if (budgetSummaryBox && budgetSummaryList) {
    if (usedBudgetKeys.length > 1) {
      budgetSummaryBox.style.display = "block";
      budgetSummaryList.innerHTML = usedBudgetKeys.map(k => {
        const sub = budgetGroups[k];
        const count = parsedItems.filter(it => (it.budgetNum || 1) === Number(k)).length;
        return `<div style="display:flex; justify-content:space-between; align-items:center; padding:2px 0;">
          <span style="font-weight:600; color:var(--text);">${k}번 예산: ${count}개 품목</span>
          <span style="font-weight:700; color:var(--accent);">${sub.toLocaleString()}원</span>
        </div>`;
      }).join("");
    } else {
      budgetSummaryBox.style.display = "none";
    }
  }

  // 기안문 본문('다. 소요예산: 금...원 (금...원)') 줄을 찾아 실시간 금액 및 한글 금액 자동 갱신!
  if (draftBody && draftBody.value) {
    const koreanWon = numberToKorean(totalAmount);
    const updatedBudgetLine = `  다. 소요예산: 금${totalAmount.toLocaleString()}원 (금${koreanWon}원)`;

    draftBody.value = draftBody.value.replace(
      /^\s*다\.\s*소요예산\s*:[\s\S]*?(?=\n\s*[라-하]\.|\n붙임|\n\n|$)/m,
      updatedBudgetLine
    );

    // 라. 산출내역도 품목 수에 맞춰 실시간 갱신 (예: '무선 마이크 외 3건(품의명세서 참조)')
    if (parsedItems.length > 0) {
      const repItem = parsedItems[0]?.name || "물품";
      const countText = parsedItems.length > 1
        ? `${repItem} 외 ${parsedItems.length - 1}건(품의명세서 참조)`
        : `${repItem}(품의명세서 참조)`;
      draftBody.value = draftBody.value.replace(
        /^\s*라\.\s*산출내역\s*:.*$/m,
        `  라. 산출내역: ${countText}`
      );
    }
  }

  // 사전 엑셀 데이터도 최신 수량/금액으로 즉시 갱신
  try {
    const excelB64 = generateExcelBase64();
    if (excelB64) {
      const safeTitle = (draftTitle.value.trim() || "품목내역").replace(/[\/\\?%*:|"<>]/g, "_");
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      chrome.storage.local.set({
        latestExcelBase64: excelB64,
        latestExcelName: `${safeTitle}_${today}.xlsx`
      });
    }
  } catch (e) {}
}

// 상단 빠른 수량 조절 바 & 품목 상세 표 동시 렌더링
function renderItemsUI() {
  if (!parsedItems) return;
  itemsTableBody.innerHTML = "";
  if (quickQtyList) quickQtyList.innerHTML = "";

  parsedItems.forEach((item, idx) => {
    const qty = Math.max(1, parseInt(item.qty) || 1);
    const unitPrice = Math.max(0, parseInt(item.unitPrice) || 0);
    const bNum = parseInt(item.budgetNum) || 1;
    const totalPrice = qty * unitPrice;
    item.qty = qty;
    item.unitPrice = unitPrice;
    item.budgetNum = bNum;
    item.totalPrice = totalPrice;

    // 1) 상단 '구매 수량 빠른 조절' 카드 아이템 생성 (기안문 탭에서도 바로 조절 가능!)
    if (quickQtyList) {
      const rowDiv = document.createElement("div");
      rowDiv.className = "quick-qty-row";
      rowDiv.innerHTML = `
        <div style="flex:1; min-width:0; font-size:12px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;" title="${item.name || ''}">
          <select class="quick-budget-select" title="이 물품을 지출할 예산 번호 선택 (1번 예산/2번 예산 등)" style="padding:1px 3px; font-size:10px; font-weight:700; border:1px solid var(--accent-border); border-radius:4px; background:var(--accent-soft); color:var(--accent); cursor:pointer; flex-shrink:0;">
            <option value="1" ${bNum === 1 ? 'selected' : ''}>1번 예산</option>
            <option value="2" ${bNum === 2 ? 'selected' : ''}>2번 예산</option>
            <option value="3" ${bNum === 3 ? 'selected' : ''}>3번 예산</option>
            <option value="4" ${bNum === 4 ? 'selected' : ''}>4번 예산</option>
          </select>
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${idx + 1}. ${item.name || "물품"}</span>
          <span style="font-size:11px; color:var(--text-3); font-weight:400; flex-shrink:0;">(${unitPrice.toLocaleString()}원)</span>
        </div>
        <div style="display:flex; align-items:center; gap:3px; flex-shrink:0;">
          <button type="button" class="qty-btn-minus qty-stepper-btn" title="1 감소">-</button>
          <input type="number" class="qty-direct-input" min="1" value="${qty}" />
          <button type="button" class="qty-btn-plus qty-stepper-btn" title="1 증가">+</button>
          <span style="font-size:11px; color:var(--text-2); margin-left:2px;">${item.unit || "개"}</span>
        </div>
        <div class="quick-item-total" style="font-size:12px; font-weight:700; color:var(--accent); min-width:68px; text-align:right; flex-shrink:0;">
          ${totalPrice.toLocaleString()}원
        </div>
      `;

      const minusBtn = rowDiv.querySelector(".qty-btn-minus");
      const plusBtn = rowDiv.querySelector(".qty-btn-plus");
      const qtyInput = rowDiv.querySelector(".qty-direct-input");

      minusBtn.addEventListener("click", () => {
        if (item.qty > 1) {
          item.qty -= 1;
          renderItemsUI();
          syncQuantityAndBudget();
        }
      });

      plusBtn.addEventListener("click", () => {
        item.qty += 1;
        renderItemsUI();
        syncQuantityAndBudget();
      });

      const quickBudgetSel = rowDiv.querySelector(".quick-budget-select");
      if (quickBudgetSel) {
        quickBudgetSel.addEventListener("change", (e) => {
          item.budgetNum = parseInt(e.target.value) || 1;
          renderItemsUI();
          syncQuantityAndBudget();
        });
      }

      qtyInput.addEventListener("input", (e) => {
        const v = parseInt(e.target.value);
        if (!isNaN(v) && v >= 1) {
          item.qty = v;
          rowDiv.querySelector(".quick-item-total").textContent = `${(item.qty * item.unitPrice).toLocaleString()}원`;
          const trStrong = itemsTableBody.children[idx]?.querySelector(".table-item-total");
          const trQtyInp = itemsTableBody.children[idx]?.querySelector(".table-qty-input");
          if (trStrong) trStrong.textContent = `${(item.qty * item.unitPrice).toLocaleString()}원`;
          if (trQtyInp) trQtyInp.value = item.qty;
          syncQuantityAndBudget();
        }
      });

      qtyInput.addEventListener("blur", () => {
        if (!item.qty || item.qty < 1) item.qty = 1;
        renderItemsUI();
        syncQuantityAndBudget();
      });

      quickQtyList.appendChild(rowDiv);
    }

    // 2) '품목 내역 상세' 탭 테이블 행 생성 (수량 스텝퍼 + 예산 선택 드롭다운 포함)
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        <select class="tbl-budget-select" style="padding:2px 4px; font-size:11px; border:1px solid var(--line); border-radius:4px; background:var(--card); color:var(--text); font-weight:600;">
          <option value="1" ${bNum === 1 ? 'selected' : ''}>1번 예산</option>
          <option value="2" ${bNum === 2 ? 'selected' : ''}>2번 예산</option>
          <option value="3" ${bNum === 3 ? 'selected' : ''}>3번 예산</option>
          <option value="4" ${bNum === 4 ? 'selected' : ''}>4번 예산</option>
        </select>
      </td>
      <td contenteditable="true" data-field="name" title="클릭하여 직접 수정 가능">${item.name || ""}</td>
      <td contenteditable="true" data-field="spec" title="기본 비워둠 (클릭하여 직접 입력 가능)" style="color:var(--text-3);">${item.spec || ""}</td>
      <td style="white-space:nowrap;">
        <div style="display:inline-flex; align-items:center; gap:2px;">
          <button type="button" class="tbl-qty-minus qty-stepper-btn" style="width:20px; height:20px; font-size:11px;">-</button>
          <input type="number" class="table-qty-input" min="1" value="${qty}" style="width:38px; height:20px; text-align:center; border:1px solid var(--accent); border-radius:4px; font-size:11px; font-weight:700; color:var(--accent); background:var(--card);" />
          <button type="button" class="tbl-qty-plus qty-stepper-btn" style="width:20px; height:20px; font-size:11px;">+</button>
        </div>
      </td>
      <td contenteditable="true" data-field="unit" title="클릭하여 직접 수정 가능">${item.unit || "개"}</td>
      <td contenteditable="true" data-field="unitPrice" title="클릭하여 직접 수정 가능">${unitPrice.toLocaleString()}원</td>
      <td><strong class="table-item-total" style="color:var(--text);">${totalPrice.toLocaleString()}원</strong></td>
    `;

    const budgetSel = tr.querySelector(".tbl-budget-select");
    budgetSel.addEventListener("change", (e) => {
      item.budgetNum = parseInt(e.target.value) || 1;
      renderItemsUI();
      syncQuantityAndBudget();
    });

    tr.querySelector(".tbl-qty-minus").addEventListener("click", () => {
      if (item.qty > 1) {
        item.qty -= 1;
        renderItemsUI();
        syncQuantityAndBudget();
      }
    });

    tr.querySelector(".tbl-qty-plus").addEventListener("click", () => {
      item.qty += 1;
      renderItemsUI();
      syncQuantityAndBudget();
    });

    tr.querySelector(".table-qty-input").addEventListener("input", (e) => {
      const v = parseInt(e.target.value);
      if (!isNaN(v) && v >= 1) {
        item.qty = v;
        syncQuantityAndBudget();
        tr.querySelector(".table-item-total").textContent = `${(item.qty * item.unitPrice).toLocaleString()}원`;
        if (quickQtyList && quickQtyList.children[idx]) {
          const qInp = quickQtyList.children[idx].querySelector(".qty-direct-input");
          const qTot = quickQtyList.children[idx].querySelector(".quick-item-total");
          if (qInp) qInp.value = item.qty;
          if (qTot) qTot.textContent = `${(item.qty * item.unitPrice).toLocaleString()}원`;
        }
      }
    });

    tr.querySelector(".table-qty-input").addEventListener("blur", () => {
      if (!item.qty || item.qty < 1) item.qty = 1;
      renderItemsUI();
      syncQuantityAndBudget();
    });

    // 인라인 수정 이벤트 리스너 (품목명, 규격, 단위, 단가)
    tr.querySelectorAll('[contenteditable="true"]').forEach(cell => {
      cell.addEventListener('blur', (e) => {
        const field = e.target.dataset.field;
        let val = e.target.textContent.replace(/[원,]/g, '').trim();
        if (field === 'name') item.name = val;
        else if (field === 'spec') item.spec = (val === '-' ? '' : val);
        else if (field === 'unit') item.unit = val || "개";
        else if (field === 'unitPrice') {
          item.unitPrice = parseInt(val) || 0;
        }
        renderItemsUI();
        syncQuantityAndBudget();
      });
    });

    itemsTableBody.appendChild(tr);
  });
}

// 수동 1행 직접 추가
if (btnManualAddRow) {
  btnManualAddRow.addEventListener("click", () => {
    if (!parsedItems) parsedItems = [];
    parsedItems.push({
      name: "추가 물품",
      s2bCode: "",
      spec: "",
      qty: 1,
      unit: "개",
      unitPrice: 0,
      budgetNum: 1,
      totalPrice: 0
    });
    renderItemsUI();
    syncQuantityAndBudget();
    updateAnalyzeButtonState();
  });
}

// 결과 렌더링 및 기안문 조립
function renderResults(parsed, usage, ref) {
  const items = parsed.items;
  items.forEach((item) => {
    item.spec = sanitizeSpec(item.spec);
    item.qty = Math.max(1, parseInt(item.qty) || 1);
    item.unitPrice = Math.max(0, parseInt(item.unitPrice) || 0);
    item.budgetNum = parseInt(item.budgetNum) || 1;
    item.totalPrice = item.qty * item.unitPrice;
  });

  const totalAmount = items.reduce((acc, it) => acc + it.totalPrice, 0);

  // 제목 생성
  const repName = parsed.representativeName || items[0]?.name || "물품";
  const titleUsage = usage ? `${usage} ` : "";
  const title = `${titleUsage}${repName} 구입`;
  draftTitle.value = title;

  // 본문 조립
  const repItem = items[0]?.name || repName;
  const itemCountText = items.length > 1 ? `${repItem} 외 ${items.length - 1}건(품의명세서 참조)` : `${repItem}(품의명세서 참조)`;
  const koreanWon = numberToKorean(totalAmount);

  let bodyLines = [];
  if (ref) {
    bodyLines.push(`1. 관련: ${ref}`);
  } else {
    bodyLines.push(`1. 관련: 없음`);
  }

  bodyLines.push(`2. ${usage || "관련"} 물품을 아래와 같이 구입하고자 합니다.`);
  bodyLines.push(`  가. 내역: ${repName}`);
  bodyLines.push(`  나. 용도: ${usage || "물품 구입"}`);
  bodyLines.push(`  다. 소요예산: 금${totalAmount.toLocaleString()}원 (금${koreanWon}원)`);
  bodyLines.push(`  라. 산출내역: ${itemCountText}`);
  bodyLines.push(``);
  bodyLines.push(`붙임  지출(지급)품의서 1부.  끝.`);

  draftBody.value = bodyLines.join("\n");

  renderItemsUI();
  syncQuantityAndBudget();
}

// -------------------------------------------------------------
// 에듀파인에 새로고침 없이 즉시 입력 (기안문 + 4단계 시퀀스 품목 그리드)
// -------------------------------------------------------------
async function injectedFiller(title, body, items) {
  // DOM 노드에서 연결된 Nexacro JS 컨트롤 객체 추출 헬퍼
  function getNexacroControlFromDom(domEl) {
    let cur = domEl;
    while (cur) {
      const le = cur._linked_element || cur._element;
      if (le) {
        if (le.linkedcontrol) return le.linkedcontrol;
        if (le.parent) return le.parent;
        if (le._control_element?.parent) return le._control_element.parent;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  // Nexacro 컴포넌트 ID 경로(mainframe.MainVFrameSet...)로 JS 컴포넌트 탐색
  function resolveNexacroComponent(win, rawId, domEl) {
    if (domEl) {
      let ctrl = getNexacroControlFromDom(domEl);
      // 하위 서브컨트롤(icontext, celledit 등)일 경우 실제 상위 컴포넌트 탐색
      if (ctrl && rawId) {
        const targetName = rawId.split(':')[0].split('.').pop();
        let p = ctrl;
        for (let i = 0; i < 8 && p; i++) {
          if (p.id === targetName || p.name === targetName || typeof p.getCellProperty === 'function' || p._type_name === 'Grid' || typeof p.getBindDataset === 'function') {
            return p;
          }
          p = p.parent;
        }
        return ctrl;
      }
      if (ctrl) return ctrl;
    }

    if (!rawId) return null;
    try {
      const cleanPath = rawId.split(':')[0];
      const parts = cleanPath.split('.');
      const app = win.nexacro?.getApplication?.() || win._application || win.application;
      let cur = app;
      for (const p of parts) {
        if (!cur) break;
        if (cur[p] !== undefined) {
          cur = cur[p];
        } else if (cur.all && cur.all[p] !== undefined) {
          cur = cur.all[p];
        } else if (cur.components && cur.components[p] !== undefined) {
          cur = cur.components[p];
        } else if (cur.form && cur.form[p] !== undefined) {
          cur = cur.form[p];
        } else {
          cur = null;
          break;
        }
      }
      if (cur) return cur;
    } catch(e) {}
    return null;
  }

  // Nexacro Grid에 연결된 실제 Dataset 객체 정밀 추출
  function resolveNexacroDataset(nxGrid, win) {
    if (!nxGrid) return null;
    let ds = null;
    try {
      if (typeof nxGrid.getBindDataset === 'function') ds = nxGrid.getBindDataset();
    } catch(e) {}
    if (ds && typeof ds.setColumn === 'function') return ds;

    const rawDs = nxGrid.binddataset || nxGrid._binddataset;
    if (rawDs && typeof rawDs === 'object' && typeof rawDs.setColumn === 'function') {
      return rawDs;
    }

    const dsId = (typeof rawDs === 'string') ? rawDs.trim() : '';
    if (dsId) {
      try {
        if (nxGrid._refform && nxGrid._refform[dsId] && typeof nxGrid._refform[dsId].setColumn === 'function') {
          return nxGrid._refform[dsId];
        }
      } catch(e) {}
      try {
        if (nxGrid.parent && nxGrid.parent[dsId] && typeof nxGrid.parent[dsId].setColumn === 'function') {
          return nxGrid.parent[dsId];
        }
      } catch(e) {}
      try {
        if (typeof nxGrid._findDataset === 'function') {
          const found = nxGrid._findDataset(dsId);
          if (found && typeof found.setColumn === 'function') return found;
        }
      } catch(e) {}
      try {
        let p = nxGrid.parent;
        for (let i = 0; i < 10 && p; i++) {
          if (p[dsId] && typeof p[dsId].setColumn === 'function') return p[dsId];
          if (p.all && p.all[dsId] && typeof p.all[dsId].setColumn === 'function') return p.all[dsId];
          if (p.objects && p.objects[dsId] && typeof p.objects[dsId].setColumn === 'function') return p.objects[dsId];
          if (p._datasets && p._datasets[dsId] && typeof p._datasets[dsId].setColumn === 'function') return p._datasets[dsId];
          p = p.parent;
        }
      } catch(e) {}
    }

    // 폼 내부의 Dataset 목록에서 품목 Dataset 직접 검색
    try {
      let p = nxGrid.parent || nxGrid._refform;
      while (p) {
        const pool = [p, p.objects, p.all, p._datasets].filter(Boolean);
        for (const bucket of pool) {
          for (const k in bucket) {
            const item = bucket[k];
            if (item && typeof item.setColumn === 'function' && typeof item.getColCount === 'function') {
              const nameLower = (item.id || item.name || k).toLowerCase();
              if (nameLower.includes('item') || nameLower.includes('prdlst') || nameLower.includes('gds') || nameLower.includes('list')) {
                return item;
              }
            }
          }
        }
        p = p.parent;
      }
    } catch(e) {}
    return null;
  }

  // Nexacro Grid 및 Dataset 컬럼 매핑 분석
  function resolveDatasetColumns(nxGrid, nxDs) {
    const colMap = {
      name: null,
      spec: null,
      qty: null,
      unit: null,
      price: null,
      amt: null,
      budget: null,
      allAmtColIds: [],
      allPriceColIds: [],
      allQtyColIds: []
    };

    if (nxGrid && typeof nxGrid.getCellCount === 'function' && typeof nxGrid.getCellProperty === 'function') {
      try {
        const bodyCount = nxGrid.getCellCount('body');
        const headCount = nxGrid.getCellCount('head') || 0;

        const headTextByCol = {};
        for (let h = 0; h < headCount; h++) {
          try {
            const hCol = nxGrid.getCellProperty('head', h, 'col');
            const hTxt = String(nxGrid.getCellProperty('head', h, 'text') || '').replace(/\s+/g, '');
            if (hCol !== undefined && hTxt) {
              headTextByCol[hCol] = hTxt;
            }
          } catch(e) {}
        }

        for (let c = 0; c < bodyCount; c++) {
          const bindTxt = String(nxGrid.getCellProperty('body', c, 'text') || '');
          let colId = '';
          if (bindTxt.toLowerCase().startsWith('bind:')) {
            colId = bindTxt.slice(5).trim();
          }

          const bodyCol = nxGrid.getCellProperty('body', c, 'col');
          const headTxt = (headTextByCol[bodyCol] || headTextByCol[c] || '').replace(/\s+/g, '');

          if (!colMap.name && (headTxt.includes('내용') || headTxt.includes('품명'))) {
            colMap.name = { cellIdx: c, colId };
          } else if (!colMap.spec && headTxt.includes('규격')) {
            colMap.spec = { cellIdx: c, colId };
          } else if (!colMap.qty && headTxt.includes('수량')) {
            colMap.qty = { cellIdx: c, colId };
            if (colId && !colMap.allQtyColIds.includes(colId)) colMap.allQtyColIds.push(colId);
          } else if (!colMap.unit && headTxt.includes('단위')) {
            colMap.unit = { cellIdx: c, colId };
          } else if (!colMap.price && (headTxt.includes('예상단가') || headTxt.includes('단가')) && !headTxt.includes('금액')) {
            colMap.price = { cellIdx: c, colId };
            if (colId && !colMap.allPriceColIds.includes(colId)) colMap.allPriceColIds.push(colId);
          } else if (!colMap.amt && (headTxt.includes('예상금액') || headTxt.includes('금액'))) {
            colMap.amt = { cellIdx: c, colId };
            if (colId && !colMap.allAmtColIds.includes(colId)) colMap.allAmtColIds.push(colId);
          }
        }

        // 에듀파인 표준 그리드 인덱스 폴백: [0:체크박스, 1:상태(N), 2:순번, 3:*내용, 4:규격, 5:수량, 6:단위, 7:예상단가, 8:*예상금액]
        function getBindCol(idx) {
          if (idx >= bodyCount) return '';
          const t = String(nxGrid.getCellProperty('body', idx, 'text') || '');
          return t.toLowerCase().startsWith('bind:') ? t.slice(5).trim() : '';
        }
        if (!colMap.name?.colId && bodyCount > 3) colMap.name = { cellIdx: 3, colId: getBindCol(3) };
        if (!colMap.spec?.colId && bodyCount > 4) colMap.spec = { cellIdx: 4, colId: getBindCol(4) };
        if (!colMap.qty?.colId && bodyCount > 5) {
          colMap.qty = { cellIdx: 5, colId: getBindCol(5) };
          if (colMap.qty.colId && !colMap.allQtyColIds.includes(colMap.qty.colId)) colMap.allQtyColIds.push(colMap.qty.colId);
        }
        if (!colMap.unit?.colId && bodyCount > 6) colMap.unit = { cellIdx: 6, colId: getBindCol(6) };
        if (!colMap.price?.colId && bodyCount > 7) {
          colMap.price = { cellIdx: 7, colId: getBindCol(7) };
          if (colMap.price.colId && !colMap.allPriceColIds.includes(colMap.price.colId)) colMap.allPriceColIds.push(colMap.price.colId);
        }
        if (!colMap.amt?.colId && bodyCount > 8) {
          colMap.amt = { cellIdx: 8, colId: getBindCol(8) };
          if (colMap.amt.colId && !colMap.allAmtColIds.includes(colMap.amt.colId)) colMap.allAmtColIds.push(colMap.amt.colId);
        } else if (!colMap.amt?.colId && bodyCount > 7) {
          colMap.amt = { cellIdx: 7, colId: getBindCol(7) };
          if (colMap.amt.colId && !colMap.allAmtColIds.includes(colMap.amt.colId)) colMap.allAmtColIds.push(colMap.amt.colId);
        }
      } catch(e) {}
    }

    if (nxDs && typeof nxDs.getColCount === 'function' && typeof nxDs.getColID === 'function') {
      try {
        const colCount = nxDs.getColCount();
        for (let i = 0; i < colCount; i++) {
          const id = String(nxDs.getColID(i) || '').trim();
          const lower = id.toLowerCase();
          if ((!colMap.name || !colMap.name.colId) &&
              (/^(item_nm|item_desc|prdlst_nm|itm_nm|gds_nm|itemnm|name|cn|prdlst_cn|prdlst_title|demand_nm|item_name)$/i.test(lower) ||
               (lower.includes('prdlst') && lower.includes('nm')) ||
               (lower.includes('item') && lower.includes('nm')))) {
            colMap.name = { ...(colMap.name || {}), colId: id };
          } else if ((!colMap.spec || !colMap.spec.colId) &&
                     (/^(item_spec|spec|std|stnd_nm|spec_desc|std_nm|prdlst_stnd|prdlst_spec)$/i.test(lower) ||
                      lower.includes('stnd') || lower.includes('spec'))) {
            colMap.spec = { ...(colMap.spec || {}), colId: id };
          }

          // 수량 컬럼 식별
          if (/^(qty|req_qty|item_qty|cnt|order_qty|prdlst_qty|demand_qty)$/i.test(lower) || lower.includes('qty')) {
            if (!colMap.qty || !colMap.qty.colId) colMap.qty = { ...(colMap.qty || {}), colId: id };
            if (!colMap.allQtyColIds.includes(id)) colMap.allQtyColIds.push(id);
          }

          // 단위 컬럼 식별
          if ((!colMap.unit || !colMap.unit.colId) &&
              (/^(unit|unit_cd|item_unit|unt_cd|unt_nm|prdlst_unt)$/i.test(lower) ||
               (lower.includes('unt') && lower.includes('cd')))) {
            colMap.unit = { ...(colMap.unit || {}), colId: id };
          }

          // 예상단가 컬럼 식별
          if (/^(unit_price|est_unit_price|uprc|price|req_uprc|unt_prc|expct_uprc|prdlst_uprc|estm_uprc|unit_prc|expct_prc|estm_prc|req_prc)$/i.test(lower) ||
              lower.includes('uprc') || (lower.includes('price') && !lower.includes('amt'))) {
            if (!colMap.price || !colMap.price.colId) colMap.price = { ...(colMap.price || {}), colId: id };
            if (!colMap.allPriceColIds.includes(id)) colMap.allPriceColIds.push(id);
          }

          // 예상금액 컬럼 식별 (핵심 필수값: 누락 완벽 방어)
          if (/^(est_amt|amt|req_amt|tot_amt|total_amt|item_amt|expct_amt|prdlst_amt|estm_amt|prdlst_expct_amt|req_expct_amt|demand_amt|dsgn_amt|exp_amt)$/i.test(lower) ||
              (lower.includes('amt') && !lower.includes('uprc') && !lower.includes('prc'))) {
            if (!colMap.amt || !colMap.amt.colId) colMap.amt = { ...(colMap.amt || {}), colId: id };
            if (!colMap.allAmtColIds.includes(id)) colMap.allAmtColIds.push(id);
          }

          // 예산 식별
          if ((!colMap.budget || !colMap.budget.colId) &&
              /^(budget_no|budget_sn|bdg_cd|bg_sn|budget_num)$/i.test(lower)) {
            colMap.budget = { ...(colMap.budget || {}), colId: id };
          }
        }
      } catch(e) {}
    }

    return colMap;
  }

  function applyValue(el, val, triggerEnter = false) {
    if (!el) return;
    const strVal = String(val ?? '');
    try {
      el.focus();
      el.value = strVal;

      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(el, strVal);
      }

      const win = el.ownerDocument.defaultView || window;

      // 1) Nexacro 전용 컴포넌트(Edit, TextArea, CellEditControl) 바인딩 및 Dataset 동기화
      try {
        const nxCtrl = resolveNexacroComponent(win, el.id, el);
        if (nxCtrl) {
          let targetComp = nxCtrl;
          // :input 또는 :textarea 내부 컨트롤이면 부모 Edit/TextArea/CellEdit도 함께 갱신
          for (let depth = 0; depth < 3 && targetComp; depth++) {
            if (typeof targetComp.set_value === 'function') {
              try { targetComp.set_value(strVal); } catch(e) {}
            }
            if (typeof targetComp.updateToDataset === 'function') {
              try { targetComp.updateToDataset(); } catch(e) {}
            }
            targetComp = targetComp.parent;
          }
        }
      } catch(e) {}

      // 2) WebSquare 호환 바인딩
      if (el.id) {
        try {
          if (win[el.id]?.setValue) win[el.id].setValue(strVal);
          if (win.$p?.getComponentById) win.$p.getComponentById(el.id)?.setValue(strVal);
          if (win.WebSquare?.util?.getComponentById) win.WebSquare.util.getComponentById(el.id)?.setValue(strVal);
        } catch(e) {}
      }

      el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      if (triggerEnter) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }
    } catch (e) {
      el.value = strVal;
    }
  }

  // 달력 아이콘 또는 날짜 형식 필드인지 철저 검사
  function isCalendarOrDateField(el) {
    if (!el) return true;
    const str = `${el.id || ''} ${el.name || ''} ${el.title || ''} ${el.className || ''}`.toLowerCase();
    if (str.includes('w2inputcalendar') || str.includes('calendar') || str.includes('reqdt') || str.includes('reqdate') || str.includes('cmpldt') || str.includes('일자')) {
      return true;
    }
    const parent = el.parentElement;
    if (parent) {
      const pstr = `${parent.className || ''} ${parent.id || ''}`.toLowerCase();
      if (pstr.includes('calendar') || pstr.includes('w2inputcalendar')) return true;
      if (parent.querySelector('img[src*="cal" i], button[class*="cal" i], a[class*="cal" i], span[class*="calendar" i]')) {
        return true;
      }
    }
    if (el.value && /^\d{4}[-.]\d{2}[-.]\d{2}$/.test(el.value.trim())) {
      return true;
    }
    return false;
  }

  // 상위/하위 중첩 iframe을 모두 재귀적으로 수집
  function getAllDocuments() {
    const docs = [document];
    function collect(doc) {
      try {
        const iframes = Array.from(doc.querySelectorAll('iframe, frame'));
        for (const f of iframes) {
          try {
            const d = f.contentDocument || f.contentWindow?.document;
            if (d && !docs.includes(d)) {
              docs.push(d);
              collect(d);
            }
          } catch(e) {}
        }
      } catch(e) {}
    }
    collect(document);
    return docs;
  }

  const allDocs = getAllDocuments();
  let titleFound = false;
  let bodyFound = false;
  let itemsInjectedCount = 0;
  let diagGridFound = false;
  let diagRowCount = 0;

  // ★ 핵심: 배경에 숨겨진 탭(품의목록 등)을 배제하고, 화면에 실제로 보이는 '품의등록' 활성 탭 문서 특정!
  function findActiveProposalDoc(docs) {
    // 1순위: btnRowAdit([행추가]) 또는 grdPrdlstDtl(품목 그리드) 컴포넌트가 직접 존재하는 활성 작업 폼 문서!
    for (const doc of docs) {
      try {
        const gridOrBtn = doc.querySelector('[id*="btnRowAdit"], [id*="grdPrdlstDtl"]');
        if (gridOrBtn && gridOrBtn.getBoundingClientRect().width > 0) {
          return doc;
        }
      } catch(e) {}
    }
    // 2순위: 텍스트 기반 품목내역/품의등록 표시 문서
    for (const doc of docs) {
      try {
        const all = Array.from(doc.querySelectorAll('*'));
        for (const el of all) {
          if (el.children.length > 2) continue;
          const txt = (el.textContent || '').trim().replace(/\s+/g, '');
          if (txt.includes('품목내역') || txt.includes('품의등록') || txt.includes('지출품의')) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return doc;
            }
          }
        }
      } catch(e) {}
    }
    return null;
  }

  const activeDoc = findActiveProposalDoc(allDocs) || document;

  // 0. 에듀파인 예산 선택 여부 점검 및 예산 행 수집 (v2.2.3 정밀 판정)
  // 0. 에듀파인 예산 선택 여부 점검 (v2.5.5: '세부사업' 예산 그리드 1:1 매핑 정밀 판정)
  function checkBudgetSelected(doc) {
    try {
      const win = doc.defaultView || window;
      const addRowBtn = findAddRowButton(doc);
      const itemGridEl = doc.querySelector('[id*="grdPrdlstDtl"]');

      // 품목 [행추가] 버튼이나 품목 그리드가 전혀 없는 프레임은 품의등록 작업 화면이 아님
      if (!addRowBtn && !itemGridEl) {
        return { selected: true, isProposalScreen: false, budgetRows: [], reason: 'not_proposal_frame' };
      }

      const itemTop = (addRowBtn?.clickable || addRowBtn?.leaf || itemGridEl)?.getBoundingClientRect().top || 99999;
      const allNodes = Array.from(doc.querySelectorAll('*'));

      // 1) 예산 그리드 전용 헤더 셀 탐색 ('세부사업' 또는 '원가통계비목')
      // - 왼쪽 메뉴(r.left < 180) 철저 배제!
      // - 실제 표 헤더(.head.) 셀만 지정
      const budgetHeadCell = allNodes.find(el => {
        const id = el.id || '';
        if (!id.includes('.head.') && el.tagName !== 'TH') return false;
        const t = (el.textContent || '').trim().replace(/\s+/g, '');
        const r = el.getBoundingClientRect();
        return (t === '세부사업' || t === '*세부사업' || t === '원가통계비목' || t === '산출내역') &&
               r.width > 20 && r.height > 10 && r.left >= 180;
      });

      let budgetGridId = '';
      if (budgetHeadCell) {
        budgetGridId = budgetHeadCell.id.split('.head.')[0].split(':')[0];
      }

      // 2) 예산 그리드의 실제 데이터 행(.body.gridrow_)만 정밀 조회!
      let validRows = [];
      if (budgetGridId) {
        validRows = Array.from(doc.querySelectorAll(`[id^="${budgetGridId}.body.gridrow_"]`)).filter(el => {
          return /\.body\.gridrow_\d+$/.test(el.id || '');
        });
      } else {
        // 폴백: 품목 그리드(grdPrdlstDtl) 및 왼쪽 메뉴(left < 180)를 제외한 예산 영역 행
        validRows = Array.from(doc.querySelectorAll('[id*=".body.gridrow_"]')).filter(el => {
          const id = el.id || '';
          if (!/\.body\.gridrow_\d+$/.test(id)) return false;
          if (id.includes('grdPrdlstDtl') || id.includes('divAuth2') || id.includes('grdLeft') || id.includes('grdMenu')) return false;
          const r = el.getBoundingClientRect();
          return r.left >= 180 && r.width > 100 && r.height > 10 && r.top < itemTop - 10;
        });
      }

      // 3) 찾은 예산 행의 실제 내용 검사:
      // - 빈 행(데이터 없음), '조회된 결과가 없습니다' 등은 예산 미선택!
      // - 실제 과목명(2글자 이상 한글)과 유효 금액 숫자가 존재해야만 '예산 선택 완료' 판정!
      let isBudgetPresent = false;
      let budgetDetailText = '';

      for (const row of validRows) {
        const raw = (row.textContent || '').replace(/\s+/g, '');
        if (!raw || raw === 'N' || raw.includes('조회') || raw.includes('없습니다') || raw.includes('결과가없습니다')) continue;

        // 실제 예산 세부사업명(한글 2글자 이상)이 존재하는지 확인
        const hasKoreanSubject = /[가-힣]{2,}/.test(raw);
        // 금액 숫자(1,000원 이상)가 포함되어 있는지 확인
        const hasNumber = /\d{1,3},\d{3}/.test(raw) || /\d{4,}/.test(raw);

        if (hasKoreanSubject && hasNumber) {
          isBudgetPresent = true;
          budgetDetailText = raw.slice(0, 30);
          break;
        }
      }

      // 4) Nexacro Dataset(nxDs)으로 2차 확정 검증
      if (!isBudgetPresent && budgetGridId) {
        try {
          const nxGrid = resolveNexacroComponent(win, budgetGridId, doc.getElementById(budgetGridId));
          if (nxGrid) {
            const nxDs = resolveNexacroDataset(nxGrid, win);
            if (nxDs && typeof nxDs.getRowCount === 'function' && nxDs.getRowCount() > 0) {
              for (let c = 0; c < (nxDs.getColCount?.() || 10); c++) {
                const v = String(nxDs.getColumn(0, c) ?? '').trim();
                if (v && /[가-힣]{2,}/.test(v) && !v.includes('조회')) {
                  isBudgetPresent = true;
                  budgetDetailText = `ds:${v}`;
                  break;
                }
              }
            }
          }
        } catch(e) {}
      }

      return {
        selected: isBudgetPresent,
        isProposalScreen: true,
        budgetRows: validRows,
        reason: isBudgetPresent ? `selected_budget(${budgetDetailText})` : 'no_budget_selected'
      };
    } catch(e) {
      return { selected: true, isProposalScreen: false, budgetRows: [], reason: `error:${e.message}` };
    }
  }

  const budgetCheck = checkBudgetSelected(activeDoc);
  if (budgetCheck.isProposalScreen && !budgetCheck.selected) {
    return {
      titleFound: false,
      bodyFound: false,
      itemsInjectedCount: 0,
      diagGridFound: true,
      diagRowCount: 0,
      isProposalScreen: true,
      budgetNotSelected: true,
      diagDetail: `예산미선택(${budgetCheck.reason})`,
      url: location.href
    };
  }

  // 1. 활성 탭 화면에서 본문(개요) textarea 탐색 및 주입
  let foundTextarea = null;
  if (body) {
    try {
      const visibleTextareas = Array.from(activeDoc.querySelectorAll('textarea')).filter(ta => {
        const rect = ta.getBoundingClientRect();
        return rect.width > 50 && rect.height > 30 && !ta.disabled;
      });

      if (visibleTextareas.length > 0) {
        foundTextarea = visibleTextareas[0];
        applyValue(foundTextarea, body);
        foundTextarea.blur();
        foundTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
        bodyFound = true;
      } else {
        // contenteditable 에디터 확인
        const visibleEdits = Array.from(activeDoc.querySelectorAll('body[contenteditable="true"], .dext_body, div[contenteditable="true"]')).filter(ed => {
          const rect = ed.getBoundingClientRect();
          return rect.width > 50 && rect.height > 30;
        });
        if (visibleEdits.length > 0) {
          visibleEdits[0].innerHTML = body.replace(/\n/g, '<br>');
          visibleEdits[0].dispatchEvent(new Event('input', { bubbles: true }));
          bodyFound = true;
        }
      }
    } catch(e) {
      console.warn("본문 주입 오류:", e);
    }
  }

  // 2. 활성 탭 화면에서 제목(품의제목) input 탐색 및 주입
  if (title) {
    try {
      const visibleInputs = Array.from(activeDoc.querySelectorAll('input')).filter(inp => {
        const rect = inp.getBoundingClientRect();
        const type = (inp.type || 'text').toLowerCase();
        return rect.width > 80 && rect.height > 15 &&
               !['hidden', 'checkbox', 'radio', 'button', 'submit'].includes(type) &&
               !inp.readOnly && !inp.disabled &&
               !isCalendarOrDateField(inp);
      });

      let titleInput = null;

      // 2-1: textarea 바로 앞에 위치한 넓은 텍스트 input
      if (foundTextarea && visibleInputs.length > 0) {
        const beforeTa = visibleInputs.filter(inp => {
          try {
            return (inp.compareDocumentPosition(foundTextarea) & Node.DOCUMENT_POSITION_FOLLOWING);
          } catch(e) { return true; }
        });
        if (beforeTa.length > 0) {
          titleInput = beforeTa[beforeTa.length - 1];
        }
      }

      // 2-2: '제목' 관련 속성
      if (!titleInput) {
        titleInput = visibleInputs.find(inp => {
          const s = `${inp.id} ${inp.name} ${inp.title} ${inp.className}`.toLowerCase();
          return s.includes('tit') || s.includes('제목');
        });
      }

      // 2-3: 후보 중 첫 번째
      if (!titleInput && visibleInputs.length > 0) {
        titleInput = visibleInputs[0];
      }

      if (titleInput) {
        applyValue(titleInput, title);
        titleInput.blur();
        titleInput.dispatchEvent(new Event('blur', { bubbles: true }));
        titleFound = true;
      }
    } catch(e) {
      console.warn("제목 주입 오류:", e);
    }
  }

  // -------------------------------------------------------------------------
  // 3. 에듀파인 품목 표 자동 행추가 & 시각적 셀 타이핑 시퀀스 (v1.8.0)
  // -------------------------------------------------------------------------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let diagDetail = "";

  // 화면 우상단 실시간 진행 안내 배너
  function createOrUpdateBanner(targetDoc, text, color = '#1a73e8') {
    try {
      let b = targetDoc.getElementById('edufine_assistant_live_badge');
      if (!b) {
        b = targetDoc.createElement('div');
        b.id = 'edufine_assistant_live_badge';
        b.style.cssText = `
          position: fixed;
          top: 16px;
          right: 24px;
          z-index: 99999999;
          background: ${color};
          color: #ffffff;
          padding: 12px 22px;
          border-radius: 10px;
          font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 6px 24px rgba(0,0,0,0.4);
          pointer-events: none;
          transition: all 0.2s ease;
        `;
        (targetDoc.body || targetDoc.documentElement).appendChild(b);
      } else {
        b.style.background = color;
      }
      b.textContent = text;
      return b;
    } catch(e) { return null; }
  }

  // 클릭/입력 위치에 시각적 플로팅 포인터 표시 (선생님이 눈으로 직접 확인 가능!)
  function showFloatingPointer(targetDoc, targetEl, labelText, bgColor = '#ff3d00') {
    try {
      const rect = targetEl.getBoundingClientRect();
      let ptr = targetDoc.getElementById('edufine_visual_pointer');
      if (!ptr) {
        ptr = targetDoc.createElement('div');
        ptr.id = 'edufine_visual_pointer';
        (targetDoc.body || targetDoc.documentElement).appendChild(ptr);
      }
      ptr.style.cssText = `
        position: fixed;
        left: ${Math.max(8, rect.left)}px;
        top: ${Math.max(8, rect.top - 34)}px;
        z-index: 999999999;
        background: ${bgColor};
        color: #fff;
        font-family: "Malgun Gothic", sans-serif;
        font-size: 12px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 6px;
        box-shadow: 0 3px 12px rgba(0,0,0,0.35);
        pointer-events: none;
        white-space: nowrap;
        transition: all 0.12s ease;
      `;
      ptr.textContent = labelText;
      return ptr;
    } catch(e) { return null; }
  }

  function removeFloatingPointer(targetDoc) {
    try {
      const ptr = targetDoc.getElementById('edufine_visual_pointer');
      if (ptr) ptr.remove();
    } catch(e) {}
  }

  // 3-1. '행추가 +' 버튼 정밀 탐색 (1x1px 접근성 blind 노드 제외, 실제 눈에 보이는 버튼만 타겟팅)
  function findAddRowButton(doc) {
    const all = Array.from(doc.querySelectorAll('*'));
    const candidates = [];

    // '품목내역' 라벨의 Y좌표 파악 (예산내역 영역과 구분)
    let itemSectionTop = 0;
    for (const el of all) {
      if (el.children.length <= 2) {
        const t = (el.textContent || '').trim().replace(/\s+/g, '');
        if (t === '품목내역' || t === '|품목내역') {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            itemSectionTop = r.top - 30;
            break;
          }
        }
      }
    }

    for (const el of all) {
      const rawTxt = (el.textContent || el.value || el.title || '').trim().replace(/\s+/g, '');
      if (rawTxt.includes('행추가') && rawTxt.length <= 10) {
        const rect = el.getBoundingClientRect();
        // 실제 버튼 크기(최소 가로 22px, 세로 12px 이상)만 허용하여 1x1px 숨김 스팬 배제
        if (rect.width >= 22 && rect.height >= 12 && rect.top >= itemSectionTop) {
          candidates.push(el);
        }
      }
    }

    if (candidates.length === 0) return null;

    // 면적이 가장 버튼다운(너무 거대한 컨테이너 제외, 가장 구체적인 버튼) 요소 선택
    candidates.sort((a, b) => {
      const rA = a.getBoundingClientRect();
      const rB = b.getBoundingClientRect();
      return (rA.width * rA.height) - (rB.width * rB.height);
    });

    const leaf = candidates[0];
    const clickable = leaf.closest('button, a, input[type="button"], [role="button"], .w2trigger, [class*="btn" i], [id*="btn" i]') || leaf;
    return { clickable, leaf };
  }

  // 3-2. K-에듀파인 Nexacro(넥사크로) 품목내역 Grid 컴포넌트 및 DOM 컨테이너 정밀 탐색
  function findItemGridInfo(doc, addRowBtnInfo) {
    const win = doc.defaultView || window;
    const btnEl = addRowBtnInfo ? (addRowBtnInfo.clickable || addRowBtnInfo.leaf) : null;
    const btnRect = btnEl ? btnEl.getBoundingClientRect() : null;
    const btnBottom = btnRect ? btnRect.bottom : 0;
    const rawBtnId = btnEl?.id || addRowBtnInfo?.leaf?.id || '';

    // 버튼 ID 예시: mainframe.MainVFrameSet.SubHFrameSet.WorkVFrameSet.WorkFrame.winId_... .form.divWork.form.divAuth2.form.btnRowAdit:icontext
    // -> 같은 폼 영역 prefix 추출: ...divWork.form.divAuth2.form
    const cleanBtnId = rawBtnId.split(':')[0];
    const lastDotIdx = cleanBtnId.lastIndexOf('.');
    const sectionPrefix = lastDotIdx > 0 ? cleanBtnId.slice(0, lastDotIdx) : '';

    let gridId = '';
    let gridEl = null;

    // 1순위: 버튼과 동일한 폼 컨테이너(sectionPrefix, 예: divAuth2.form) 내부의 Nexacro Grid 탐색
    if (sectionPrefix) {
      const sameSectionGridNodes = Array.from(doc.querySelectorAll('[id*=".head.gridrow_"], [id*=".body.gridrow_"]')).filter(el => {
        if (!el.id || !el.id.startsWith(sectionPrefix + '.')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 10 && r.height > 10;
      });
      if (sameSectionGridNodes.length > 0) {
        gridId = sameSectionGridNodes[0].id.split('.head.')[0].split('.body.')[0].split(':')[0];
        gridEl = doc.getElementById(gridId);
      }
    }

    // 2순위: [행추가 +] 버튼 바로 아래쪽에 위치한 Nexacro Grid 헤더('* 내용', '규격', '예상단가')로 Grid ID 역추적
    if (!gridId) {
      const headCells = Array.from(doc.querySelectorAll('[id*=".head.gridrow_"]')).filter(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 15 || r.height < 10) return false;
        if (btnBottom > 0 && r.top < btnBottom - 15) return false;
        // 배경 포털(MainFrame) 제외, 실제 업무화면(WorkFrame) 우선
        if (el.id.includes('.MainFrame.')) return false;
        const t = (el.textContent || '').replace(/\s+/g, '');
        return t.includes('내용') || t.includes('규격') || t.includes('수량') || t.includes('예상단가');
      });
      headCells.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      if (headCells.length > 0) {
        gridId = headCells[0].id.split('.head.')[0].split(':')[0];
        gridEl = doc.getElementById(gridId);
      }
    }

    // Nexacro JS Grid 컴포넌트 및 바인딩된 Dataset 객체 확보
    let nxGrid = null;
    let nxDs = null;
    let colMap = null;
    if (gridId || gridEl) {
      nxGrid = resolveNexacroComponent(win, gridId, gridEl);
      if (nxGrid) {
        nxDs = resolveNexacroDataset(nxGrid, win);
        colMap = resolveDatasetColumns(nxGrid, nxDs);
      }
    }

    return { gridId, gridEl, nxGrid, nxDs, colMap, sectionPrefix };
  }

  // 3-3. K-에듀파인 Nexacro 품목 데이터 행(.body.gridrow_0, .body.gridrow_1 ...) 정밀 탐색!
  function findItemRows(doc, addRowBtnInfo, gridInfo) {
    const btnEl = addRowBtnInfo ? (addRowBtnInfo.clickable || addRowBtnInfo.leaf) : null;
    const btnBottom = btnEl ? (btnEl.getBoundingClientRect().bottom - 5) : 0;
    const gridId = gridInfo?.gridId || '';
    const searchRoot = gridInfo?.gridEl || doc;

    // 1. Nexacro Grid 데이터 행 탐색: ID가 정확히 `<gridId>.body.gridrow_<숫자>` 로 끝나는 div!
    const allRowDivs = Array.from(searchRoot.querySelectorAll('[id*=".body.gridrow_"]')).filter(el => {
      const id = el.id || '';
      if (gridId && !id.startsWith(gridId + '.body.gridrow_')) return false;
      if (!gridId && id.includes('.MainFrame.')) return false;
      // .cell_ 이나 :container 등 하위 노드는 제외하고 오직 행(row) 본체 div만 선택
      if (!/\.body\.gridrow_(\d+)$/.test(id)) return false;

      const r = el.getBoundingClientRect();
      if (r.width < 150 || r.height < 12) return false;
      if (!gridId && btnBottom > 0 && r.top < btnBottom) return false;

      // 내부에 실제 보이는 셀(.cell_)이 4개 이상 존재하는지 확인
      const cells = Array.from(el.querySelectorAll('[id*=".cell_"]')).filter(c => {
        return /\.cell_\d+_\d+$/.test(c.id || '') && c.getBoundingClientRect().width > 10;
      });
      return cells.length >= 4;
    });

    if (allRowDivs.length > 0) {
      allRowDivs.sort((a, b) => {
        const idxA = Number((a.id.match(/\.body\.gridrow_(\d+)$/) || [0, 0])[1]);
        const idxB = Number((b.id.match(/\.body\.gridrow_(\d+)$/) || [0, 0])[1]);
        return idxA - idxB;
      });
      return allRowDivs;
    }

    // 2. 혹시 표준 HTML table/tr 구조인 화면일 경우의 호환 폴백
    const fallbackTrs = Array.from(searchRoot.querySelectorAll('tr')).filter(tr => {
      if (tr.querySelector('table') || tr.querySelector('th')) return false;
      const r = tr.getBoundingClientRect();
      if (r.width < 150 || r.height < 12 || r.top < btnBottom) return false;
      const visibleTds = Array.from(tr.querySelectorAll('td')).filter(td => td.getBoundingClientRect().width > 10);
      return visibleTds.length >= 4;
    });
    return fallbackTrs;
  }

  // 3-4. [행추가 +] 자동 클릭 (시각적 포인터 배지 & 버튼 하이라이트)
  async function triggerAddRow(btnInfo, gridInfo, doc, currentRowCount) {
    const { clickable, leaf } = btnInfo;
    const targetBtn = clickable || leaf;
    const win = doc.defaultView || window;
    const WinMouseEvent = win.MouseEvent || MouseEvent;
    const WinPointerEvent = win.PointerEvent || PointerEvent;

    targetBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);

    const origOutline = targetBtn.style.outline;
    const origShadow = targetBtn.style.boxShadow;
    const origBg = targetBtn.style.backgroundColor;
    const origTransform = targetBtn.style.transform;
    const origTransition = targetBtn.style.transition;

    targetBtn.style.transition = 'all 0.15s ease';
    targetBtn.style.outline = '4px solid #ff3d00';
    targetBtn.style.boxShadow = '0 0 22px #ff3d00';
    targetBtn.style.backgroundColor = '#ffeb3b';
    targetBtn.style.transform = 'scale(1.12)';
    showFloatingPointer(doc, targetBtn, '👆 [행추가 +] 자동 클릭!', '#ff3d00');

    const rect = targetBtn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: win,
      detail: 1,
      clientX: cx,
      clientY: cy,
      button: 0,
      buttons: 1
    };

    // 1) clickable(버튼 컨테이너)과 leaf(내부 텍스트/아이콘) 모두에 DOM 이벤트 디스패치
    const targetsToClick = [targetBtn];
    if (leaf && leaf !== targetBtn) targetsToClick.push(leaf);

    for (const t of targetsToClick) {
      try {
        t.dispatchEvent(new WinPointerEvent('pointerdown', eventInit));
        t.dispatchEvent(new WinMouseEvent('mousedown', eventInit));
        t.dispatchEvent(new WinPointerEvent('pointerup', eventInit));
        t.dispatchEvent(new WinMouseEvent('mouseup', eventInit));
        t.dispatchEvent(new WinMouseEvent('click', eventInit));
      } catch(e) {
        try { t.click(); } catch(e2) {}
      }
    }

    await sleep(250);

    // 2) Nexacro Button 컴포넌트 핸들러 직접 호출
    let afterRows = findItemRows(doc, btnInfo, gridInfo);
    if (afterRows.length <= currentRowCount) {
      try {
        const rawId = (clickable?.id || leaf?.id || '');
        const nxBtn = resolveNexacroComponent(win, rawId, clickable || leaf);
        if (nxBtn) {
          if (typeof nxBtn.click === 'function') nxBtn.click();
          if (typeof nxBtn.on_fire_onclick === 'function') nxBtn.on_fire_onclick();
          const btnName = rawId.split(':')[0].split('.').pop();
          const pForm = nxBtn.parent;
          if (pForm) {
            const fnName = `${btnName}_onclick`;
            if (typeof pForm[fnName] === 'function') {
              pForm[fnName](nxBtn, {});
            }
          }
        }
      } catch(e) {}
      await sleep(200);
      afterRows = findItemRows(doc, btnInfo, gridInfo);
    }

    // 3) 만약 여전히 행이 안 늘어났고 Nexacro Dataset(nxDs)이 있으면 Dataset에 직접 addRow!
    if (afterRows.length <= currentRowCount && gridInfo?.nxDs && typeof gridInfo.nxDs.addRow === 'function') {
      try {
        gridInfo.nxDs.addRow();
        await sleep(150);
      } catch(e) {}
    }

    targetBtn.style.outline = origOutline;
    targetBtn.style.boxShadow = origShadow;
    targetBtn.style.backgroundColor = origBg;
    targetBtn.style.transform = origTransform;
    targetBtn.style.transition = origTransition;
    removeFloatingPointer(doc);
  }

  // 3-4b. 마지막에 불필요하게 자동 생성된 빈 행(예: 4번째 빈 행) 자동 감지 및 삭제
  async function cleanupTrailingEmptyRows(doc, gridInfo, addRowBtnInfo, expectedCount) {
    try {
      // 0) 먼저 활성화된 에디터/인풋 포커스 해제 및 안전한 행으로 선택 이동
      if (doc.activeElement && typeof doc.activeElement.blur === 'function') {
        doc.activeElement.blur();
      }
      if (gridInfo?.nxGrid && typeof gridInfo.nxGrid.selectRow === 'function') {
        try { gridInfo.nxGrid.selectRow(Math.max(0, expectedCount - 1)); } catch(e) {}
        await sleep(50);
      }

      // 1) Nexacro Dataset(nxDs) 기반 자동 행 삭제
      if (gridInfo?.nxDs && typeof gridInfo.nxDs.deleteRow === 'function') {
        const colId = gridInfo.colMap?.name?.colId;
        while (gridInfo.nxDs.getRowCount() > expectedCount) {
          const lastIdx = gridInfo.nxDs.getRowCount() - 1;
          const val = colId ? gridInfo.nxDs.getColumn(lastIdx, colId) : '';
          if (!val || String(val).trim() === '') {
            gridInfo.nxDs.deleteRow(lastIdx);
            await sleep(50);
          } else {
            break;
          }
        }
      }

      // 2) [행삭제 -] 버튼 탐색 및 DOM 행 기반 정리
      let currentRows = findItemRows(doc, addRowBtnInfo, gridInfo);
      if (currentRows.length > expectedCount) {
        const allNodes = Array.from(doc.querySelectorAll('*'));
        let delBtn = null;
        for (const el of allNodes) {
          const t = (el.textContent || el.value || el.title || '').trim().replace(/\s+/g, '');
          if (t.includes('행삭제') && t.length <= 10) {
            const r = el.getBoundingClientRect();
            if (r.width >= 20 && r.height >= 12) {
              delBtn = el.closest('button, a, input[type="button"], [role="button"], [class*="btn" i]') || el;
              break;
            }
          }
        }

        while (currentRows.length > expectedCount && delBtn) {
          const extraIdx = currentRows.length - 1;
          const extraRow = currentRows[extraIdx];
          const text = (extraRow.textContent || '').trim().replace(/\s+/g, '');
          if (!text || text === 'N' || (text.includes('0') && text.includes('선택') && !/[가-힣a-zA-Z]/.test(text))) {
            if (gridInfo?.nxGrid && typeof gridInfo.nxGrid.selectRow === 'function') {
              try { gridInfo.nxGrid.selectRow(extraIdx); } catch(e) {}
              await sleep(60);
            }
            try {
              delBtn.click();
              await sleep(150);
            } catch(e) {}
            currentRows = findItemRows(doc, addRowBtnInfo, gridInfo);
          } else {
            break;
          }
        }
      }

      // 3) 데이터셋 동기화 재커밋
      if (gridInfo?.nxGrid && typeof gridInfo.nxGrid.updateToDataset === 'function') {
        try { gridInfo.nxGrid.updateToDataset(); } catch(e) {}
      }
    } catch(e) {
      console.warn("빈 행 정리 오류:", e);
    }
  }

  // 3-5. Nexacro 행 내부의 가시 셀(.cell_N_M)을 상단 헤더('* 내용', '규격', '수량', '단위', '예상단가') X좌표와 1:1 매핑
  function getTargetCellsForRow(doc, row, gridInfo, addRowBtnInfo) {
    // Nexacro 셀(.cell_행_열) 또는 td 추출 후 화면 왼쪽->오른쪽(X좌표) 순으로 정렬
    let visibleCells = Array.from(row.querySelectorAll('[id*=".cell_"]')).filter(c => {
      return /\.cell_\d+_\d+$/.test(c.id || '') && c.getBoundingClientRect().width > 10;
    });
    if (visibleCells.length === 0) {
      visibleCells = Array.from(row.querySelectorAll('td')).filter(td => td.getBoundingClientRect().width > 10);
    }
    visibleCells.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);

    const searchRoot = gridInfo?.gridEl || doc;
    const gridId = gridInfo?.gridId || '';

    // Nexacro 헤더 셀(.head.gridrow_... .cell_...) 수집
    const headerCells = Array.from(searchRoot.querySelectorAll('[id*=".head.gridrow_"][id*=".cell_"], th')).filter(h => {
      if (gridId && h.id && !h.id.startsWith(gridId + '.head.')) return false;
      if (h.id && h.id.includes(':') && !/\.cell_\d+_\d+$/.test(h.id)) return false;
      const r = h.getBoundingClientRect();
      return r.width > 10 && r.height > 10;
    });

    const colX = { name: null, spec: null, qty: null, unit: null, price: null, amt: null };
    for (const h of headerCells) {
      const txt = (h.textContent || '').trim().replace(/\s+/g, '');
      const r = h.getBoundingClientRect();
      const center = r.left + r.width / 2;
      if ((txt === '*내용' || txt === '내용' || txt.includes('품명')) && colX.name === null) colX.name = center;
      else if (txt.includes('규격') && colX.spec === null) colX.spec = center;
      else if (txt.includes('수량') && colX.qty === null) colX.qty = center;
      else if (txt.includes('단위') && colX.unit === null) colX.unit = center;
      else if ((txt.includes('예상단가') || txt.includes('단가')) && !txt.includes('금액') && colX.price === null) colX.price = center;
      else if ((txt.includes('예상금액') || txt.includes('금액')) && colX.amt === null) colX.amt = center;
    }

    function findCellByX(centerX) {
      if (centerX === null) return null;
      let best = null;
      let minDist = 9999;
      for (const c of visibleCells) {
        const r = c.getBoundingClientRect();
        if (centerX >= r.left - 4 && centerX <= r.right + 4) return c;
        const dist = Math.abs((r.left + r.width / 2) - centerX);
        if (dist < minDist && dist < 45) {
          minDist = dist;
          best = c;
        }
      }
      return best;
    }

    let map = {
      name: findCellByX(colX.name),
      spec: findCellByX(colX.spec),
      qty: findCellByX(colX.qty),
      unit: null, // ★ 사용자 요청: 단위는 선택 안 되게 유지
      price: findCellByX(colX.price),
      amt: findCellByX(colX.amt)
    };

    // 에듀파인 품목내역 표준 가시 셀 순서 폴백: [0:체크박스, 1:상태(N), 2:순번(1), 3:*내용, 4:규격, 5:수량, 6:단위, 7:예상단가, 8:*예상금액]
    if (!map.name || !map.qty || !map.price || !map.amt) {
      if (visibleCells.length >= 9) {
        map = {
          name: map.name || visibleCells[3],
          spec: map.spec || visibleCells[4],
          qty: map.qty || visibleCells[5],
          unit: null,
          price: map.price || visibleCells[7],
          amt: map.amt || visibleCells[8]
        };
      } else if (visibleCells.length >= 8) {
        map = {
          name: map.name || visibleCells[3],
          spec: map.spec || visibleCells[4],
          qty: map.qty || visibleCells[5],
          unit: null,
          price: map.price || visibleCells[7],
          amt: map.amt || visibleCells[7].nextElementSibling || visibleCells[visibleCells.length - 1]
        };
      } else if (visibleCells.length === 7) {
        map = {
          name: map.name || visibleCells[2],
          spec: map.spec || visibleCells[3],
          qty: map.qty || visibleCells[4],
          unit: null,
          price: map.price || visibleCells[6],
          amt: map.amt || visibleCells[6].nextElementSibling || visibleCells[visibleCells.length - 1]
        };
      }
    }

    return map;
  }

  // 3-6. Nexacro Grid 셀 시각적 클릭 & 타이핑 애니메이션 + Nexacro Dataset/Grid 엔진 직접 동기화!
  async function typeIntoCell(cell, value, fieldKey, fieldLabel, gridInfo, rowIndex) {
    if (!cell) return false;
    // ★ 사용자 요청: 단위는 선택 안 되게 유지 (단위 열은 절대 건드리지 않음)
    if (fieldKey === 'unit') return true;

    const doc = cell.ownerDocument;
    const win = doc.defaultView || window;
    const WinMouseEvent = win.MouseEvent || MouseEvent;
    const WinPointerEvent = win.PointerEvent || PointerEvent;
    const WinKeyboardEvent = win.KeyboardEvent || KeyboardEvent;

    cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    // 1. 선생님이 눈으로 보실 수 있는 셀 파란색 테두리 & 하늘색 배경 & 말풍선 포인터 표시
    const origOutline = cell.style.outline;
    const origBg = cell.style.backgroundColor;
    const origBoxShadow = cell.style.boxShadow;
    const origTransition = cell.style.transition;

    cell.style.transition = 'all 0.12s ease';
    cell.style.outline = '3px solid #1a73e8';
    cell.style.backgroundColor = '#e8f0fe';
    cell.style.boxShadow = 'inset 0 0 12px rgba(26, 115, 232, 0.45)';
    showFloatingPointer(doc, cell, `✍️ ${fieldLabel}: ${value}`, '#1a73e8');

    // 셀 ID에서 Nexacro bodyCellIdx 추출 (예: ...body.gridrow_0.cell_0_3 -> 3)
    const cellIdxMatch = (cell.id || '').match(/\.cell_\d+_(\d+)$/);
    const bodyCellIdx = cellIdxMatch ? Number(cellIdxMatch[1]) : -1;

    const nxGrid = gridInfo?.nxGrid;
    const nxDs = gridInfo?.nxDs;
    const colMap = gridInfo?.colMap;

    let targetColId = '';
    if (nxGrid && bodyCellIdx >= 0 && typeof nxGrid.getCellProperty === 'function') {
      try {
        const bindTxt = String(nxGrid.getCellProperty('body', bodyCellIdx, 'text') || '');
        if (bindTxt.toLowerCase().startsWith('bind:')) {
          targetColId = bindTxt.slice(5).trim();
        }
      } catch(e) {}
    }
    if (!targetColId && colMap && colMap[fieldKey]?.colId) {
      targetColId = colMap[fieldKey].colId;
    }

    // 2. 단위 열(콤보박스) 코드값 변환 처리
    let finalVal = value;
    if (fieldKey === 'unit' && nxGrid && bodyCellIdx >= 0 && typeof nxGrid.getCellProperty === 'function') {
      try {
        const comboDsId = nxGrid.getCellProperty('body', bodyCellIdx, 'combodataset');
        const codeCol = nxGrid.getCellProperty('body', bodyCellIdx, 'combocodecol');
        const dataCol = nxGrid.getCellProperty('body', bodyCellIdx, 'combodatacol');
        const comboDs = (typeof nxGrid._findDataset === 'function' ? nxGrid._findDataset(comboDsId) : null) ||
                        nxGrid.parent?.[comboDsId] ||
                        nxGrid._refform?.[comboDsId];
        if (comboDs && typeof comboDs.getRowCount === 'function') {
          const targetUnit = String(value || '개').trim();
          let matchedCode = null;
          let firstValidCode = null;
          const rc = comboDs.getRowCount();
          for (let r = 0; r < rc; r++) {
            const dTxt = String(comboDs.getColumn(r, dataCol) ?? '').trim();
            const cVal = comboDs.getColumn(r, codeCol);
            if (cVal !== undefined && cVal !== null && String(cVal).trim() !== '' && dTxt !== '선택' && dTxt !== '-선택-') {
              if (firstValidCode === null) firstValidCode = cVal;
              if (dTxt === targetUnit || dTxt.includes(targetUnit)) {
                matchedCode = cVal;
                break;
              }
            }
          }
          if (matchedCode !== null) finalVal = matchedCode;
          else if (firstValidCode !== null) finalVal = firstValidCode;
        }
      } catch(e) {}
    }

    // 3. ★ 핵심: Dataset에 먼저 선제적으로 값을 확정 저장!
    // 이렇게 하면 셀 이동이나 블러 시 Nexacro가 이전 값(빈칸)으로 롤백하지 못합니다!
    if (nxDs && targetColId && typeof nxDs.setColumn === 'function') {
      try {
        const syncVal = (fieldKey === 'qty' || fieldKey === 'price') ? Number(finalVal) : finalVal;
        nxDs.setColumn(rowIndex, targetColId, syncVal);
      } catch(e) {}
    }

    // 4. 셀 클릭/더블클릭으로 화면 편집기 활성화
    const rect = cell.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mouseOpts = {
      bubbles: true,
      cancelable: true,
      view: win,
      detail: 1,
      clientX: cx,
      clientY: cy,
      button: 0,
      buttons: 1
    };

    const innerClickTarget = cell.querySelector('[id*=":celledit"], [id*=":cellcombo"], [id*=":input"], input, div') || cell;
    try {
      innerClickTarget.dispatchEvent(new WinPointerEvent('pointerdown', mouseOpts));
      innerClickTarget.dispatchEvent(new WinMouseEvent('mousedown', mouseOpts));
      innerClickTarget.dispatchEvent(new WinPointerEvent('pointerup', mouseOpts));
      innerClickTarget.dispatchEvent(new WinMouseEvent('mouseup', mouseOpts));
      innerClickTarget.dispatchEvent(new WinMouseEvent('click', mouseOpts));
      innerClickTarget.dispatchEvent(new WinMouseEvent('dblclick', { ...mouseOpts, detail: 2 }));
    } catch(e) {}

    // 단위(콤보박스) 처리
    if (fieldKey === 'unit') {
      const dropBtn = cell.querySelector('[id*=":dropbutton"], [id*="drop" i]');
      if (dropBtn) {
        try {
          dropBtn.dispatchEvent(new WinMouseEvent('mousedown', mouseOpts));
          dropBtn.dispatchEvent(new WinMouseEvent('mouseup', mouseOpts));
          dropBtn.dispatchEvent(new WinMouseEvent('click', mouseOpts));
          await sleep(140);
          const popupItems = Array.from(doc.querySelectorAll('[id*="combopopup" i] [id*="item" i], .ComboListControl [id*="item" i]')).filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 10 && r.height > 10 && !el.id.includes(':');
          });
          if (popupItems.length > 0) {
            const targetUnit = String(value || '개').trim();
            const matchItem = popupItems.find(it => (it.textContent || '').trim() === targetUnit) ||
                              popupItems.find(it => !(it.textContent || '').includes('선택')) ||
                              popupItems[0];
            if (matchItem) {
              const ir = matchItem.getBoundingClientRect();
              const itemOpts = { ...mouseOpts, clientX: ir.left + ir.width / 2, clientY: ir.top + ir.height / 2 };
              matchItem.dispatchEvent(new WinMouseEvent('mousedown', itemOpts));
              matchItem.dispatchEvent(new WinMouseEvent('mouseup', itemOpts));
              matchItem.dispatchEvent(new WinMouseEvent('click', itemOpts));
            }
          }
        } catch(e) {}
      }
      await sleep(150);
    } else {
      // 일반 텍스트/숫자 셀: 화면 입력기 탐색 및 타이핑
      let activeEditor = null;
      const startWait = Date.now();
      while (Date.now() - startWait < 220) {
        const cellInput = cell.querySelector('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea');
        if (cellInput && cellInput.getBoundingClientRect().width > 5) {
          activeEditor = cellInput;
          break;
        }
        if (doc.activeElement && ['INPUT', 'TEXTAREA'].includes(doc.activeElement.tagName)) {
          const ae = doc.activeElement;
          const aeRect = ae.getBoundingClientRect();
          if (Math.abs(aeRect.top - rect.top) < 40 && Math.abs(aeRect.left - rect.left) < 80) {
            activeEditor = ae;
            break;
          }
        }
        await sleep(25);
      }

      if (activeEditor) {
        const origEdBg = activeEditor.style.backgroundColor;
        activeEditor.style.backgroundColor = '#fff59d'; // 노란색 타이핑 애니메이션
        activeEditor.style.color = '#000';
        activeEditor.style.fontWeight = 'bold';

        applyValue(activeEditor, finalVal);

        try {
          const ctrl = getNexacroControlFromDom(activeEditor);
          if (ctrl) {
            if (typeof ctrl.set_value === 'function') ctrl.set_value(finalVal);
            if (typeof ctrl.on_update_value === 'function') ctrl.on_update_value(finalVal);
          }
        } catch(e) {}

        await sleep(100);

        // ★ editor 블러 처리로 Nexacro 내부 커밋 확정 (엔터키 발송은 Nexacro에서 불필요한 자동 행추가를 유발하므로 배제)
        try {
          activeEditor.blur();
          activeEditor.dispatchEvent(new Event('blur', { bubbles: true }));
        } catch(e) {}
        activeEditor.style.backgroundColor = origEdBg;
      } else {
        await sleep(120);
      }
    }

    // 5. ★ Nexacro Grid 편집기 커밋 & Dataset 2차 확정 동기화 (showEditor(false) 절대 호출 금지!)
    if (nxGrid) {
      try {
        if (typeof nxGrid.updateToDataset === 'function') nxGrid.updateToDataset();
      } catch(e) {}
    }
    if (nxDs && targetColId && typeof nxDs.setColumn === 'function') {
      try {
        const syncVal = (fieldKey === 'qty' || fieldKey === 'price' || fieldKey === 'amt') ? Number(finalVal) : finalVal;
        nxDs.setColumn(rowIndex, targetColId, syncVal);
      } catch(e) {}
    }

    // 6. 셀 DOM 텍스트 노드 직접 업데이트 (화면 새로고침 없이 즉시 표시 유지)
    try {
      const isNumericField = (fieldKey === 'qty' || fieldKey === 'price' || fieldKey === 'amt');
      const textDiv = cell.querySelector('[id*=":text"], div') || cell;
      if (textDiv && !textDiv.querySelector('input')) {
        textDiv.textContent = (fieldKey === 'price' || fieldKey === 'amt') ? Number(finalVal).toLocaleString() : String(finalVal);
      }
      // ★ 숫자 컬럼(수량, 예상단가, 예상금액)은 에듀파인 표준 규격에 맞게 확실한 오른쪽 정렬(text-align: right) 적용!
      if (isNumericField) {
        cell.style.textAlign = 'right';
        if (textDiv) {
          textDiv.style.textAlign = 'right';
          textDiv.style.paddingRight = '6px';
          textDiv.style.boxSizing = 'border-box';
          textDiv.style.width = '100%';
        }
        const innerNodes = cell.querySelectorAll('div, span');
        innerNodes.forEach(n => {
          if (!n.querySelector('input')) {
            n.style.textAlign = 'right';
          }
        });
      }
    } catch(e) {}

    cell.style.outline = origOutline;
    cell.style.backgroundColor = origBg;
    cell.style.boxShadow = origBoxShadow;
    cell.style.transition = origTransition;
    removeFloatingPointer(doc);
    await sleep(50);
    return true;
  }

  // 3-7. 품목 리스트 자동화 실행 오케스트레이터 (Nexacro 완벽 대응 v1.9.0)
  if (items && items.length > 0) {
    // ★ 예산 미선택 시 품목 입력 차단
    if (budgetCheck.isProposalScreen && !budgetCheck.selected) {
      return { titleFound, bodyFound, itemsInjectedCount: 0, diagGridFound: true, diagRowCount: 0, isProposalScreen: true, budgetNotSelected: true, diagDetail: `예산미선택(${budgetCheck.reason})` };
    }
    try {
      let targetDoc = activeDoc;
      let addRowBtnInfo = findAddRowButton(activeDoc);

      if (!addRowBtnInfo) {
        for (const d of allDocs) {
          const found = findAddRowButton(d);
          if (found) {
            targetDoc = d;
            addRowBtnInfo = found;
            break;
          }
        }
      }

      if (targetDoc.__edufineItemFillerRunning) {
        return { titleFound, bodyFound, itemsInjectedCount: 0, diagGridFound: false, diagRowCount: 0, skippedDuplicateFrame: true };
      }
      targetDoc.__edufineItemFillerRunning = true;

      try {
        let gridInfo = findItemGridInfo(targetDoc, addRowBtnInfo);
        if (!addRowBtnInfo && !gridInfo.gridEl && !gridInfo.gridId) {
          return { titleFound, bodyFound, itemsInjectedCount: 0, diagGridFound: false, diagRowCount: 0, skippedNonItemFrame: true };
        }
        if (addRowBtnInfo || gridInfo.gridEl || gridInfo.gridId) {
          diagGridFound = true;
        }

        let currentRows = findItemRows(targetDoc, addRowBtnInfo, gridInfo);
        diagRowCount = currentRows.length;

        // 기존에 이미 내용이 채워져 있는 행의 개수를 파악하여, 다중 예산 품목 순차 입력 시 덮어쓰지 않고 뒤에 이어붙임!
        let existingFilledCount = 0;
        if (gridInfo?.nxDs && typeof gridInfo.nxDs.getRowCount === 'function') {
          const dsRows = gridInfo.nxDs.getRowCount();
          const colId = gridInfo.colMap?.name?.colId;
          for (let r = 0; r < dsRows; r++) {
            const v = colId ? gridInfo.nxDs.getColumn(r, colId) : '';
            if (v && String(v).trim() !== '') {
              existingFilledCount++;
            } else {
              break;
            }
          }
        } else if (currentRows && currentRows.length > 0) {
          for (let r = 0; r < currentRows.length; r++) {
            const rowText = (currentRows[r].textContent || '').trim().replace(/\s+/g, '');
            if (rowText && rowText !== 'N' && !(rowText.includes('0') && rowText.includes('선택') && !/[가-힣a-zA-Z]/.test(rowText))) {
              existingFilledCount++;
            } else {
              break;
            }
          }
        }
        const startRowIndex = existingFilledCount;

        const liveBanner = createOrUpdateBanner(targetDoc, '🚀 [에듀파인 품의 도우미 v2.5.5] 품목 표 자동 행추가 및 셀 타이핑을 시작합니다...');

        for (let i = 0; i < items.length; i++) {
          const curItem = items[i];
          const targetIndex = startRowIndex + i;

          gridInfo = findItemGridInfo(targetDoc, addRowBtnInfo);
          currentRows = findItemRows(targetDoc, addRowBtnInfo, gridInfo);
          diagRowCount = currentRows.length;

          // 현재 행 개수가 (targetIndex + 1)개보다 적을 때만 딱 필요한 만큼 [행추가 +] 클릭!
          let retryAdd = 0;
          while (currentRows.length <= targetIndex && retryAdd < 2) {
            retryAdd++;
            if (addRowBtnInfo) {
              createOrUpdateBanner(targetDoc, `👆 [행추가 +] 자동 클릭! (${targetIndex + 1}번째 품목 행 생성)`, '#ff3d00');
              await triggerAddRow(addRowBtnInfo, gridInfo, targetDoc, currentRows.length);

              const waitStart = Date.now();
              while (Date.now() - waitStart < 1200) {
                await sleep(70);
                gridInfo = findItemGridInfo(targetDoc, addRowBtnInfo);
                currentRows = findItemRows(targetDoc, addRowBtnInfo, gridInfo);
                diagRowCount = currentRows.length;
                if (currentRows.length > targetIndex) break;
              }
            } else {
              break;
            }
          }

          const btnRect = addRowBtnInfo?.clickable?.getBoundingClientRect();
          diagDetail = `버튼:${addRowBtnInfo ? `${addRowBtnInfo.clickable.id || 'ok'}(${Math.round(btnRect.width)}x${Math.round(btnRect.height)})` : '없음'}, 그리드:${gridInfo.gridId || '없음'}, 감지된행:${currentRows.length}, NX엔진:${gridInfo.nxGrid ? 'O' : 'X'}, DS:${gridInfo.nxDs ? 'O' : 'X'}`;

          const qtyNum = Number(curItem.qty) || 1;
          const priceNum = Number(curItem.unitPrice) || 0;
          const cleanSpecVal = (curItem.spec || '').trim();
          const curItemBudget = curItem.budgetNum || 1;

          let targetRow = null;
          if (gridInfo.nxGrid && typeof gridInfo.nxGrid.selectRow === 'function') {
            try { gridInfo.nxGrid.selectRow(targetIndex); } catch(e) {}
            await sleep(60);
          }
          targetRow = currentRows[targetIndex] || (gridInfo.gridId ? targetDoc.getElementById(`${gridInfo.gridId}.body.gridrow_${targetIndex}`) : null);

          if (!targetRow) {
            // DOM 행을 끝내 못 찾았더라도 nxDs(Nexacro 데이터셋)가 있으면 데이터셋에 직접 주입하여 품목 저장 완수!
            const nxDs = gridInfo.nxDs;
            const colMap = gridInfo.colMap;
            if (nxDs && typeof nxDs.setColumn === 'function') {
              try {
                while (nxDs.getRowCount() <= targetIndex) {
                  nxDs.addRow();
                }
                if (colMap?.name?.colId) nxDs.setColumn(targetIndex, colMap.name.colId, curItem.name || '');
                if (colMap?.spec?.colId && cleanSpecVal && cleanSpecVal !== '-') nxDs.setColumn(targetIndex, colMap.spec.colId, cleanSpecVal);
                
                const qtyCols = (colMap?.allQtyColIds && colMap.allQtyColIds.length > 0) ? colMap.allQtyColIds : (colMap?.qty?.colId ? [colMap.qty.colId] : ['REQ_QTY', 'QTY']);
                for (const qId of qtyCols) { try { nxDs.setColumn(targetIndex, qId, qtyNum); } catch(e) {} }

                // ★ 사용자 요청: 단위(unit)는 선택 안 되게 유지 (컬럼 수정 안 함)
                const priceCols = (colMap?.allPriceColIds && colMap.allPriceColIds.length > 0) ? colMap.allPriceColIds : (colMap?.price?.colId ? [colMap.price.colId] : ['REQ_UPRC', 'EXPCT_UPRC', 'UNIT_PRICE']);
                for (const pId of priceCols) { try { nxDs.setColumn(targetIndex, pId, priceNum); } catch(e) {} }

                const totalAmt = qtyNum * priceNum;
                const amtCols = (colMap?.allAmtColIds && colMap.allAmtColIds.length > 0) ? colMap.allAmtColIds : (colMap?.amt?.colId ? [colMap.amt.colId] : ['REQ_AMT', 'EXPCT_AMT', 'ESTM_AMT', 'PRDLST_AMT']);
                for (const aId of amtCols) { try { nxDs.setColumn(targetIndex, aId, totalAmt); } catch(e) {} }

                if (colMap?.budget?.colId) nxDs.setColumn(targetIndex, colMap.budget.colId, curItemBudget);
                itemsInjectedCount++;
                continue;
              } catch(e) {}
            }
            console.log(`[에듀파인 도우미] 행 ${targetIndex + 1} 탐색 실패 (${diagDetail})`);
            continue;
          }

          targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          await sleep(80);

          const cellMap = getTargetCellsForRow(targetDoc, targetRow, gridInfo, addRowBtnInfo);

          // ★ 1단계: Nexacro Dataset에 행 데이터 선제적 주입 (데이터셋 방어막 구축)
          const nxDs = gridInfo.nxDs;
          const colMap = gridInfo.colMap;
          if (nxDs && typeof nxDs.setColumn === 'function') {
            try {
              while (nxDs.getRowCount() <= targetIndex) {
                nxDs.addRow();
              }
              if (colMap?.name?.colId) nxDs.setColumn(targetIndex, colMap.name.colId, curItem.name || '');
              if (colMap?.spec?.colId && cleanSpecVal && cleanSpecVal !== '-') nxDs.setColumn(targetIndex, colMap.spec.colId, cleanSpecVal);
              
              const qtyCols = (colMap?.allQtyColIds && colMap.allQtyColIds.length > 0) ? colMap.allQtyColIds : (colMap?.qty?.colId ? [colMap.qty.colId] : ['REQ_QTY', 'QTY']);
              for (const qId of qtyCols) { try { nxDs.setColumn(targetIndex, qId, qtyNum); } catch(e) {} }

              // ★ 단위 컬럼은 절대 건드리지 않음
              const priceCols = (colMap?.allPriceColIds && colMap.allPriceColIds.length > 0) ? colMap.allPriceColIds : (colMap?.price?.colId ? [colMap.price.colId] : ['REQ_UPRC', 'EXPCT_UPRC', 'UNIT_PRICE']);
              for (const pId of priceCols) { try { nxDs.setColumn(targetIndex, pId, priceNum); } catch(e) {} }

              const totalAmt = qtyNum * priceNum;
              const amtCols = (colMap?.allAmtColIds && colMap.allAmtColIds.length > 0) ? colMap.allAmtColIds : (colMap?.amt?.colId ? [colMap.amt.colId] : ['REQ_AMT', 'EXPCT_AMT', 'ESTM_AMT', 'PRDLST_AMT']);
              for (const aId of amtCols) { try { nxDs.setColumn(targetIndex, aId, totalAmt); } catch(e) {} }

              if (colMap?.budget?.colId) nxDs.setColumn(targetIndex, colMap.budget.colId, curItemBudget);
            } catch(e) {}
          }

          createOrUpdateBanner(targetDoc, `✍️ 품목 (${i + 1}/${items.length}) [${curItem.name || '물품'}] (예산:${curItemBudget}번) 입력 중...`, '#1a73e8');

          if (cellMap.name) {
            await typeIntoCell(cellMap.name, curItem.name || '', 'name', '내용(품명)', gridInfo, targetIndex);
          }
          // 규격(spec)은 실제 규격 값이 있을 때만 입력하고, 없으면 기본적으로 비워둠!
          if (cellMap.spec && cleanSpecVal && cleanSpecVal !== '-') {
            await typeIntoCell(cellMap.spec, cleanSpecVal, 'spec', '규격', gridInfo, targetIndex);
          }
          if (cellMap.qty) {
            await typeIntoCell(cellMap.qty, qtyNum, 'qty', '수량', gridInfo, targetIndex);
          }
          // ★ 사용자 요청: 단위(unit)는 선택 안 되게 유지하므로 typeIntoCell 호출 제외
          if (cellMap.price) {
            await typeIntoCell(cellMap.price, priceNum, 'price', '예상단가', gridInfo, targetIndex);
          }

          // ★ 예상금액(amt) 셀도 DOM에 직접 표시 및 Dataset 산출액 확정 (필수 컬럼 누락 방어!)
          const totalAmtNum = qtyNum * priceNum;
          try {
            if (nxDs && typeof nxDs.setColumn === 'function') {
              const amtCols = (colMap?.allAmtColIds && colMap.allAmtColIds.length > 0)
                ? colMap.allAmtColIds
                : (colMap?.amt?.colId ? [colMap.amt.colId] : ['REQ_AMT', 'EXPCT_AMT', 'ESTM_AMT', 'PRDLST_AMT']);
              for (const aId of amtCols) {
                try { nxDs.setColumn(targetIndex, aId, totalAmtNum); } catch(e) {}
              }
            }
            const amtCell = cellMap.amt || (cellMap.price ? cellMap.price.nextElementSibling : null);
            if (amtCell) {
              const amtTxt = amtCell.querySelector('[id*=":text"], div') || amtCell;
              if (amtTxt && !amtTxt.querySelector('input')) {
                amtTxt.textContent = totalAmtNum.toLocaleString();
              }
              amtCell.style.textAlign = 'right';
              if (amtTxt) {
                amtTxt.style.textAlign = 'right';
                amtTxt.style.paddingRight = '6px';
                amtTxt.style.boxSizing = 'border-box';
                amtTxt.style.width = '100%';
              }
              amtCell.querySelectorAll('div, span').forEach(n => {
                if (!n.querySelector('input')) n.style.textAlign = 'right';
              });
              try {
                const nxAmtCtrl = getNexacroControlFromDom(amtCell);
                if (nxAmtCtrl) {
                  if (typeof nxAmtCtrl.set_value === 'function') nxAmtCtrl.set_value(totalAmtNum);
                  if (typeof nxAmtCtrl.set_text === 'function') nxAmtCtrl.set_text(totalAmtNum.toLocaleString());
                }
              } catch(e) {}
            }
          } catch(e) {}

          // 행 입력 마무리 커밋 (showEditor(false)나 redrawRow 호출 금지!)
          try {
            if (gridInfo.nxGrid && typeof gridInfo.nxGrid.updateToDataset === 'function') {
              gridInfo.nxGrid.updateToDataset();
            }
          } catch(e) {}

          itemsInjectedCount++;
        }

        // 전체 행 주입 후 최종 그리드 & Dataset 무결성 재확인 (단위 컬럼 제외)
        if (gridInfo.nxDs && typeof gridInfo.nxDs.setColumn === 'function' && gridInfo.colMap) {
          try {
            const colMap = gridInfo.colMap;
            const amtCols = (colMap.allAmtColIds && colMap.allAmtColIds.length > 0)
              ? colMap.allAmtColIds
              : (colMap.amt?.colId ? [colMap.amt.colId] : ['REQ_AMT', 'EXPCT_AMT', 'ESTM_AMT', 'PRDLST_AMT']);
            for (let k = 0; k < items.length; k++) {
              const targetIdx = startRowIndex + k;
              const itm = items[k];
              const q = Number(itm.qty) || 1;
              const p = Number(itm.unitPrice) || 0;
              const sp = (itm.spec || '').trim();
              if (colMap.name?.colId) gridInfo.nxDs.setColumn(targetIdx, colMap.name.colId, itm.name || '');
              if (colMap.spec?.colId && sp && sp !== '-') gridInfo.nxDs.setColumn(targetIdx, colMap.spec.colId, sp);
              if (colMap.qty?.colId) gridInfo.nxDs.setColumn(targetIdx, colMap.qty.colId, q);
              if (colMap.price?.colId) gridInfo.nxDs.setColumn(targetIdx, colMap.price.colId, p);
              for (const aId of amtCols) {
                try { gridInfo.nxDs.setColumn(targetIdx, aId, q * p); } catch(e) {}
              }
            }
          } catch(e) {}
        }

        // ★ 마지막에 불필요하게 자동 추가된 빈 행 자동 감지 및 삭제
        await cleanupTrailingEmptyRows(targetDoc, gridInfo, addRowBtnInfo, startRowIndex + items.length);

        // ★ 입력 완료 후 활성 포커스 해제 (에디터 잔류 및 파란색 테두리 방지)
        if (targetDoc.activeElement && typeof targetDoc.activeElement.blur === 'function') {
          try { targetDoc.activeElement.blur(); } catch(e) {}
        }

        if (gridInfo.nxGrid) {
          try {
            if (typeof gridInfo.nxGrid.updateToDataset === 'function') gridInfo.nxGrid.updateToDataset();
            if (typeof gridInfo.nxGrid.selectRow === 'function') gridInfo.nxGrid.selectRow(0);
          } catch(e) {}
        }

        if (itemsInjectedCount > 0) {
          createOrUpdateBanner(targetDoc, `🎉 총 ${itemsInjectedCount}개 품목 자동 행추가 및 셀 입력 완료!`, '#2e7d32');
        } else {
          createOrUpdateBanner(targetDoc, `⚠️ 품목 표 셀을 찾지 못했습니다 (${diagDetail})`, '#d93025');
        }
        setTimeout(() => { if (liveBanner) liveBanner.remove(); }, 4000);
      } finally {
        targetDoc.__edufineItemFillerRunning = false;
      }
    } catch(gridErr) {
      console.log("그리드 주입 오류:", gridErr);
      diagDetail += ` / 오류:${gridErr.message}`;
    }
  }

  return { titleFound, bodyFound, itemsInjectedCount, diagGridFound, diagRowCount, diagDetail, url: location.href };
}

// -------------------------------------------------------------
// 에듀파인 엑셀 파일 자동 주입 (사용자가 파일 저장/탐색할 필요 없음)
// -------------------------------------------------------------
async function autoUploadExcel(excelBase64, filename) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) {
    alert("활성화된 에듀파인 브라우저 창을 찾을 수 없습니다.");
    return;
  }

  // 에듀파인 탭 내에서 실행될 스크립트
  function fileInjector(b64Data, fname) {
    // base64 -> File 객체 변환
    const byteCharacters = atob(b64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new File([byteArray], fname, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const dt = new DataTransfer();
    dt.items.add(file);

    // 1. 화면 내의 파일 인풋 탐색
    let fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));

    // 만약 현재 파일 인풋이 안 보인다면, 화면의 '파일 ⇧' (업로드) 버튼 클릭 시도
    if (fileInputs.length === 0) {
      const allBtns = Array.from(document.querySelectorAll('button, a, input[type="button"], span, div'));
      const uploadBtn = allBtns.find(el => {
        const t = (el.textContent || el.value || '').trim();
        return t.includes('파일') && (t.includes('⇧') || t.includes('업로드') || t.includes('올리기'));
      });

      if (uploadBtn) {
        uploadBtn.click();
      }
    }

    // 파일 인풋에 파일 주입
    let injected = false;
    // 팝업이 뜰 시간을 고려하여 재탐색
    setTimeout(() => {
      fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
      for (const input of fileInputs) {
        try {
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          injected = true;
          
          // 팝업 내의 '저장' 또는 '확인' 또는 '업로드' 버튼이 있으면 자동 클릭
          setTimeout(() => {
            const popBtns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const confirmBtn = popBtns.find(b => {
              const txt = (b.textContent || b.value || '').trim();
              return txt === '업로드' || txt === '확인' || txt === '저장' || txt === '파일올리기';
            });
            if (confirmBtn) confirmBtn.click();
          }, 300);

          break;
        } catch (e) {}
      }
    }, 400);

    return { injected: true };
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id, allFrames: true },
      func: fileInjector,
      args: [excelBase64, filename]
    });
  } catch (err) {
    console.error("파일 주입 오류:", err);
  }
}

// 엑셀 바이너리 Base64 생성 헬퍼
function generateExcelBase64() {
  if (!parsedItems || parsedItems.length === 0) return null;
  const aoa = [
    ["품목내역", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["순번", "* 내용", "S2B물품번호", "규격", "수량", "단위", "예상단가", "* 예상금액", "수수료"]
  ];

  parsedItems.forEach((item, idx) => {
    const qty = parseInt(item.qty) || 1;
    const unitPrice = parseInt(item.unitPrice) || 0;
    const totalPrice = parseInt(item.totalPrice) || (qty * unitPrice);
    aoa.push([
      idx + 1,
      item.name || "",
      item.s2bCode || "",
      item.spec || "",
      qty,
      item.unit || "개",
      unitPrice,
      totalPrice,
      ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "품목내역");
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
}

// ==========================================================================
// 최상단 품의 모드 탭 전환 (단일 예산 vs 다중 예산 분할)
// ==========================================================================
let currentTopWorkflow = "single";

function switchTopWorkflow(mode) {
  currentTopWorkflow = mode;
  if (mode === "single") {
    mainTabBtnSingle?.classList.add("active");
    mainTabBtnMulti?.classList.remove("active");
    if (sectionSingleWorkflow) sectionSingleWorkflow.style.display = "block";
    if (sectionMultiWorkflow) sectionMultiWorkflow.style.display = "none";
  } else {
    mainTabBtnSingle?.classList.remove("active");
    mainTabBtnMulti?.classList.add("active");
    if (sectionSingleWorkflow) sectionSingleWorkflow.style.display = "none";
    if (sectionMultiWorkflow) sectionMultiWorkflow.style.display = "block";
    updateMultiBudgetUI();
    renderMultiGallery();
    renderMultiCumulativeSummary();
  }
}

if (mainTabBtnSingle) {
  mainTabBtnSingle.addEventListener("click", () => switchTopWorkflow("single"));
}
if (mainTabBtnMulti) {
  mainTabBtnMulti.addEventListener("click", () => switchTopWorkflow("multi"));
}

// ==========================================================================
// 다중 예산 분할 품의 워크플로우 로직
// ==========================================================================
function updateMultiBudgetUI() {
  if (multiCurrentBudgetBadge) multiCurrentBudgetBadge.textContent = `${currentMultiBudget}번 예산 진행 중`;
  if (multiBudgetSelect) multiBudgetSelect.value = String(currentMultiBudget);
  if (multiNoticeBudgetNum) multiNoticeBudgetNum.textContent = `${currentMultiBudget}번 예산`;
  if (multiInputCardTitle) multiInputCardTitle.textContent = `${currentMultiBudget}번 예산으로 구매할 물품 캡처 첨부`;
  if (btnMultiAnalyzeText) btnMultiAnalyzeText.textContent = `${currentMultiBudget}번 예산 품목 AI 분석`;
  if (multiCurrentBudgetLabel) multiCurrentBudgetLabel.textContent = `${currentMultiBudget}번 예산`;
  if (btnMultiInjectItemsText) btnMultiInjectItemsText.textContent = `에듀파인 표에 ${currentMultiBudget}번 예산 품목 즉시 입력`;
  if (btnMultiNextBudgetText) btnMultiNextBudgetText.textContent = `➕ 다음 예산(${currentMultiBudget + 1}번 예산) 품목 입력으로 넘어가기`;
}

// 다중 예산 전용 이미지 첨부 함수 (예산별 분리 저장)
function addMultiImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    alert("이미지 파일만 첨부할 수 있습니다.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const list = getCurBudgetImages();
    list.push(e.target.result);
    renderMultiGallery();
    if (multiStatusMsg) multiStatusMsg.textContent = "";
  };
  reader.readAsDataURL(file);
}

function renderMultiGallery() {
  if (!multiGalleryGrid) return;
  multiGalleryGrid.innerHTML = "";
  const curImgs = getCurBudgetImages();

  if (curImgs.length > 0) {
    if (multiImageGallery) multiImageGallery.style.display = "block";
    if (multiGalleryCount) multiGalleryCount.textContent = curImgs.length;
    curImgs.forEach((imgSrc, idx) => {
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.innerHTML = `
        <img src="${imgSrc}" alt="${currentMultiBudget}번 예산 캡처 ${idx + 1}" />
        <button class="gallery-item-del" data-idx="${idx}" title="삭제">
          <svg class="svg-icon" style="width:12px;height:12px;" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;
      multiGalleryGrid.appendChild(item);
    });
    multiGalleryGrid.querySelectorAll(".gallery-item-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.dataset.idx);
        curImgs.splice(idx, 1);
        renderMultiGallery();
      });
    });
  } else {
    if (multiImageGallery) multiImageGallery.style.display = "none";
  }
  if (btnMultiAnalyze) btnMultiAnalyze.disabled = curImgs.length === 0;
}

// 다중 예산 드롭존 및 파일 선택 이벤트
if (multiDropzone) {
  multiDropzone.addEventListener("click", () => multiFilePickerInput?.click());
  multiDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    multiDropzone.classList.add("dragover");
  });
  multiDropzone.addEventListener("dragleave", () => multiDropzone.classList.remove("dragover"));
  multiDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    multiDropzone.classList.remove("dragover");
    if (e.dataTransfer.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        addMultiImageFile(e.dataTransfer.files[i]);
      }
    }
  });
}

if (multiFilePickerInput) {
  multiFilePickerInput.addEventListener("change", (e) => {
    if (e.target.files) {
      for (let i = 0; i < e.target.files.length; i++) {
        addMultiImageFile(e.target.files[i]);
      }
      multiFilePickerInput.value = "";
    }
  });
}

if (btnClearMultiImgs) {
  btnClearMultiImgs.addEventListener("click", () => {
    multiBudgetImages[currentMultiBudget] = [];
    renderMultiGallery();
  });
}

// 예산 선택 드롭다운 변경 시 (해당 예산의 캡처 갤러리 및 품목으로 즉시 동기화)
if (multiBudgetSelect) {
  multiBudgetSelect.addEventListener("change", () => {
    const selected = parseInt(multiBudgetSelect.value) || 1;
    currentMultiBudget = selected;
    updateMultiBudgetUI();
    renderMultiGallery(); // ★ 현재 선택된 예산의 캡처 이미지만 표시!

    const existing = multiBudgetItems.filter(it => it.budgetNum === currentMultiBudget);
    if (existing.length > 0) {
      multiCurrentItems = existing;
      renderMultiCurrentItems();
      if (multiItemsCard) multiItemsCard.style.display = "block";
    } else {
      multiCurrentItems = [];
      if (multiItemsCard) multiItemsCard.style.display = "none";
    }
    if (multiStatusMsg) multiStatusMsg.textContent = "";
  });
}

// 다중 예산 AI 분석 실행
if (btnMultiAnalyze) {
  btnMultiAnalyze.addEventListener("click", async () => {
    const { geminiApiKey } = await chrome.storage.local.get(["geminiApiKey"]);
    if (!geminiApiKey) {
      settingsModal.classList.add("active");
      alert("Gemini API Key를 먼저 설정해주세요.");
      return;
    }
    const curImgs = getCurBudgetImages();
    if (curImgs.length === 0) {
      alert("분석할 상품 캡처 이미지를 먼저 등록해주세요.");
      return;
    }

    btnMultiAnalyze.disabled = true;
    if (multiStatusMsg) {
      multiStatusMsg.style.color = "var(--accent)";
      multiStatusMsg.textContent = `⏳ ${curImgs.length}개 이미지 압축 및 AI 분석 중...`;
    }

    try {
      const optimizedList = await Promise.all(
        curImgs.map(img => resizeImageBase64(img, 960))
      );

      const contentParts = [];
      const promptText = `
당신은 대한민국 학교 행정(K-에듀파인) 품의 공문서 작성 전문가입니다.
제공된 상품 캡처 이미지들을 분석하여 구매할 물품 목록을 JSON으로 추출하세요.

반드시 마크다운 코드블록(\`\`\`json) 없이 순수 JSON만 반환하세요:
{
  "representativeName": "대표 물품명 (핵심 명사)",
  "items": [
    {
      "name": "회사명/브랜드/마케팅 수식어를 뺀 간결한 핵심 물품명 (예: 무선 핀마이크, A4 복사용지, 모나미 볼펜 등)",
      "s2bCode": "",
      "spec": "",
      "qty": 1,
      "unit": "개",
      "unitPrice": 15000,
      "totalPrice": 15000
    }
  ]
}

[필수 작성 규칙]:
1. 보이는 상품 전체를 빠짐없이 items 배열에 담으세요.
2. 제조사/광고 문구를 제거하고 핵심 명사로만 1~3단어 간결화하세요.
3. 규격(spec)은 A4, 500ml, 100W처럼 명백한 단일 수치 외에는 무조건 빈 문자열("")로 비워두세요.
4. 단위(unit)는 공란 또는 "개"로 작성하세요.
5. 수량과 단가는 쉼표 없이 정수 숫자로 작성하세요.
`;
      contentParts.push({ text: promptText });

      for (const opt of optimizedList) {
        const pureBase64 = opt.split(",")[1];
        const mimeType = opt.split(";")[0].split(":")[1] || "image/jpeg";
        contentParts.push({
          inlineData: {
            mimeType: mimeType,
            data: pureBase64
          }
        });
      }

      const { lastFastGeminiModel } = await chrome.storage.local.get(["lastFastGeminiModel"]);
      const fastCandidates = [
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash-lite",
        "gemini-3-flash-preview",
        "gemini-1.5-flash-latest"
      ];
      let candidateModels = [];
      if (lastFastGeminiModel) candidateModels.push(lastFastGeminiModel);
      for (const m of fastCandidates) {
        if (!candidateModels.includes(m)) candidateModels.push(m);
      }

      let res = null;
      let lastErrMsg = "";
      for (const model of candidateModels) {
        if (multiStatusMsg) multiStatusMsg.textContent = `AI(${model}) 분석 중...`;
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: contentParts }],
              generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
            })
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            chrome.storage.local.set({ lastFastGeminiModel: model });
            break;
          }
        } catch (e) {
          lastErrMsg = e.message;
        }
      }

      if (!res || !res.ok) throw new Error(lastErrMsg || "AI 분석에 실패했습니다.");

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = extractJson(rawText);
      const newItems = parsed.items || [];
      if (newItems.length === 0) throw new Error("상품을 감지하지 못했습니다.");

      newItems.forEach(item => {
        item.spec = sanitizeSpec(item.spec);
        item.qty = Math.max(1, parseInt(item.qty) || 1);
        item.unit = "선택";
        item.unitPrice = Math.max(0, parseInt(item.unitPrice) || 0);
        item.totalPrice = item.qty * item.unitPrice;
        item.budgetNum = currentMultiBudget;
        item.injected = false;
      });

      multiCurrentItems = newItems;

      // multiBudgetItems에서 현재 예산 품목 교체 등록
      multiBudgetItems = multiBudgetItems.filter(it => it.budgetNum !== currentMultiBudget);
      multiBudgetItems.push(...multiCurrentItems);

      renderMultiCurrentItems();
      renderMultiCumulativeSummary();
      generateMultiDraftText();

      if (multiItemsCard) multiItemsCard.style.display = "block";
      if (multiStatusMsg) {
        multiStatusMsg.style.color = "var(--ok)";
        multiStatusMsg.textContent = `✅ ${currentMultiBudget}번 예산 ${newItems.length}개 품목 분석 완료! 아래 버튼으로 표에 입력하세요.`;
      }
    } catch (err) {
      console.error(err);
      if (multiStatusMsg) {
        multiStatusMsg.style.color = "var(--danger)";
        multiStatusMsg.textContent = getKoreanErrorMessage(err);
      }
    } finally {
      btnMultiAnalyze.disabled = false;
    }
  });
}

// 현재 작업 예산 품목 수량 조절 및 렌더링 (단일 예산과 100% 동일한 비주얼 카드 스타일)
function renderMultiCurrentItems() {
  if (!multiCurrentQtyList) return;
  multiCurrentQtyList.innerHTML = "";
  let total = 0;

  multiCurrentItems.forEach((item, idx) => {
    const qty = Math.max(1, parseInt(item.qty) || 1);
    const unitPrice = Math.max(0, parseInt(item.unitPrice) || 0);
    const sub = qty * unitPrice;
    total += sub;
    item.qty = qty;
    item.unitPrice = unitPrice;
    item.totalPrice = sub;

    const rowDiv = document.createElement("div");
    rowDiv.className = "quick-qty-row";
    rowDiv.innerHTML = `
      <div style="flex:1; min-width:0; font-size:12px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;" title="${item.name || ''}">
        <span style="padding:1px 5px; font-size:10px; font-weight:700; border:1px solid var(--accent-border); border-radius:4px; background:var(--accent-soft); color:var(--accent); flex-shrink:0;">${currentMultiBudget}번 예산</span>
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${idx + 1}. ${item.name || "물품"}${item.spec ? ` (${item.spec})` : ''}</span>
        <span style="font-size:11px; color:var(--text-3); font-weight:400; flex-shrink:0;">(${unitPrice.toLocaleString()}원)</span>
      </div>
      <div style="display:flex; align-items:center; gap:3px; flex-shrink:0;">
        <button type="button" class="qty-btn-minus qty-stepper-btn" title="1 감소">-</button>
        <input type="number" class="qty-direct-input" min="1" value="${qty}" />
        <button type="button" class="qty-btn-plus qty-stepper-btn" title="1 증가">+</button>
        <span style="font-size:11px; color:var(--text-2); margin-left:2px;">${item.unit || "개"}</span>
      </div>
      <div class="quick-item-total" style="font-size:12px; font-weight:700; color:var(--accent); min-width:68px; text-align:right; flex-shrink:0;">
        ${sub.toLocaleString()}원
      </div>
    `;

    const minusBtn = rowDiv.querySelector(".qty-btn-minus");
    const plusBtn = rowDiv.querySelector(".qty-btn-plus");
    const qtyInput = rowDiv.querySelector(".qty-direct-input");

    minusBtn.addEventListener("click", () => {
      if (item.qty > 1) {
        item.qty -= 1;
        renderMultiCurrentItems();
        renderMultiCumulativeSummary();
        generateMultiDraftText();
      }
    });

    plusBtn.addEventListener("click", () => {
      item.qty += 1;
      renderMultiCurrentItems();
      renderMultiCumulativeSummary();
      generateMultiDraftText();
    });

    qtyInput.addEventListener("input", () => {
      const v = Math.max(1, parseInt(qtyInput.value) || 1);
      item.qty = v;
      item.totalPrice = v * item.unitPrice;
      rowDiv.querySelector(".quick-item-total").textContent = `${item.totalPrice.toLocaleString()}원`;
      renderMultiCumulativeSummary();
      generateMultiDraftText();
    });

    qtyInput.addEventListener("blur", () => {
      renderMultiCurrentItems();
    });

    multiCurrentQtyList.appendChild(rowDiv);
  });

  if (multiCurrentItemCount) multiCurrentItemCount.textContent = multiCurrentItems.length;
  if (multiCurrentTotal) multiCurrentTotal.textContent = `총 ${total.toLocaleString()}원`;
}

// 전체 누적 요약 렌더링
function renderMultiCumulativeSummary() {
  if (!multiSummaryList) return;
  multiSummaryList.innerHTML = "";
  if (multiBudgetItems.length === 0) {
    multiSummaryList.innerHTML = `<div style="font-size:11.5px; color:var(--text-3); text-align:center; padding:6px 0;">아직 등록된 품목이 없습니다.</div>`;
    if (multiGrandSummaryText) multiGrandSummaryText.textContent = "0건 / 0원";
    return;
  }

  const budgetMap = {};
  multiBudgetItems.forEach(item => {
    const b = item.budgetNum || 1;
    if (!budgetMap[b]) {
      budgetMap[b] = { count: 0, amount: 0, injected: item.injected };
    }
    budgetMap[b].count++;
    budgetMap[b].amount += (item.totalPrice || 0);
    if (item.injected) budgetMap[b].injected = true;
  });

  let grandCount = 0;
  let grandTotal = 0;

  const bKeys = Object.keys(budgetMap).sort((a,b) => Number(a) - Number(b));
  bKeys.forEach(k => {
    const info = budgetMap[k];
    grandCount += info.count;
    grandTotal += info.amount;
    const row = document.createElement("div");
    row.className = "multi-summary-row";
    row.innerHTML = `
      <span><strong>${k}번 예산:</strong> ${info.count}건 (금 ${info.amount.toLocaleString()}원)</span>
      <span>${info.injected ? '<span style="color:#2e7d32; font-weight:800; font-size:11.5px;">[✅ 표 입력됨]</span>' : '<span style="color:var(--text-3); font-size:11.5px;">[대기]</span>'}</span>
    `;
    multiSummaryList.appendChild(row);
  });

  if (multiGrandSummaryText) {
    multiGrandSummaryText.textContent = `총 ${grandCount}건 / 금 ${grandTotal.toLocaleString()}원`;
  }
}

// 에듀파인 표에 현재 예산 품목 즉시 입력 버튼
if (btnMultiInjectItems) {
  btnMultiInjectItems.addEventListener("click", async () => {
    const curItems = multiBudgetItems.filter(it => it.budgetNum === currentMultiBudget);
    if (curItems.length === 0) {
      alert(`[품목 없음] ${currentMultiBudget}번 예산에 등록된 품목이 없습니다. 먼저 상품 캡처를 넣고 AI 분석을 진행해 주세요.`);
      return;
    }
    await executeInjection({
      injectItems: true,
      injectDraft: false,
      itemsToInjectOverride: curItems,
      budgetLabel: `${currentMultiBudget}번 예산`
    });
    // 주입 완료 표시
    multiBudgetItems.forEach(it => {
      if (it.budgetNum === currentMultiBudget) it.injected = true;
    });
    renderMultiCumulativeSummary();
  });
}

// 다음 예산 품목 입력으로 넘어가기 버튼
if (btnMultiNextBudget) {
  btnMultiNextBudget.addEventListener("click", () => {
    currentMultiBudget++;
    if (multiBudgetSelect && !multiBudgetSelect.querySelector(`option[value="${currentMultiBudget}"]`)) {
      const opt = document.createElement("option");
      opt.value = String(currentMultiBudget);
      opt.textContent = `${currentMultiBudget}번 예산`;
      multiBudgetSelect.appendChild(opt);
    }
    updateMultiBudgetUI();
    renderMultiGallery(); // ★ 새 예산의 캡처 갤러리(초기 비어있음)로 전환!

    const existing = multiBudgetItems.filter(it => it.budgetNum === currentMultiBudget);
    if (existing.length > 0) {
      multiCurrentItems = existing;
      renderMultiCurrentItems();
      if (multiItemsCard) multiItemsCard.style.display = "block";
    } else {
      multiCurrentItems = [];
      if (multiItemsCard) multiItemsCard.style.display = "none";
    }
    if (multiStatusMsg) multiStatusMsg.textContent = "";

    alert(
      `👉 [${currentMultiBudget}번 예산 입력 안내]\n\n` +
      `1. 에듀파인 화면의 [예산내역] 표에서 ${currentMultiBudget}번 예산 행을 마우스로 클릭하여 선택해 주세요!\n` +
      `2. 그 다음 ${currentMultiBudget}번 예산으로 구매할 상품 캡처 이미지를 넣고 AI 분석을 진행하시면 됩니다.`
    );
  });
}

// 다중 예산 전체 초기화 버튼
if (btnMultiResetAll) {
  btnMultiResetAll.addEventListener("click", () => {
    if (!confirm("지금까지 등록된 모든 예산 품목과 기안문을 초기화하시겠습니까?")) return;
    currentMultiBudget = 1;
    multiBudgetItems = [];
    multiBudgetImages = {};
    multiCurrentItems = [];
    updateMultiBudgetUI();
    renderMultiGallery();
    if (multiItemsCard) multiItemsCard.style.display = "none";
    renderMultiCumulativeSummary();
    if (multiDraftTitle) multiDraftTitle.value = "";
    if (multiDraftBody) multiDraftBody.value = "";
    if (btnMultiAnalyze) btnMultiAnalyze.disabled = true;
    if (multiStatusMsg) multiStatusMsg.textContent = "";
  });
}

// 전체 종합 기안문 자동 생성 함수 (단일예산과 동일한 표준 공문서 형식)
function generateMultiDraftText() {
  if (multiBudgetItems.length === 0) return;
  const usageVal = multiUsageSelect?.value === "custom" ? multiCustomUsage?.value.trim() : multiUsageSelect?.value || "교육활동";
  const refVal = multiRefSelect?.value === "custom" ? multiCustomRef?.value.trim() : multiRefSelect?.value || "";

  const repName = multiBudgetItems[0]?.name || "물품";
  const totalCount = multiBudgetItems.length;

  const titleUsage = usageVal ? `${usageVal} ` : "";
  const title = totalCount > 1
    ? `${titleUsage}${repName} 외 ${totalCount - 1}건 구입`
    : `${titleUsage}${repName} 구입`;

  const grandTotal = multiBudgetItems.reduce((acc, cur) => acc + (cur.totalPrice || 0), 0);
  const grandKor = numberToKorean(grandTotal);
  const repItem = multiBudgetItems[0]?.name || repName;
  const itemCountText = totalCount > 1
    ? `${repItem} 외 ${totalCount - 1}건(품의명세서 참조)`
    : `${repItem}(품의명세서 참조)`;

  let bodyLines = [];
  if (refVal) {
    bodyLines.push(`1. 관련: ${refVal}`);
  } else {
    bodyLines.push(`1. 관련: 없음`);
  }

  bodyLines.push(`2. ${usageVal || "관련"} 물품을 아래와 같이 구입하고자 합니다.`);
  bodyLines.push(`  가. 내역: ${repName}`);
  bodyLines.push(`  나. 용도: ${usageVal || "물품 구입"}`);
  bodyLines.push(`  다. 소요예산: 금${grandTotal.toLocaleString()}원 (금${grandKor}원)`);
  bodyLines.push(`  라. 산출내역: ${itemCountText}`);
  bodyLines.push(``);
  bodyLines.push(`붙임  지출(지급)품의서 1부.  끝.`);

  if (multiDraftTitle) multiDraftTitle.value = title;
  if (multiDraftBody) multiDraftBody.value = bodyLines.join("\n");
}

if (btnMultiGenDraft) {
  btnMultiGenDraft.addEventListener("click", () => {
    generateMultiDraftText();
    alert("전체 예산 품목과 소계가 반영된 종합 기안문이 새로고침되었습니다.");
  });
}

// 최종 기안문(제목+본문) 에듀파인 즉시 입력 버튼
if (btnMultiInjectDraft) {
  btnMultiInjectDraft.addEventListener("click", async () => {
    const title = multiDraftTitle ? multiDraftTitle.value.trim() : "";
    const body = multiDraftBody ? multiDraftBody.value.trim() : "";
    if (!title && !body) {
      alert("입력할 최종 기안문(제목 또는 본문)이 비어있습니다.");
      return;
    }
    await executeInjection({
      injectItems: false,
      injectDraft: true,
      titleOverride: title,
      bodyOverride: body
    });
  });
}

// ==========================================================================
// 공통 에듀파인 주입 실행 함수 (기안문/품목 분할 및 사용자 오버라이드 지원)
// ==========================================================================
async function executeInjection({
  injectItems = true,
  injectDraft = true,
  budgetFilter = 'ALL',
  itemsToInjectOverride = null,
  titleOverride = null,
  bodyOverride = null,
  budgetLabel = null
} = {}) {
  let title = "";
  if (injectDraft) {
    title = titleOverride !== null ? titleOverride.trim() : draftTitle.value.trim();
  }
  let body = "";
  if (injectDraft) {
    body = bodyOverride !== null ? bodyOverride.trim() : draftBody.value.trim();
  }
  let itemsToInject = [];

  if (injectItems) {
    if (itemsToInjectOverride !== null) {
      itemsToInject = itemsToInjectOverride;
    } else if (budgetFilter === 'ALL') {
      itemsToInject = parsedItems;
    } else {
      const bNum = parseInt(budgetFilter) || 1;
      itemsToInject = parsedItems.filter(item => (parseInt(item.budgetNum) || 1) === bNum);
    }

    if (itemsToInject.length === 0) {
      alert(`[품목 없음] ${budgetFilter === 'ALL' ? '입력할 품목이 없습니다.' : `${budgetFilter}번 예산으로 지정된 품목이 없습니다.`}`);
      return;
    }
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) {
    alert("활성화된 에듀파인 브라우저 창을 찾을 수 없습니다.");
    return;
  }

  // ★ 사용자 요청: 예산 선택을 안 하면 품목 입력 자체가 아예 안 되게 사전 차단!
  if (injectItems) {
    try {
      const preCheckResults = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id, allFrames: true },
        world: 'MAIN',
        func: () => {
          try {
            const docs = [document];
            try {
              const iframes = Array.from(document.querySelectorAll('iframe, frame'));
              for (const f of iframes) {
                const d = f.contentDocument || f.contentWindow?.document;
                if (d && !docs.includes(d)) docs.push(d);
              }
            } catch(e) {}

            for (const doc of docs) {
              const addRowBtn = Array.from(doc.querySelectorAll('*')).find(el => {
                const t = (el.textContent || el.value || el.title || '').trim().replace(/\s+/g, '');
                return t.includes('행추가') && t.length <= 10 && el.getBoundingClientRect().width >= 20;
              });
              const itemGridEl = doc.querySelector('[id*="grdPrdlstDtl"]');

              // ★ 품목 [행추가] 버튼이나 품목 표 그리드가 실재하는 프레임만 품의 화면으로 인정!
              if (addRowBtn || itemGridEl) {
                const itemTop = (addRowBtn || itemGridEl).getBoundingClientRect().top || 99999;
                const allNodes = Array.from(doc.querySelectorAll('*'));

                // 1) 예산 그리드 전용 헤더 셀 탐색 ('세부사업' 또는 '원가통계비목')
                const budgetHeadCell = allNodes.find(el => {
                  const id = el.id || '';
                  if (!id.includes('.head.') && el.tagName !== 'TH') return false;
                  const t = (el.textContent || '').trim().replace(/\s+/g, '');
                  const r = el.getBoundingClientRect();
                  return (t === '세부사업' || t === '*세부사업' || t === '원가통계비목' || t === '산출내역') &&
                         r.width > 20 && r.height > 10 && r.left >= 180;
                });

                let budgetGridId = '';
                if (budgetHeadCell) {
                  budgetGridId = budgetHeadCell.id.split('.head.')[0].split(':')[0];
                }

                // 2) 예산 그리드의 실제 데이터 행(.body.gridrow_)만 정밀 조회!
                let validRows = [];
                if (budgetGridId) {
                  validRows = Array.from(doc.querySelectorAll(`[id^="${budgetGridId}.body.gridrow_"]`)).filter(el => {
                    return /\.body\.gridrow_\d+$/.test(el.id || '');
                  });
                } else {
                  validRows = Array.from(doc.querySelectorAll('[id*=".body.gridrow_"]')).filter(el => {
                    const id = el.id || '';
                    if (!/\.body\.gridrow_\d+$/.test(id)) return false;
                    if (id.includes('grdPrdlstDtl') || id.includes('divAuth2') || id.includes('grdLeft') || id.includes('grdMenu')) return false;
                    const r = el.getBoundingClientRect();
                    return r.left >= 180 && r.width > 100 && r.height > 10 && r.top < itemTop - 10;
                  });
                }

                // 3) 찾은 예산 행의 실제 내용 검사
                let hasBudget = false;
                for (const row of validRows) {
                  const raw = (row.textContent || '').replace(/\s+/g, '');
                  if (!raw || raw === 'N' || raw.includes('조회') || raw.includes('없습니다') || raw.includes('결과가없습니다')) continue;

                  const hasKoreanSubject = /[가-힣]{2,}/.test(raw);
                  const hasNumber = /\d{1,3},\d{3}/.test(raw) || /\d{4,}/.test(raw);

                  if (hasKoreanSubject && hasNumber) {
                    hasBudget = true;
                    break;
                  }
                }

                return { isProposalScreen: true, hasBudget: hasBudget };
              }
            }
            return { isProposalScreen: false };
          } catch(err) {
            return { isProposalScreen: false, error: err.message };
          }
        }
      });

      let foundProposalScreen = false;
      let anyBudgetSelected = false;

      if (preCheckResults && preCheckResults.length > 0) {
        for (const r of preCheckResults) {
          if (r.result?.isProposalScreen) {
            foundProposalScreen = true;
            if (r.result?.hasBudget) {
              anyBudgetSelected = true;
              break;
            }
          }
        }
      }

      if (foundProposalScreen && !anyBudgetSelected) {
        alert(
          "⚠️ [예산 먼저 선택 안내]\n\n" +
          "에듀파인 품의등록 화면에 '예산'이 아직 선택(조회)되지 않았습니다!\n\n" +
          "에듀파인 시스템 규정상 예산이 먼저 지정되어야 품목 행을 추가하고 입력할 수 있습니다.\n" +
          "예산이 없는 상태에서 품목을 입력하면, 나중에 예산을 선택할 때 기껏 입력한 품목이 모두 초기화(삭제)되므로 품목 입력을 시작하지 않았습니다.\n\n" +
          "👉 에듀파인 화면에서 [예산선택] 버튼을 눌러 예산을 먼저 선택하신 후, 다시 [품목 즉시 입력] 버튼을 눌러주세요!"
        );
        return;
      }
    } catch(preCheckErr) {
      console.warn("예산 사전 검사 건너뜀:", preCheckErr);
    }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id, allFrames: true },
      world: 'MAIN',
      func: injectedFiller,
      args: [title, body, itemsToInject]
    });

    let anyTitle = false;
    let anyBody = false;
    let totalItemsInjected = 0;
    let diagGridFound = false;
    let maxRowsFound = 0;
    let diagDetails = [];
    let budgetWarningFound = false;

    if (results && results.length > 0) {
      for (const r of results) {
        if (r.result?.titleFound) anyTitle = true;
        if (r.result?.bodyFound) anyBody = true;
        if (r.result?.itemsInjectedCount) totalItemsInjected += r.result.itemsInjectedCount;
        if (r.result?.diagGridFound) diagGridFound = true;
        if (r.result?.diagRowCount && r.result.diagRowCount > maxRowsFound) {
          maxRowsFound = r.result.diagRowCount;
        }
        if (r.result?.diagDetail && !diagDetails.includes(r.result.diagDetail)) {
          diagDetails.push(r.result.diagDetail);
        }
        if (r.result?.isProposalScreen && r.result?.budgetNotSelected) budgetWarningFound = true;
      }
    }

    if (budgetWarningFound && injectItems) {
      alert(
        "⚠️ [예산 먼저 선택 안내]\n\n" +
        "에듀파인 품의등록 화면에 '예산'이 아직 선택(조회)되지 않았습니다!\n\n" +
        "에듀파인 시스템 규정상 예산이 먼저 지정되어야 품목 행을 추가하고 입력할 수 있습니다.\n" +
        "에듀파인 화면에서 [예산선택]을 먼저 완료하신 후, 다시 [품목 즉시 입력] 버튼을 눌러주세요!"
      );
      return;
    }

    const currentVer = chrome.runtime.getManifest()?.version || "2.5.5";
    let msg = `[에듀파인 화면 입력 완료! (v${currentVer})]\n\n`;

    if (injectDraft) {
      msg += `- 제목: ${anyTitle ? '✅ 입력됨' : '미탐색'}\n`;
      msg += `- 본문: ${anyBody ? '✅ 입력됨' : '미탐색'}\n`;
    }

    if (injectItems) {
      const bLabel = budgetLabel || (budgetFilter === 'ALL' ? '전체' : `${budgetFilter}번 예산`);
      if (totalItemsInjected > 0) {
        msg += `- 품목 내역: ✅ [${bLabel}] 총 ${totalItemsInjected}개 품목이 표에 입력되었습니다!\n`;
        if (!injectDraft) {
          msg += `\n💡 다음 순서: 다음 예산 품목을 계속 입력하시거나, 모든 품목 입력이 끝나면 아래 [최종 기안문(제목+본문) 즉시 입력]을 눌러주세요.`;
        }
      } else {
        msg += `- 품목 내역: 표 인식을 시도했으나 셀을 찾지 못했습니다. (그리드: ${diagGridFound ? 'O' : 'X'}, 행: ${maxRowsFound})\n`;
        if (diagDetails.length > 0) {
          msg += `- 진단 정보: ${diagDetails.join(' | ')}\n`;
        }
      }
    }

    alert(msg);
  } catch (err) {
    console.error("주입 오류:", err);
    alert(`에듀파인 화면 연결 실패: ${err.message}`);
  }
}

// 1. 단일 예산: 원클릭 전체 입력 (기안문 + 품목)
btnInjectEdufine.addEventListener("click", () => {
  executeInjection({ injectItems: true, injectDraft: true, budgetFilter: 'ALL' });
});

// 에듀파인 규격 엑셀 다운로드
btnDownloadExcel.addEventListener("click", () => {
  if (parsedItems.length === 0) {
    alert("다운로드할 품목 내역이 없습니다.");
    return;
  }

  const aoa = [
    ["품목내역", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["순번", "* 내용", "S2B물품번호", "규격", "수량", "단위", "예상단가", "* 예상금액", "수수료"]
  ];

  parsedItems.forEach((item, idx) => {
    const qty = parseInt(item.qty) || 1;
    const unitPrice = parseInt(item.unitPrice) || 0;
    const totalPrice = parseInt(item.totalPrice) || (qty * unitPrice);

    aoa.push([
      idx + 1,
      item.name || "",
      item.s2bCode || "",
      item.spec || "",
      qty,
      item.unit || "개",
      unitPrice,
      totalPrice,
      ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "품목내역");

  const title = (draftTitle.value.trim() || "품목내역").replace(/[\/\\?%*:|"<>]/g, "_");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `${title}_${today}.xlsx`;

  try {
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);

    // 확장 프로그램 전용 API: 브라우저 전역 설정과 무관하게 이 엑셀만 팝업 없이 바로 저장!
    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false // 다른 사이트는 팝업이 뜨고, 오직 이 프로그램만 팝업 없이 즉시 저장!
      }, () => {
        statusMsg.style.color = "#2e7d32";
        statusMsg.textContent = "✅ 품목 엑셀이 다운로드 폴더에 자동 저장되었습니다!";
        alert(`📥 [품목 엑셀 저장 완료!]\n\n저장 팝업 없이 '다운로드' 폴더에 자동 저장되었습니다.\n에듀파인 품목 표의 [ 파일 ⇧ ] 버튼을 누르시면 가장 첫 번째에 바로 뜹니다!`);
      });
    } else {
      XLSX.writeFile(wb, filename);
    }
  } catch (err) {
    XLSX.writeFile(wb, filename);
  }
});

// 품목 그리드용 데이터 복사 (Ctrl+V)
btnCopyGridData.addEventListener("click", () => {
  if (!parsedItems || parsedItems.length === 0) {
    alert("복사할 품목 내역이 없습니다.");
    return;
  }
  const tsvLines = parsedItems.map(item => {
    const name = item.name || "";
    const spec = item.spec || "";
    const qty = item.qty || 1;
    const unit = item.unit || "개";
    const price = item.unitPrice || 0;
    return `${name}\t${spec}\t${qty}\t${unit}\t${price}`;
  });
  navigator.clipboard.writeText(tsvLines.join("\n")).then(() => {
    alert(`📋 품목 ${parsedItems.length}건이 복사되었습니다!\n에듀파인 품목 표의 첫 번째 칸을 누르고 [Ctrl + V] 하시면 즉시 표에 채워집니다.`);
  });
});

// 기안문 텍스트 클립보드 복사
btnCopyDraft.addEventListener("click", () => {
  const fullText = `[제목] ${draftTitle.value}\n\n[본문]\n${draftBody.value}`;
  navigator.clipboard.writeText(fullText).then(() => {
    alert("📋 기안문 제목과 본문이 클립보드에 복사되었습니다!");
  });
});

// ==========================================================================
// 깃허브 최신 릴리즈 자동 감지 및 원클릭 업데이트 알림
// ==========================================================================
async function checkForAppUpdates() {
  const updateBanner = document.getElementById("updateBanner");
  const updateVerBadge = document.getElementById("updateVerBadge");
  const btnOpenUpdateGuide = document.getElementById("btnOpenUpdateGuide");
  const btnCloseUpdateBanner = document.getElementById("btnCloseUpdateBanner");

  if (!updateBanner) return;

  if (btnCloseUpdateBanner) {
    btnCloseUpdateBanner.addEventListener("click", () => {
      updateBanner.style.display = "none";
      chrome.storage.local.set({ lastDismissedUpdateVer: updateVerBadge?.textContent?.trim() || "" });
    });
  }

  if (btnOpenUpdateGuide) {
    btnOpenUpdateGuide.addEventListener("click", () => {
      const ver = updateVerBadge?.textContent?.trim() || "최신";
      alert(
        `🚀 [에듀파인 품의 도우미 ${ver} 원클릭 업데이트 방법]\n\n` +
        `1. 다운로드받으셨던 [edufine-draft-assistant] 폴더를 엽니다.\n` +
        `2. 폴더 안에 있는 [업데이트.bat] 파일을 더블클릭합니다.\n` +
        `3. 검은 창에서 다운로드 및 파일 교체가 자동으로 진행됩니다.\n` +
        `4. 완료 후 브라우저 확장 관리창(chrome://extensions)에서 [새로고침(🔄)]만 누르시면 최신 버전으로 즉시 반영됩니다!\n\n` +
        `💡 [확인]을 누르시면 깃허브 최신 릴리즈 페이지로 이동합니다.`
      );
      if (chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: "https://github.com/yerang-k/edufine-draft-assistant/releases/latest" });
      }
    });
  }

  try {
    const curVer = chrome.runtime.getManifest()?.version || "2.5.5";
    const { lastUpdateCheckTime, latestRemoteVer, lastDismissedUpdateVer } = await chrome.storage.local.get([
      "lastUpdateCheckTime", "latestRemoteVer", "lastDismissedUpdateVer"
    ]);

    let remoteTag = latestRemoteVer;
    const now = Date.now();

    // 20분마다 주기적으로 깃허브 API 확인
    if (!remoteTag || !lastUpdateCheckTime || (now - lastUpdateCheckTime > 20 * 60 * 1000)) {
      try {
        const res = await fetch("https://api.github.com/repos/yerang-k/edufine-draft-assistant/releases/latest", {
          headers: { "Accept": "application/vnd.github.v3+json" }
        });
        if (res.ok) {
          const data = await res.json();
          remoteTag = data.tag_name || "";
          await chrome.storage.local.set({
            latestRemoteVer: remoteTag,
            lastUpdateCheckTime: now
          });
        }
      } catch(fetchErr) {
        // 오프라인이거나 네트워크 오류 시 무시
      }
    }

    if (remoteTag) {
      const cleanRemote = remoteTag.replace(/^v/i, "").trim();
      const cleanCur = curVer.replace(/^v/i, "").trim();
      if (compareVersions(cleanRemote, cleanCur) > 0 && lastDismissedUpdateVer !== remoteTag) {
        if (updateVerBadge) updateVerBadge.textContent = remoteTag;
        updateBanner.style.display = "flex";
      }
    }
  } catch(e) {
    console.log("[업데이트 체크 건너뜀]:", e);
  }
}

function compareVersions(vA, vB) {
  const partsA = vA.split(".").map(n => parseInt(n, 10) || 0);
  const partsB = vB.split(".").map(n => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const a = partsA[i] || 0;
    const b = partsB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

// 초기 로드 시 업데이트 확인 실행
checkForAppUpdates();
