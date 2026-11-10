# 개인정보처리방침 (Privacy Policy)

**최종 수정일:** 2026년 11월 10일  
**적용 대상:** K-에듀파인 품의 도우미 (Edufine Draft Assistant)

본 확장 프로그램은 사용자의 개인정보를 매우 소중하게 생각하며, 최소한의 기능 수행 목적 외에는 어떠한 개인정보도 무단 수집, 저장, 유출하지 않습니다.

---

## 1. 수집하는 개인정보 항목 및 목적

본 확장 프로그램은 **별도의 자체 백엔드 서버나 데이터베이스를 운영하지 않으며**, 사용자의 어떠한 개인정보도 개발자 또는 제3자의 서버로 전송하거나 수집하지 않습니다.

* **Google Gemini API Key:** 사용자가 직접 입력한 Gemini API 키는 오직 사용자의 브라우저 로컬 저장소(`chrome.storage.local`)에만 암호화되어 안전하게 보관되며, Google Gemini API 호출 시 인증 목적으로만 사용됩니다.
* **장바구니 캡처 이미지 및 품목 데이터:** 사용자가 입력한 캡처 이미지는 사용자가 발급받은 본인의 API Key를 통해 오직 Google의 공식 AI Studio 엔드포인트(`generativelanguage.googleapis.com`)로만 전송되어 품목 분석에 사용되며, 완료 즉시 메모리에서 폐기됩니다.
* **품의서 입력 데이터:** K-에듀파인 화면에 입력되는 제목, 본문, 품목 내역은 사용자의 브라우저 탭 내에서만 로컬 자바스크립트를 통해 처리되며 외부로 유출되지 않습니다.

---

## 2. 권한 사용 목적 (Chrome Extension Permissions)

* `storage`: 사용자가 등록한 Gemini API Key, 프롬프트 설정값 등을 브라우저 로컬에 안전하게 저장하기 위해 사용합니다.
* `activeTab` & `scripting`: 사용자가 활성화한 에듀파인 웹페이지 화면에 품의 제목, 본문 및 품목 표를 자동으로 입력하기 위해 사용합니다.
* `sidePanel`: 브라우저 우측에 품의 작성 및 제어용 사이드패널 UI를 제공하기 위해 사용합니다.
* `downloads`: 생성된 품목 내역을 엑셀(XLSX) 양식 파일로 사용자 컴퓨터에 내려받기 위해 사용합니다.
* `<all_urls>`: 전국 17개 시·도 교육청별로 상이한 에듀파인 도메인(예: sen.go.kr, gbe.go.kr, pen.go.kr 등) 및 학교별 인트라넷 주소 환경에서도 정상적인 품의 입력을 지원하기 위해 사용됩니다.

---

## 3. 제3자 제공 및 외부 전송

본 확장 프로그램은 구글 공식 AI 서비스(Google Gemini API) 외에 어떠한 제3자에게도 데이터를 제공하지 않습니다.

* **연동 서비스:** Google Gemini API (Google LLC)
* **목적:** 장바구니 캡처 이미지 내 품목명, 규격, 수량, 가격 광학 분석 및 품의서 텍스트 생성
* **구글 개인정보 보호정책:** [https://policies.google.com/privacy](https://policies.google.com/privacy)

---

## 4. 데이터 보관 및 파기

* 모든 설정 데이터는 사용자의 로컬 브라우저에만 존재하며, 확장 프로그램을 브라우저에서 삭제(제거)할 경우 즉시 영구 파기됩니다.

---

## 5. 문의처

본 개인정보처리방침 또는 확장 프로그램에 대한 문의 사항은 아래로 연락해 주시기 바랍니다.

* **개발자 / 관리자:** yerang-k
* **이메일:** yeahskyr@gmail.com
* **GitHub Repository:** [https://github.com/yerang-k/edufine-draft-assistant](https://github.com/yerang-k/edufine-draft-assistant)

---

## English Summary (For Chrome Web Store Reviewers)

**Edufine Draft Assistant** values user privacy:
1. **No External Server:** We do not own, maintain, or transmit any user data to any external/third-party server.
2. **Local Storage Only:** The Google Gemini API key entered by the user is stored strictly in the user's browser local storage (`chrome.storage.local`).
3. **Data Usage:** Shopping cart images pasted by the user are sent directly to the official Google Gemini API endpoint solely for analyzing item names and prices to generate drafts.
4. **Permissions:**
   - `storage`: Storing API keys and user preferences locally.
   - `activeTab` / `scripting`: Auto-filling draft titles and item tables on the local K-Edufine page upon user request.
   - `sidePanel`: Displaying the draft generator assistant UI.
   - `downloads`: Exporting the analyzed items to an Excel (.xlsx) file.
   - `<all_urls>`: Supporting local draft insertion across various educational regional intranet domains in Korea (e.g., `*.sen.go.kr`, `*.jbe.go.kr`).

