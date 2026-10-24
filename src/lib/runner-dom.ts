// the in-page half of the cloud runner: injected into each portal page with page.evaluate.
// kept as a string so it runs in the browser, not in node. it only reads the page and sets values;
// all decisions (what to fill, whether to submit) are made server-side.
export const DOM_HELPER = String.raw`
(() => {
  if (window.__am) return;
  const textOf = (el) => (el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : "");
  const visible = (el) => {
    if (!el || el.disabled || el.readOnly || el.type === "hidden") return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0 || el.type === "radio" || el.type === "checkbox" || el.type === "file";
  };
  let seq = 0;
  const idOf = (el) => el.getAttribute("data-am-id") || (el.setAttribute("data-am-id", "f" + (++seq) + "_" + Math.random().toString(36).slice(2, 6)), el.getAttribute("data-am-id"));
  const labelFor = (el) => {
    const parts = [];
    if (el.id) { const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l) parts.push(textOf(l)); }
    const wrap = el.closest("label"); if (wrap) parts.push(textOf(wrap));
    const by = el.getAttribute("aria-labelledby");
    if (by) parts.push(by.split(/\s+/).map((i) => textOf(document.getElementById(i))).join(" "));
    for (const a of ["aria-label", "placeholder", "title"]) if (el.getAttribute(a)) parts.push(el.getAttribute(a));
    let own = parts.join(" ").replace(/\s+/g, " ").trim();
    // a bare "Month"/"Day"/"Year" or very short label means little alone: prefix the row's question
    // (slate renders birthdate as three selects inside one .form_question)
    if (!own || own.length <= 12) {
      const row = el.closest(".form_question, .form-group, .field, .question, fieldset, tr, li");
      const q = row && (row.querySelector(".form_label, legend, label:not([for]), th, .label, h3, h4") || null);
      const ctx = q ? textOf(q) : row ? textOf(row).slice(0, 120) : "";
      if (ctx && !own.toLowerCase().includes(ctx.toLowerCase())) own = (ctx + " " + own).trim();
    }
    return own.slice(0, 300);
  };
  const groupLabel = (radio) => {
    const fs = radio.closest("fieldset");
    if (fs && fs.querySelector("legend")) return textOf(fs.querySelector("legend"));
    const g = radio.closest('[role="radiogroup"], .form-group, .question, tr, li, div');
    return g ? textOf(g).slice(0, 160) : radio.name || "";
  };
  const isEmpty = (el) => el.tagName === "SELECT" ? (el.selectedIndex <= 0 || !el.value) : el.type === "checkbox" ? !el.checked : el.type === "file" ? !(el.files && el.files.length) : !String(el.value || "").trim();
  const typeOf = (el) => el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : (el.type || "text").toLowerCase();

  function fields(includeFilled) {
    const out = []; const seen = new Set();
    for (const el of document.querySelectorAll("input, textarea, select")) {
      const type = typeOf(el);
      if (["hidden", "submit", "button", "reset", "image", "search"].includes(type) || !visible(el)) continue;
      if (type === "radio") {
        if (!el.name || seen.has(el.name)) continue; seen.add(el.name);
        const group = [...document.querySelectorAll('input[type="radio"][name="' + CSS.escape(el.name) + '"]')];
        if (!includeFilled && group.some((g) => g.checked)) continue;
        out.push({ id: idOf(el), label: groupLabel(el), type: "radio", name: el.name, options: group.map((g) => labelFor(g) || g.value), required: group.some((g) => g.required) });
        continue;
      }
      if (!includeFilled && !isEmpty(el)) continue;
      const label = labelFor(el);
      out.push({ id: idOf(el), label, type, name: el.name || undefined, autocomplete: el.autocomplete || undefined,
        options: type === "select" ? [...el.options].map((o) => o.text.trim()) : undefined,
        required: el.required || el.getAttribute("aria-required") === "true" || /\*\s*$/.test(label) });
    }
    return out.slice(0, 150);
  }
  function buttons() {
    return [...document.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"]')].filter(visible)
      .map((b) => ({ id: idOf(b), label: ((b.tagName === "INPUT" ? b.value : textOf(b)) || b.getAttribute("aria-label") || "").trim().slice(0, 80), link: b.tagName === "A" }))
      .filter((b) => b.label);
  }
  function setValue(el, v) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }
  function apply(f) {
    const el = document.querySelector('[data-am-id="' + f.id + '"]');
    if (!el) return false;
    if (f.action === "fill") { if (el.maxLength > 0 && f.value.length > el.maxLength) return false; setValue(el, f.value); return true; }
    if (f.action === "choose") {
      if (el.tagName === "SELECT") { const o = [...el.options].find((x) => x.text.trim() === f.option); if (!o) return false; el.value = o.value; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; }
      const hit = [...document.querySelectorAll('input[type="radio"][name="' + CSS.escape(el.name) + '"]')].find((g) => (labelFor(g) || g.value) === f.option);
      if (!hit) return false; hit.click(); return true;
    }
    if (f.action === "check") { if (!el.checked) el.click(); return el.checked; }
    return false;
  }
  function snapshot() {
    const body = textOf(document.body).slice(0, 20000);
    return {
      url: location.href,
      title: document.title,
      body: body.slice(0, 4000),
      captcha: !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], iframe[src*="challenges.cloudflare"], .g-recaptcha, .h-captcha, .cf-turnstile, [data-sitekey]'),
      payment: !!document.querySelector('input[autocomplete^="cc-"], iframe[src*="stripe"], iframe[src*="braintree"], iframe[src*="paypal"], iframe[src*="flywire"], iframe[src*="cybersource"], iframe[src*="authorize.net"]') || /\b(card number|cardholder|cvv|cvc)\b/i.test(body),
      confirmation: /(application (has been |was )?(successfully )?submitted|thank you for (submitting|applying|your application)|submission (is )?complete|your application is complete|confirmation (number|code))/i.test(body),
      fingerprint: [...document.querySelectorAll("h1, h2, h3, legend, label")].slice(0, 40).map(textOf).join("|").slice(0, 2000),
      fields: fields(false),
      allFields: fields(true).map((f) => ({ id: f.id, label: f.label, type: f.type, autocomplete: f.autocomplete, required: f.required })),
      buttons: buttons(),
    };
  }
  window.__am = { snapshot, apply, fields };
})();
`;
