// K-에듀파인 품의 기안문 자동 입력 스크립트

function setNativeValue(element, value) {
  if (!element) return;
  element.focus();
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, String(value));
  } else if (valueSetter) {
    valueSetter.call(element, String(value));
  } else {
    element.value = String(value);
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// 요구일자 및 달력 칸 보호
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

// 기안문 수신 및 입력
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INJECT_DRAFT") {
    const { title, body } = request.data;
    let titleInjected = false;
    let bodyInjected = false;

    // 1. 제목 주입 (라벨 기반)
    const allLabels = Array.from(document.querySelectorAll('th, td, label, span'));
    for (const lbl of allLabels) {
      const rawTxt = (lbl.textContent || '').trim().replace(/\s+/g, '');
      if ((rawTxt === '*제목' || rawTxt === '제목') && !rawTxt.includes('Byte')) {
        const nextCell = lbl.nextElementSibling;
        if (nextCell) {
          const inp = nextCell.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
          if (inp && !isCalendarOrDateField(inp)) {
            setNativeValue(inp, title);
            titleInjected = true;
            break;
          }
        }
        const row = lbl.closest('tr');
        if (row) {
          const inps = Array.from(row.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])')).filter(i => !isCalendarOrDateField(i));
          if (inps.length > 0) {
            setNativeValue(inps[0], title);
            titleInjected = true;
            break;
          }
        }
      }
    }

    if (!titleInjected) {
      const titleCandidates = [
        'input[id*="dmdTit" i]',
        'input[name*="dmdTit" i]',
        'input[id*="pumuiTit" i]',
        'input[name*="pumuiTit" i]',
        'input[title*="제목" i]',
        'input[placeholder*="제목" i]',
        'input.w2input[id*="tit" i]'
      ];
      for (const sel of titleCandidates) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null && !isCalendarOrDateField(el)) {
          setNativeValue(el, title);
          titleInjected = true;
          break;
        }
      }
    }

    // 2. 본문 주입
    const textareaCandidates = [
      'textarea[name*="content" i]',
      'textarea[id*="content" i]',
      'textarea[name*="desc" i]',
      'textarea[id*="desc" i]',
      'textarea[title*="내용" i]',
      'textarea[title*="개요" i]',
      'textarea[placeholder*="내용" i]',
      'textarea'
    ];
    for (const sel of textareaCandidates) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null && !el.readOnly && !el.disabled && !isReqDate(el)) {
        setNativeValue(el, body);
        bodyInjected = true;
        break;
      }
    }

    // DextEditor 등 에디터
    if (!bodyInjected) {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      for (const iframe of iframes) {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            const editEl = doc.querySelector('body[contenteditable="true"], body.dext_body, div[contenteditable="true"]');
            if (editEl) {
              editEl.innerHTML = body.replace(/\n/g, '<br>');
              editEl.dispatchEvent(new Event('input', { bubbles: true }));
              bodyInjected = true;
              break;
            }
          }
        } catch (e) {}
      }

      if (!bodyInjected) {
        const editable = document.querySelector('[contenteditable="true"]');
        if (editable && editable.offsetParent !== null) {
          editable.innerHTML = body.replace(/\n/g, '<br>');
          editable.dispatchEvent(new Event('input', { bubbles: true }));
          bodyInjected = true;
        }
      }
    }

    sendResponse({
      success: titleInjected || bodyInjected,
      titleInjected,
      bodyInjected
    });
  }
  return true;
});
