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
    // a bare "Month"/"Day"/"Year" or very short label means little alone: prefix the row's question.
    // not for radio/checkbox options ("Yes", "No"): those are answers, their question comes from groupLabel.
    // (only for labels that say nothing alone: "Email", "City" or "Phone" are complete questions)
    if ((!own || own.replace(/[^a-z]/gi, "").length <= 2 || /^(day|month|year|dd|mm|yy|yyyy|select|choose|please select|-+)\b/i.test(own.trim())) && el.type !== "radio" && el.type !== "checkbox") {
      let ctx = "";
      // 1. nearest ancestor with a little text of its own (minus this field's own option text)
      const mine = textOf(el);
      let a = el.parentElement;
      for (let i = 0; i < 4 && a && !ctx; i++, a = a.parentElement) {
        const t = (mine ? textOf(a).split(mine).join(" ") : textOf(a)).replace(/\s+/g, " ").trim();
        if (t && t.length <= 120) ctx = t;
        else if (t.length > 120) break;
      }
      // 2. the row's label element (slate's .form_label, a legend, a th)
      if (!ctx) {
        const row = el.closest(".form_question, .form-group, .field, .question, fieldset, tr, li") || (el.parentElement && el.parentElement.closest("div, p, span"));
        const q = row && row.querySelector(".form_label, legend, label:not([for]), th, .label, h3, h4");
        ctx = q ? textOf(q) : "";
      }
      if (ctx && !own.toLowerCase().includes(ctx.toLowerCase())) own = (ctx + " " + own).trim();
    }
    return own.slice(0, 300);
  };
  // a radio group's question: the nearest ancestor text once the option labels are taken out
  // (stirling puts several questions in one block; the first ancestor with its own short text is the question)
  const groupLabel = (radio) => {
    const group = [...document.querySelectorAll('input[type="radio"][name="' + CSS.escape(radio.name) + '"]')];
    const opts = group.map((g) => labelFor(g) || g.value).filter(Boolean);
    const fs = radio.closest("fieldset");
    let p = radio.parentElement;
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
      let t = textOf(p);
      const full = t;
      for (const o of opts) if (o) t = t.split(o).join(" ");
      t = t.replace(/\s+/g, " ").trim();
      // "Part-time or Full-time *" minus its options leaves "or *": keep the whole line instead
      if (t && t.replace(/[^a-z]/gi, "").length < 5 && full.length <= 160) t = full;
      if (t && t.length <= 160) return t;
      if (t.length > 160) break;
    }
    if (fs && fs.querySelector("legend")) return textOf(fs.querySelector("legend"));
    return radio.name || "";
  };

  const isEmpty = (el) => el.tagName === "SELECT" ? (el.selectedIndex <= 0 || !el.value) : el.type === "checkbox" ? !el.checked : el.type === "file" ? !(el.files && el.files.length) : !String(el.value || "").trim();
  const typeOf = (el) => el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : (el.type || "text").toLowerCase();

  function fields(includeFilled) {
    const out = []; const seen = new Set();
    for (const el of document.querySelectorAll("input, textarea, select")) {
      const type = typeOf(el);
      if (["hidden", "submit", "button", "reset", "image", "search"].includes(type) || !visible(el)) continue;
      // cookie banners and site search aren't part of the application: never touch them
      if (el.closest('#onetrust-consent-sdk, #onetrust-banner-sdk, [id*="cookie" i], [class*="cookie" i], [aria-label*="cookie" i], [id*="consent" i], [class*="consent" i], form[role="search"], [role="search"]')) continue;
      if (type === "radio") {
        if (!el.name || seen.has(el.name)) continue; seen.add(el.name);
        const group = [...document.querySelectorAll('input[type="radio"][name="' + CSS.escape(el.name) + '"]')];
        if (!includeFilled && group.some((g) => g.checked)) continue;
        out.push({ id: idOf(el), label: groupLabel(el), type: "radio", name: el.name, options: group.map((g) => labelFor(g) || g.value), required: group.some((g) => g.required) });
        continue;
      }
      if (!includeFilled && !isEmpty(el)) continue;
      const label = labelFor(el);
      const role = (el.getAttribute("role") || "").toLowerCase();
      const combo = type === "text" && (role === "combobox" || /^(list|both)$/i.test(el.getAttribute("aria-autocomplete") || "") || !!el.getAttribute("list") || !!el.closest('[class*="select2" i], [class*="react-select" i], [class*="combobox" i], [class*="autocomplete" i], [class*="typeahead" i]'));
      out.push({ id: idOf(el), label, type, combo: combo || undefined, name: el.name || undefined, autocomplete: el.autocomplete || undefined,
        options: type === "select" ? [...el.options].map((o) => o.text.trim()) : undefined,
        required: el.required || el.getAttribute("aria-required") === "true" || /\*\s*$/.test(label) });
    }
    return out.slice(0, 150);
  }
  // anything a person would click: real buttons and links, tabs, and the clickable divs some portals use
  // ("Create account" as a <div onclick> or a tab). a generic clickable that wraps a real button is skipped.
  const CLICKABLE = 'button, input[type="submit"], input[type="button"], a, [role="button"], [role="tab"], [role="link"], [role="menuitem"], summary';
  function buttons() {
    const real = [...document.querySelectorAll(CLICKABLE)];
    const generic = [...document.querySelectorAll('[onclick], [tabindex="0"]')].filter((e) => !e.matches(CLICKABLE) && !e.querySelector(CLICKABLE) && textOf(e).length <= 60 && !e.closest(CLICKABLE));
    return [...real, ...generic].filter(visible)
      .map((b) => ({ id: idOf(b), label: ((b.tagName === "INPUT" ? b.value : textOf(b)) || b.getAttribute("aria-label") || b.getAttribute("title") || "").trim().slice(0, 80), link: b.tagName === "A", href: b.tagName === "A" ? b.href : undefined }))
      .filter((b) => b.label);
  }
  // after typing into a search-as-you-type box, the list of matches: click the one that fits the value
  function pickOption(value) {
    const norm = (t) => t.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const want = norm(value);
    const opts = [...document.querySelectorAll('[role="option"], [role="listbox"] li, .select2-results__option, .ui-menu-item, [class*="option" i][id*="option" i], datalist option')].filter(visible);
    if (!opts.length) return null;
    const scored = opts.map((o) => ({ o, t: norm(textOf(o)) })).filter((x) => x.t && !/^(no (results|matches|options)|loading|searching)/.test(x.t));
    const hit = scored.find((x) => x.t === want) || scored.find((x) => x.t.startsWith(want)) || scored.find((x) => x.t.includes(want)) || (scored.length === 1 ? scored[0] : null);
    if (!hit) return null;
    hit.o.scrollIntoView({ block: "nearest" });
    hit.o.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    hit.o.click();
    return textOf(hit.o).slice(0, 120);
  }
  // what sits at a point on screen, for checking a click chosen from a screenshot before making it
  function at(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const c = el.closest(CLICKABLE) || el;
    return { tag: c.tagName.toLowerCase(), label: ((c.tagName === "INPUT" ? c.value : textOf(c)) || c.getAttribute("aria-label") || "").slice(0, 80), href: c.tagName === "A" ? c.href : null };
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
      allFields: fields(true).map((f) => ({ id: f.id, label: f.label, type: f.type, name: f.name, autocomplete: f.autocomplete, required: f.required })),
      buttons: buttons(),
      errors: [...document.querySelectorAll('.error, .errors, [role="alert"], .invalid-feedback, .field-validation-error, .form_error, .validation-message, .has-error .help-block, .alert-danger, .errorMessage, .error-message')]
        .filter(visible).map((e) => textOf(e)).filter((t) => t && t.length < 200).slice(0, 5),
    };
  }
  window.__am = { snapshot, apply, fields, pickOption, at };
})();
`;
