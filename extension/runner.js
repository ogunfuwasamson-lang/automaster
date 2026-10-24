// automaster runner: the page filler. injected only into tabs the runner opened (or you attached).
// fills from your approved fill sheet, never touches passwords, id numbers or card fields,
// stops for bot checks and payments, and only presses submit when automaster says your signed packet allows it.
(async () => {
  if (window.__amRunnerActive) return;
  window.__amRunnerActive = true;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const call = (msg) =>
    new Promise((resolve, reject) =>
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!res) return resolve(null);
        res.ok ? resolve(res.value) : reject(new Error(res.error));
      }),
    );
  const report = (status, note, filled) => call({ type: "report", status, note, filled }).catch(() => {});

  // a small on-page banner so the applicant always sees what the runner is doing
  const banner = document.createElement("div");
  banner.setAttribute("data-am-banner", "");
  banner.style.cssText = "position:fixed;z-index:2147483647;bottom:16px;right:16px;max-width:360px;padding:10px 14px;border-radius:8px;background:#171717;color:#fff;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25)";
  const say = (t, warn) => {
    banner.textContent = "automaster runner: " + t;
    banner.style.background = warn ? "#b45309" : "#171717";
    if (!banner.isConnected) document.documentElement.appendChild(banner);
  };

  let ctx;
  try {
    ctx = await call({ type: "task" });
  } catch (e) {
    return say("can't reach automaster (" + e.message + ")", true);
  }
  if (!ctx) return; // not a runner tab
  if (ctx.stop) return say(ctx.stop + ". not touching this page.", true);
  if (ctx.steps > 40) {
    say("this portal has a lot of pages. please take it from here.", true);
    return report("needs_you", "too many pages for one run; take over from here");
  }

  await sleep(1500); // let single-page portals render

  const visible = (el) => {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.type === "hidden") return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") return false;
    const r = el.getBoundingClientRect();
    // radios/checkboxes are often visually hidden behind styled labels
    return r.width > 0 || r.height > 0 || el.type === "radio" || el.type === "checkbox" || el.type === "file";
  };
  const textOf = (el) => (el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : "");
  const bodyText = () => textOf(document.body).slice(0, 20000);

  // ---------------------------------------------------------------- page states the runner never handles
  const captcha = () =>
    !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], iframe[src*="challenges.cloudflare"], .g-recaptcha, .h-captcha, .cf-turnstile, [data-sitekey]');
  const payment = () =>
    !!document.querySelector('input[autocomplete^="cc-"], input[name*="card" i][name*="num" i], iframe[src*="stripe"], iframe[src*="braintree"], iframe[src*="paypal"], iframe[src*="flywire"], iframe[src*="cybersource"], iframe[src*="authorize.net"], iframe[name*="card" i]') ||
    /\b(card number|cardholder|cvv|cvc|security code)\b/i.test(bodyText()) && !!document.querySelector("input");
  const passwords = () => [...document.querySelectorAll('input[type="password"]')].filter(visible);
  const confirmation = () => /(application (has been |was )?(successfully )?submitted|thank you for (submitting|applying|your application)|submission (is )?complete|your application is complete|confirmation (number|code))/i.test(bodyText());

  async function waitUntil(test, minutes) {
    const end = Date.now() + minutes * 60_000;
    while (Date.now() < end) {
      await sleep(3000);
      if (test()) return true;
    }
    return false;
  }

  if (confirmation() && (ctx.submitClicked || ctx.reachedSubmit)) {
    say("submitted. recorded in automaster.");
    return report("submitted", "portal showed a confirmation");
  }

  if (captcha()) {
    say("there's a bot check on this page. please complete it; I'll continue after.", true);
    await report("needs_you", "bot check on the portal: complete it and the runner continues");
    if (await waitUntil(() => !captcha(), 15)) {
      window.__amRunnerActive = false;
      await report("running", "continuing after the bot check");
      return location.reload();
    }
    return;
  }

  if (payment()) {
    say("this is the payment page. pay the fee with your own card; I'll continue after.", true);
    await call({ type: "mark", flags: { reachedSubmit: true } }).catch(() => {});
    return report("needs_you", "payment page: pay the application fee yourself, then the runner confirms the submission");
  }

  const pw = passwords();
  if (pw.length === 1 && !/create|register|sign up/i.test(bodyText().slice(0, 3000))) {
    say("please sign in. your browser can fill your saved password. I'll continue after.", true);
    return report("needs_you", "sign in to the portal (your browser can fill your saved password)");
  }

  // ---------------------------------------------------------------- collect fields
  let seq = 0;
  const idOf = (el) => el.getAttribute("data-am-id") || (el.setAttribute("data-am-id", "f" + ++seq + "_" + Math.random().toString(36).slice(2, 6)), el.getAttribute("data-am-id"));

  function labelFor(el) {
    const parts = [];
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) parts.push(textOf(l));
    }
    const wrap = el.closest("label");
    if (wrap) parts.push(textOf(wrap));
    const by = el.getAttribute("aria-labelledby");
    if (by) parts.push(by.split(/\s+/).map((i) => textOf(document.getElementById(i))).join(" "));
    for (const a of ["aria-label", "placeholder", "title"]) if (el.getAttribute(a)) parts.push(el.getAttribute(a));
    if (!parts.join("").trim()) {
      // nearest text before the field inside its row/group
      const box = el.closest(".form-group, .field, .question, tr, li, fieldset, div");
      if (box) parts.push(textOf(box).slice(0, 160));
    }
    return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 300);
  }

  function groupLabel(radio) {
    const fs = radio.closest("fieldset");
    if (fs && fs.querySelector("legend")) return textOf(fs.querySelector("legend"));
    const group = radio.closest('[role="radiogroup"], .form-group, .question, tr, li, div');
    if (group) {
      const q = group.querySelector("legend, h3, h4, .label, label:not(:has(input))");
      if (q) return textOf(q);
      return textOf(group).slice(0, 160);
    }
    return radio.name || "";
  }

  const isEmpty = (el) => {
    if (el.tagName === "SELECT") return el.selectedIndex <= 0 || !el.value;
    if (el.type === "checkbox") return !el.checked;
    if (el.type === "file") return !el.files || !el.files.length;
    return !String(el.value || "").trim();
  };

  function collect() {
    const fields = [];
    const radiosSeen = new Set();
    const els = [...document.querySelectorAll("input, textarea, select")].filter((el) => !el.closest("[data-am-banner]"));
    for (const el of els) {
      const type = el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : (el.type || "text").toLowerCase();
      if (["hidden", "submit", "button", "reset", "image", "search", "password"].includes(type)) continue;
      if (!visible(el)) continue;
      if (type === "radio") {
        if (!el.name || radiosSeen.has(el.name)) continue;
        radiosSeen.add(el.name);
        const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)];
        if (group.some((g) => g.checked)) continue;
        fields.push({ id: idOf(el), label: groupLabel(el), type: "radio", name: el.name, options: group.map((g) => labelFor(g) || g.value), required: group.some((g) => g.required) });
        continue;
      }
      if (!isEmpty(el)) continue;
      fields.push({
        id: idOf(el),
        label: labelFor(el),
        type,
        name: el.name || undefined,
        options: type === "select" ? [...el.options].map((o) => o.text.trim()) : undefined,
        required: el.required || el.getAttribute("aria-required") === "true" || /\*\s*$/.test(labelFor(el)),
      });
    }
    return fields.slice(0, 150);
  }

  // ---------------------------------------------------------------- fill (works with react/angular forms)
  function setValue(el, v) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    el.focus();
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }

  async function apply(fill) {
    const el = document.querySelector(`[data-am-id="${fill.id}"]`);
    if (!el) return false;
    if (fill.action === "fill") {
      if (el.maxLength > 0 && fill.value.length > el.maxLength) return false; // never truncate an essay silently
      setValue(el, fill.value);
      return true;
    }
    if (fill.action === "choose") {
      if (el.tagName === "SELECT") {
        const opt = [...el.options].find((o) => o.text.trim() === fill.option);
        if (!opt) return false;
        el.value = opt.value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)];
      const hit = group.find((g) => (labelFor(g) || g.value) === fill.option);
      if (!hit) return false;
      hit.click();
      return true;
    }
    if (fill.action === "check") {
      if (!el.checked) el.click();
      return el.checked;
    }
    if (fill.action === "upload") {
      const f = await call({ type: "file", key: fill.file });
      const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], f.name, { type: f.mime }));
      el.files = dt.files;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- buttons
  const clickables = () => [...document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"], a.button, a.btn, [role="button"]')].filter(visible);
  const label = (b) => (b.tagName === "INPUT" ? b.value : textOf(b) || b.getAttribute("aria-label") || "").trim();
  const FINAL = /^(submit( (my|the|your))?( application)?|submit (and|&) pay|sign (and|&) submit|submit now|final submit)$/i;
  const NEXT = /^(save (and|&) (continue|next)|next( page| section| step)?|continue( to .{0,30})?|proceed|save (and|&) proceed|go to next)\b/i;
  const START = /^(start|begin|continue|resume) (my |an |your |new )?application$|^apply( now)?$|^create (an )?account$|^start$/i;
  const find = (re) => clickables().find((b) => re.test(label(b)));

  const fingerprint = () => [...document.querySelectorAll("h1, h2, h3, legend, label")].slice(0, 40).map(textOf).join("|").slice(0, 2000);

  // ---------------------------------------------------------------- run one page
  async function page() {
    const fields = collect();
    let filled = 0;
    const skipped = [];
    if (fields.length) {
      say(`filling ${fields.length} field${fields.length > 1 ? "s" : ""}…`);
      const { fills } = await call({ type: "map", fields });
      for (const f of fills) {
        if (f.action === "skip") {
          const fld = fields.find((x) => x.id === f.id);
          if (fld?.required) skipped.push(fld.label.slice(0, 50));
          continue;
        }
        try {
          if (await apply(f)) filled++;
        } catch {
          /* keep going; required fields left empty are reported below */
        }
        await sleep(80);
      }
    }

    const signup = passwords().length >= 2;
    if (signup) {
      say("I filled the sign-up form. please choose a password (let Chrome suggest a strong one) and create the account.", true);
      return report("needs_you", "create the portal account: choose a password (Chrome can suggest one). the runner continues after", filled);
    }

    // anything required still empty is the applicant's call
    const stillEmpty = collect().filter((f) => f.required).map((f) => f.label.slice(0, 50));
    if (stillEmpty.length) {
      say(`I filled ${filled}. these need you: ${stillEmpty.slice(0, 4).join("; ")}`, true);
      return report("needs_you", `fill ${stillEmpty.length} field${stillEmpty.length > 1 ? "s" : ""}: ${stillEmpty.slice(0, 3).join("; ")}`.slice(0, 290), filled);
    }

    const submitBtn = find(FINAL);
    if (submitBtn) {
      await call({ type: "mark", flags: { reachedSubmit: true } });
      const decision = await call({ type: "check" });
      if (!decision.allowed) {
        say(`ready to submit. ${decision.reason}. review the page and press submit yourself.`, true);
        return report("needs_you", `ready to submit: ${decision.reason}`, filled);
      }
      say("submitting your signed packet…");
      await call({ type: "mark", flags: { submitClicked: true } });
      await report("running", "pressing submit", filled);
      submitBtn.click();
      await sleep(6000);
      if (confirmation()) {
        say("submitted. recorded in automaster.");
        return report("submitted", "portal showed a confirmation");
      }
      if (payment()) {
        say("pay the fee with your own card to finish; I'll confirm after.", true);
        return report("needs_you", "payment page: pay the application fee yourself to finish");
      }
      return; // a navigation re-injects the runner, which checks for the confirmation
    }

    const next = find(NEXT) || (!fields.length ? find(START) : null);
    if (next) {
      const before = fingerprint();
      await report("running", `filled ${filled}, moving on`, filled);
      say(`filled ${filled}. next page…`);
      next.click();
      await sleep(4000);
      // single-page portals don't reload: run again in place if the page changed
      if (fingerprint() !== before) {
        window.__amRunnerActive = false;
        const again = await call({ type: "task" });
        if (again && !again.stop) {
          ctx = again;
          window.__amRunnerActive = true;
          return page();
        }
      } else {
        const stuck = collect().filter((f) => f.required).map((f) => f.label.slice(0, 40));
        say("the portal didn't move on. it may want something I can't fill.", true);
        return report("needs_you", stuck.length ? `portal wants: ${stuck.slice(0, 3).join("; ")}` : "the portal didn't accept the page; check for errors", filled);
      }
      return;
    }

    say(`filled ${filled}. I can't find the next step on this page; open the next section and I'll pick up.`, true);
    return report("needs_you", `filled ${filled}; open the next section of the portal and the runner picks up`, filled);
  }

  try {
    await page();
  } catch (e) {
    say("hit a problem: " + e.message, true);
    report("failed", String(e.message || e).slice(0, 280));
  } finally {
    window.__amRunnerActive = false;
  }
})();
