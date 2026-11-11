// Ivyward runner: built from extension/src by scripts/build-extension.mjs. don't edit by hand.
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/lib/labels.ts
  function stripMarkers(label) {
    return label.replace(/\(\s*(required|optional)\s*\)/gi, " ").replace(/\s[-–—]\s*(required|optional)\s*$/i, "").replace(/^\s*(required|optional)\s*[:*-]?\s+/i, "").replace(/\s+(required|optional)\s*\**\s*$/i, "").replace(/\s+/g, " ").trim();
  }
  var MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";
  function stripOptionRuns(label) {
    return label.replace(new RegExp(`\\b(month\\s+)?((${MONTHS})\\b[\\s,/]*){4,}(\\w{1,3}\\s*$)?`, "gi"), " ").replace(/\b(day|year)?\s*(\b\d{1,4}\b[\s,/]*){6,}/gi, " ").replace(/\b(month|day|year|select|choose)\b(\s+\b(month|day|year|select|choose)\b)*\s*$/i, " ").replace(/\s+/g, " ").trim();
  }
  function cleanLabel(label, options = []) {
    let l = stripOptionRuns(stripMarkers(label.replace(/\s+/g, " ")));
    const tails = [...options, "select", "select one", "choose", "choose one", "please select", "-- select --"].map((o) => o.trim().toLowerCase()).filter(Boolean).sort((a, b) => b.length - a.length);
    for (let guard = 0; guard < 60; guard++) {
      const low = l.toLowerCase();
      const t = tails.find((o) => low.endsWith(` ${o}`) && low.length > o.length + 3);
      if (!t) break;
      l = l.slice(0, l.length - t.length).trim();
    }
    return l.replace(/\s*[*:]+\s*$/, "").trim();
  }

  // src/lib/never-fill.ts
  var NEVER_FILL = /passport|national\s*id|\bnin\b|\bssn\b|social\s*security|tax\s*id|\bbvn\b|password|passcode|\bpin\b|security\s*(question|answer)|card\s*(number|holder)|\bcvv\b|\bcvc\b|expir|iban|account\s*number|routing|signature/i;

  // node_modules/zod/v4/core/util.js
  var util_exports = {};
  __export(util_exports, {
    BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
    CONSTANT_CATCH: () => CONSTANT_CATCH,
    Class: () => Class,
    NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
    aborted: () => aborted,
    allowsEval: () => allowsEval,
    assert: () => assert,
    assertEqual: () => assertEqual,
    assertIs: () => assertIs,
    assertNever: () => assertNever,
    assertNotEqual: () => assertNotEqual,
    assignProp: () => assignProp,
    attachSchema: () => attachSchema,
    base64ToUint8Array: () => base64ToUint8Array,
    base64urlToUint8Array: () => base64urlToUint8Array,
    cached: () => cached,
    captureStackTrace: () => captureStackTrace,
    cleanEnum: () => cleanEnum,
    cleanRegex: () => cleanRegex,
    clone: () => clone,
    cloneDef: () => cloneDef,
    codePointLength: () => codePointLength,
    constantCatch: () => constantCatch,
    createTransparentProxy: () => createTransparentProxy,
    defineLazy: () => defineLazy,
    defineLazyInternal: () => defineLazyInternal,
    derived: () => derived,
    esc: () => esc,
    escapeRegex: () => escapeRegex,
    explicitlyAborted: () => explicitlyAborted,
    extend: () => extend,
    finalizeIssue: () => finalizeIssue,
    floatSafeRemainder: () => floatSafeRemainder,
    getElementAtPath: () => getElementAtPath,
    getEnumValues: () => getEnumValues,
    getLengthableOrigin: () => getLengthableOrigin,
    getParsedType: () => getParsedType,
    getSizableOrigin: () => getSizableOrigin,
    hexToUint8Array: () => hexToUint8Array,
    hide: () => hide,
    installLazyProp: () => installLazyProp,
    isObject: () => isObject,
    isPlainObject: () => isPlainObject,
    issue: () => issue,
    joinValues: () => joinValues,
    jsonStringifyReplacer: () => jsonStringifyReplacer,
    members: () => members,
    merge: () => merge,
    mergeDefs: () => mergeDefs,
    normalizeParams: () => normalizeParams,
    nullish: () => nullish,
    numKeys: () => numKeys,
    objectClone: () => objectClone,
    omit: () => omit,
    optionalKeys: () => optionalKeys,
    own: () => own,
    parsedType: () => parsedType,
    partial: () => partial,
    pick: () => pick,
    prefixIssues: () => prefixIssues,
    primitiveTypes: () => primitiveTypes,
    promiseAllObject: () => promiseAllObject,
    propertyKeyTypes: () => propertyKeyTypes,
    randomString: () => randomString,
    rawShape: () => rawShape,
    required: () => required,
    safeExtend: () => safeExtend,
    shallowClone: () => shallowClone,
    sizeCaps: () => sizeCaps,
    slugify: () => slugify,
    stringifyPrimitive: () => stringifyPrimitive,
    toZod: () => toZod,
    uint8ArrayToBase64: () => uint8ArrayToBase64,
    uint8ArrayToBase64url: () => uint8ArrayToBase64url,
    uint8ArrayToHex: () => uint8ArrayToHex,
    unwrapMessage: () => unwrapMessage
  });
  function assertEqual(val) {
    return val;
  }
  function assertNotEqual(val) {
    return val;
  }
  function toZod() {
    return (schema) => schema;
  }
  function assertIs(_arg) {
  }
  function assertNever(_x) {
    throw new Error("Unexpected value in exhaustive check");
  }
  function assert(_) {
  }
  function getEnumValues(entries) {
    const numericValues = Object.values(entries).filter((v) => typeof v === "number");
    const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
    return values;
  }
  function joinValues(array2, separator = "|") {
    return array2.map((val) => stringifyPrimitive(val)).join(separator);
  }
  function jsonStringifyReplacer(_, value) {
    if (typeof value === "bigint")
      return value.toString();
    return value;
  }
  var Cached = class {
    constructor(getter) {
      this._getter = getter;
      this._value = void 0;
    }
    get value() {
      const getter = this._getter;
      if (getter !== void 0) {
        this._value = getter();
        this._getter = void 0;
      }
      return this._value;
    }
  };
  function cached(getter) {
    return new Cached(getter);
  }
  function nullish(input) {
    return input === null || input === void 0;
  }
  function cleanRegex(source) {
    const start = source.startsWith("^") ? 1 : 0;
    const end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
  }
  function floatSafeRemainder(val, step) {
    const ratio = val / step;
    const roundedRatio = Math.round(ratio);
    const tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
    if (Math.abs(ratio - roundedRatio) < tolerance)
      return 0;
    return ratio - roundedRatio;
  }
  var EVALUATING = /* @__PURE__ */ Symbol("evaluating");
  function defineLazy(object2, key, getter) {
    let value = void 0;
    Object.defineProperty(object2, key, {
      get() {
        if (value === EVALUATING) {
          return void 0;
        }
        if (value === void 0) {
          value = EVALUATING;
          value = getter();
        }
        return value;
      },
      set(v) {
        Object.defineProperty(object2, key, {
          value: v
          // configurable: true,
        });
      },
      configurable: true
    });
  }
  function objectClone(obj) {
    return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
  }
  function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  function rawShape(def) {
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    return desc?.get ? desc.get.raw : desc?.value;
  }
  function sourceShape(schema) {
    return rawShape(schema._zod.def) ?? schema._zod.def.shape;
  }
  function deferProp(target, key, getter) {
    Object.defineProperty(target, key, {
      get() {
        const value = getter();
        assignProp(this, key, value);
        return value;
      },
      enumerable: true,
      configurable: true
    });
  }
  function putProp(target, key, value) {
    if (key in target)
      assignProp(target, key, value);
    else
      target[key] = value;
  }
  function mirrorShape(target, source, keys, wrap) {
    const raw = sourceShape(source);
    for (const key of keys) {
      const desc = Object.getOwnPropertyDescriptor(raw, key);
      if (!desc.enumerable)
        continue;
      if (desc.get) {
        deferProp(target, key, () => {
          const value = source._zod.def.shape[key];
          return wrap ? wrap(value, key) : value;
        });
      } else
        putProp(target, key, wrap ? wrap(desc.value, key) : desc.value);
    }
  }
  function mirrorProps(target, source) {
    for (const key of Reflect.ownKeys(source)) {
      const desc = Object.getOwnPropertyDescriptor(source, key);
      if (!desc.enumerable)
        continue;
      if (desc.get)
        deferProp(target, key, () => source[key]);
      else
        putProp(target, key, desc.value);
    }
  }
  function mergeDefs(...defs) {
    const mergedDescriptors = {};
    for (const def of defs) {
      const descriptors = Object.getOwnPropertyDescriptors(def);
      Object.assign(mergedDescriptors, descriptors);
    }
    return Object.defineProperties({}, mergedDescriptors);
  }
  function cloneDef(schema) {
    return mergeDefs(schema._zod.def);
  }
  function getElementAtPath(obj, path) {
    if (!path)
      return obj;
    return path.reduce((acc, key) => acc?.[key], obj);
  }
  function promiseAllObject(promisesObj) {
    const keys = Object.keys(promisesObj);
    const promises = keys.map((key) => promisesObj[key]);
    return Promise.all(promises).then((results) => {
      const resolvedObj = {};
      for (let i = 0; i < keys.length; i++) {
        resolvedObj[keys[i]] = results[i];
      }
      return resolvedObj;
    });
  }
  function randomString(length = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let str = "";
    for (let i = 0; i < length; i++) {
      str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
  }
  function esc(str) {
    return JSON.stringify(str);
  }
  function slugify(input) {
    return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  }
  var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
  };
  function isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
  }
  var allowsEval = /* @__PURE__ */ cached(() => {
    if (globalConfig.jitless) {
      return false;
    }
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
      return false;
    }
    try {
      const F = Function;
      new F("");
      return true;
    } catch (_) {
      return false;
    }
  });
  function isPlainObject(o) {
    if (isObject(o) === false)
      return false;
    const ctor = o.constructor;
    if (ctor === void 0)
      return true;
    if (typeof ctor !== "function")
      return true;
    const prot = ctor.prototype;
    if (isObject(prot) === false)
      return false;
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
      return false;
    }
    return true;
  }
  function shallowClone(o) {
    if (isPlainObject(o))
      return { ...o };
    if (Array.isArray(o))
      return [...o];
    if (o instanceof Map)
      return new Map(o);
    if (o instanceof Set)
      return new Set(o);
    return o;
  }
  function numKeys(data) {
    let keyCount = 0;
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        keyCount++;
      }
    }
    return keyCount;
  }
  var getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "undefined":
        return "undefined";
      case "string":
        return "string";
      case "number":
        return Number.isNaN(data) ? "nan" : "number";
      case "boolean":
        return "boolean";
      case "function":
        return "function";
      case "bigint":
        return "bigint";
      case "symbol":
        return "symbol";
      case "object":
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
          return "promise";
        }
        if (typeof Map !== "undefined" && data instanceof Map) {
          return "map";
        }
        if (typeof Set !== "undefined" && data instanceof Set) {
          return "set";
        }
        if (typeof Date !== "undefined" && data instanceof Date) {
          return "date";
        }
        if (typeof File !== "undefined" && data instanceof File) {
          return "file";
        }
        return "object";
      default:
        throw new Error(`Unknown data type: ${t}`);
    }
  };
  var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  var primitiveTypes = /* @__PURE__ */ new Set([
    "string",
    "number",
    "bigint",
    "boolean",
    "symbol",
    "undefined"
  ]);
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function clone(inst, def, params) {
    const cl = new inst._zod.constr(def ?? inst._zod.def);
    if (!def || params?.parent)
      cl._zod.parent = inst;
    return cl;
  }
  function normalizeParams(_params) {
    const params = _params;
    if (!params)
      return {};
    if (typeof params === "string")
      return { error: () => params };
    if (params?.message !== void 0) {
      if (params?.error !== void 0)
        throw new Error("Cannot specify both `message` and `error` params");
      params.error = params.message;
    }
    delete params.message;
    if (typeof params.error === "string")
      return { ...params, error: () => params.error };
    return params;
  }
  function createTransparentProxy(getter) {
    let target;
    return new Proxy({}, {
      get(_, prop, receiver) {
        target ?? (target = getter());
        return Reflect.get(target, prop, receiver);
      },
      set(_, prop, value, receiver) {
        target ?? (target = getter());
        return Reflect.set(target, prop, value, receiver);
      },
      has(_, prop) {
        target ?? (target = getter());
        return Reflect.has(target, prop);
      },
      deleteProperty(_, prop) {
        target ?? (target = getter());
        return Reflect.deleteProperty(target, prop);
      },
      ownKeys(_) {
        target ?? (target = getter());
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(_, prop) {
        target ?? (target = getter());
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
      defineProperty(_, prop, descriptor) {
        target ?? (target = getter());
        return Reflect.defineProperty(target, prop, descriptor);
      }
    });
  }
  function stringifyPrimitive(value) {
    if (typeof value === "bigint")
      return value.toString() + "n";
    if (typeof value === "string")
      return `"${value}"`;
    return `${value}`;
  }
  function optionalKeys(shape) {
    return Object.keys(shape).filter((k) => {
      return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
    });
  }
  var NUMBER_FORMAT_RANGES = /* @__PURE__ */ (() => ({
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-34028234663852886e22, 34028234663852886e22],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  }))();
  var BIGINT_FORMAT_RANGES = {
    int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
    uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
  };
  function pick(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error(".pick() cannot be used on object schemas containing refinements");
    }
    const newShape = {};
    mirrorShape(newShape, schema, maskedKeys(schema, mask));
    return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
  }
  function maskedKeys(schema, mask) {
    const raw = sourceShape(schema);
    const keys = [];
    for (const key of Reflect.ownKeys(mask)) {
      if (!Object.getOwnPropertyDescriptor(raw, key)?.enumerable) {
        throw new Error(`Unrecognized key: "${String(key)}"`);
      }
      if (mask[key])
        keys.push(key);
    }
    return keys;
  }
  function omit(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error(".omit() cannot be used on object schemas containing refinements");
    }
    const omitted = new Set(maskedKeys(schema, mask));
    const newShape = {};
    mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)).filter((key) => !omitted.has(key)));
    return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
  }
  function extend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to extend: expected a plain object");
    }
    const checks = schema._zod.def.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      const existingShape = sourceShape(schema);
      for (const key of Reflect.ownKeys(shape)) {
        if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
          throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
        }
      }
    }
    return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
  }
  function extended(schema, shape) {
    const newShape = {};
    mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)));
    mirrorProps(newShape, shape);
    return newShape;
  }
  function safeExtend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to safeExtend: expected a plain object");
    }
    return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
  }
  function merge(a, b) {
    if (!b?._zod?.def) {
      throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
    }
    if (a._zod.def.checks?.length) {
      throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
    }
    const newShape = {};
    mirrorShape(newShape, a, Reflect.ownKeys(sourceShape(a)));
    mirrorShape(newShape, b, Reflect.ownKeys(sourceShape(b)));
    const def = mergeDefs(a._zod.def, {
      shape: newShape,
      get catchall() {
        return b._zod.def.catchall;
      },
      checks: b._zod.def.checks ?? []
    });
    return clone(a, def);
  }
  function partial(Class2, schema, mask, name = "partial") {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error(`.${name}() cannot be used on object schemas containing refinements`);
    }
    const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
    const newShape = {};
    mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), Class2 && ((value, key) => selected && !selected.has(key) ? value : new Class2({ type: "optional", innerType: value })));
    return clone(schema, mergeDefs(schema._zod.def, { shape: newShape, checks: [] }));
  }
  function required(Class2, schema, mask) {
    const selected = mask ? new Set(maskedKeys(schema, mask)) : void 0;
    const newShape = {};
    mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), (value, key) => (
      // overwrite with non-optional
      selected && !selected.has(key) ? value : new Class2({ type: "nonoptional", innerType: value })
    ));
    return clone(schema, mergeDefs(schema._zod.def, { shape: newShape }));
  }
  function aborted(x, startIndex = 0) {
    if (x.aborted === true)
      return true;
    for (let i = startIndex; i < x.issues.length; i++) {
      if (x.issues[i]?.continue !== true) {
        return true;
      }
    }
    return false;
  }
  function explicitlyAborted(x, startIndex = 0) {
    if (x.aborted === true)
      return true;
    for (let i = startIndex; i < x.issues.length; i++) {
      if (x.issues[i]?.continue === false) {
        return true;
      }
    }
    return false;
  }
  function prefixIssues(path, issues) {
    return issues.map((iss) => {
      var _a3;
      (_a3 = iss).path ?? (_a3.path = []);
      iss.path.unshift(path);
      return iss;
    });
  }
  function unwrapMessage(message) {
    return typeof message === "string" ? message : message?.message;
  }
  function sizeCaps(defChecks) {
    const caps = [];
    for (const ch of defChecks ?? []) {
      const d = ch._zod.def;
      if (!/_(length|size)$|_equals$/.test(d.check))
        break;
      const max = d.maximum ?? d.length ?? d.size;
      if (max >= 0)
        caps.push([max, ch]);
    }
    return caps;
  }
  function attachSchema(issues, start, inst) {
    var _a3;
    for (let i = start; i < issues.length; i++) {
      (_a3 = issues[i]).schema ?? (_a3.schema = inst);
    }
  }
  function finalizeIssue(iss, ctx, config2) {
    var _a3;
    const traits = iss.inst?._zod?.traits;
    if (traits?.has("$ZodType")) {
      if (traits.has("$ZodCheck"))
        (_a3 = iss).schema ?? (_a3.schema = iss.inst);
      else
        iss.schema = iss.inst;
    }
    const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
    const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
    const full = {};
    for (const k of Object.keys(iss)) {
      if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__")
        continue;
      full[k] = iss[k];
    }
    full.path ?? (full.path = []);
    full.message = message;
    if (ctx?.reportInput) {
      full.input = iss.input;
    }
    return full;
  }
  function getSizableOrigin(input) {
    if (input instanceof Set)
      return "set";
    if (input instanceof Map)
      return "map";
    if (input instanceof File)
      return "file";
    return "unknown";
  }
  var highSurrogate = /[\uD800-\uDBFF]/;
  function codePointLength(str) {
    const units = str.length;
    if (!highSurrogate.test(str))
      return units;
    let count = units;
    for (let i = 0; i < units - 1; i++) {
      if ((str.charCodeAt(i) & 64512) === 55296 && (str.charCodeAt(i + 1) & 64512) === 56320) {
        count--;
        i++;
      }
    }
    return count;
  }
  function getLengthableOrigin(input) {
    if (Array.isArray(input))
      return "array";
    if (typeof input === "string")
      return "string";
    return "unknown";
  }
  function parsedType(data) {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "nan" : "number";
      }
      case "object": {
        if (data === null) {
          return "null";
        }
        if (Array.isArray(data)) {
          return "array";
        }
        const obj = data;
        if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
          return obj.constructor.name;
        }
      }
    }
    return t;
  }
  function issue(...args) {
    const [iss, input, inst] = args;
    if (typeof iss === "string") {
      return {
        message: iss,
        code: "custom",
        input,
        inst
      };
    }
    return { ...iss };
  }
  function cleanEnum(obj) {
    return Object.entries(obj).filter(([k, _]) => {
      return Number.isNaN(Number.parseInt(k, 10));
    }).map((el) => el[1]);
  }
  function base64ToUint8Array(base642) {
    const binaryString = atob(base642);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  function uint8ArrayToBase64(bytes) {
    let binaryString = "";
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
  }
  function base64urlToUint8Array(base64url2) {
    const base642 = base64url2.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - base642.length % 4) % 4);
    return base64ToUint8Array(base642 + padding);
  }
  function uint8ArrayToBase64url(bytes) {
    return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  function hexToUint8Array(hex) {
    const cleanHex = hex.replace(/^0x/, "");
    if (cleanHex.length % 2 !== 0) {
      throw new Error("Invalid hex string length");
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
    }
    return bytes;
  }
  function uint8ArrayToHex(bytes) {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  var Class = class {
    constructor(..._args) {
    }
  };
  function members(proto, table) {
    for (const key in table) {
      const desc = Object.getOwnPropertyDescriptor(table, key);
      if (desc.get)
        Object.defineProperty(proto, key, { ...desc, enumerable: false });
      else
        defineBound(proto, key, desc.value);
    }
  }
  function own(inst, key, value, enumerable = true) {
    Object.defineProperty(inst, key, { configurable: true, writable: true, enumerable, value });
    return value;
  }
  function hide(inst, key, value) {
    return own(inst, key, value, false);
  }
  // @__NO_SIDE_EFFECTS__
  function derived(computes, table) {
    for (const key in computes) {
      const compute = computes[key];
      Object.defineProperty(table, key, {
        configurable: true,
        enumerable: true,
        get() {
          return own(this, key, compute(this));
        },
        set(value) {
          own(this, key, value);
        }
      });
    }
    return table;
  }
  function defineBound(proto, key, fn) {
    Object.defineProperty(proto, key, {
      configurable: true,
      get() {
        return this == null ? fn : own(this, key, fn.bind(this));
      },
      set(value) {
        own(this, key, value);
      }
    });
  }
  function claim(inst, sentinel) {
    const proto = Object.getPrototypeOf(inst);
    return sentinel in proto ? void 0 : proto;
  }
  var installing;
  var broke = false;
  var breaker = {
    configurable: true,
    get() {
      broke = true;
      return void 0;
    }
  };
  function defineLazyInternal(inst, key, compute) {
    const proto = Object.getPrototypeOf(inst._zod);
    if (key in proto && installing !== inst._zod) {
      installing = void 0;
      return;
    }
    installing = inst._zod;
    Object.defineProperty(proto, key, {
      configurable: true,
      get() {
        Object.defineProperty(this, key, breaker);
        const outer = broke;
        broke = false;
        try {
          const value = compute(this);
          if (broke)
            delete this[key];
          else
            Object.defineProperty(this, key, { configurable: true, writable: true, value });
          broke = broke || outer;
          return value;
        } catch (err) {
          delete this[key];
          broke = broke || outer;
          throw err;
        }
      },
      set(value) {
        Object.defineProperty(this, key, { configurable: true, writable: true, value });
      }
    });
  }
  function installLazyProp(inst, key, make, enumerable) {
    const proto = claim(inst, key);
    if (!proto)
      return;
    Object.defineProperty(proto, key, {
      configurable: true,
      get() {
        const desc = { configurable: true, writable: true, enumerable, value: void 0 };
        Object.defineProperty(this, key, desc);
        desc.value = make(this);
        Object.defineProperty(this, key, desc);
        return desc.value;
      },
      set(value) {
        Object.defineProperty(this, key, { configurable: true, writable: true, enumerable, value });
      }
    });
  }
  var CONSTANT_CATCH = "~constantCatch";
  function constantCatch(value) {
    const fn = () => value;
    fn[CONSTANT_CATCH] = true;
    return fn;
  }

  // node_modules/zod/v4/core/core.js
  var _a;
  var _zodDesc = { value: void 0, enumerable: false };
  var _E = "captureStackTrace" in Error ? Error : null;
  function newError(Definition) {
    const E = _E;
    if (E) {
      const saved = E.stackTraceLimit;
      if (typeof saved === "number") {
        try {
          E.stackTraceLimit = 0;
        } catch {
          _E = null;
          return new Definition();
        }
        try {
          return new Definition();
        } finally {
          E.stackTraceLimit = saved;
        }
      }
    }
    return new Definition();
  }
  // @__NO_SIDE_EFFECTS__
  function $constructor(name, initializer3, proto, params) {
    const zodProto = {};
    function Internals(def) {
      this.def = def;
      this.constr = _;
      this.traits = /* @__PURE__ */ new Set();
    }
    Internals.prototype = zodProto;
    const protoMembers = proto;
    const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
    function init(inst, def) {
      if (!inst._zod) {
        _zodDesc.value = new Internals(def);
        try {
          Object.defineProperty(inst, "_zod", _zodDesc);
        } finally {
          _zodDesc.value = void 0;
        }
      } else if (inst._zod.traits.has(name)) {
        return;
      }
      inst._zod.traits.add(name);
      initializer3(inst, def);
      if (initialized) {
        const own2 = Object.getPrototypeOf(inst);
        const ctorProto = inst._zod.constr.prototype;
        let up = own2;
        while (up && up !== ctorProto)
          up = Object.getPrototypeOf(up);
        const target = up ?? own2;
        if (!initialized.has(target)) {
          initialized.add(target);
          members(target, protoMembers);
        }
      }
      const proto2 = _.prototype;
      for (const k in proto2) {
        if (!Object.prototype.hasOwnProperty.call(proto2, k))
          continue;
        if (!(k in inst)) {
          inst[k] = proto2[k].bind(inst);
        }
      }
    }
    const Parent = params?.Parent ?? Object;
    class Definition extends Parent {
    }
    Object.defineProperty(Definition, "name", { value: name });
    function _(def) {
      const inst = params?.Parent ? newError(Definition) : this;
      init(inst, def);
      const deferred = inst._zod.deferred;
      if (deferred) {
        for (const fn of deferred) {
          fn();
        }
        inst._zod.deferred = void 0;
      }
      const pp = globalThis.__zod_globalConfig?.postProcessor;
      if (pp)
        pp(inst);
      return inst;
    }
    Object.defineProperty(_, "init", { value: init });
    Object.defineProperty(_, Symbol.hasInstance, {
      value: (inst) => {
        if (params?.Parent && inst instanceof params.Parent)
          return true;
        return inst?._zod?.traits?.has(name);
      }
    });
    Object.defineProperty(_, "name", { value: name });
    return _;
  }
  var $ZodAsyncError = class extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  };
  var $ZodEncodeError = class extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  };
  (_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
  var globalConfig = globalThis.__zod_globalConfig;
  function config(newConfig) {
    if (newConfig)
      Object.assign(globalConfig, newConfig);
    return globalConfig;
  }

  // node_modules/zod/v4/core/errors.js
  function _getMessage() {
    const internals = this._zod;
    internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
    return internals.message;
  }
  function _setMessage(value) {
    this._zod.message = value;
  }
  var _messageDesc = {
    get: _getMessage,
    set: _setMessage,
    enumerable: true,
    configurable: true
  };
  var _issuesDesc = { value: void 0, enumerable: false };
  var _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
  var initializer = (inst, def) => {
    inst.name = "$ZodError";
    _issuesDesc.value = def;
    Object.defineProperty(inst, "issues", _issuesDesc);
    _issuesDesc.value = void 0;
    Object.defineProperty(inst, "message", _messageDesc);
    const proto = Object.getPrototypeOf(inst);
    if (!_installedToString.has(proto)) {
      _installedToString.add(proto);
      Object.defineProperty(proto, "toString", {
        configurable: true,
        enumerable: false,
        get() {
          const value = () => this.message;
          Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
          return value;
        },
        set(value) {
          Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
        }
      });
    }
  };
  var $ZodError = $constructor("$ZodError", initializer);
  var $ZodRealError = $constructor("$ZodError", initializer, void 0, {
    Parent: Error
  });
  function node(obj, key, make) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key === "__proto__") {
        Object.defineProperty(obj, key, { value: make(), writable: true, enumerable: true, configurable: true });
      } else {
        obj[key] = make();
      }
    }
    return obj[key];
  }
  function flattenError(error2, mapper = (issue2) => issue2.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of error2.issues) {
      if (sub.path.length > 0) {
        node(fieldErrors, sub.path[0], () => []).push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  function formatError(error2, mapper = (issue2) => issue2.message) {
    const fieldErrors = { _errors: [] };
    const processError = (error3, path = []) => {
      for (const issue2 of error3.issues) {
        if (issue2.code === "invalid_union" && issue2.errors.length) {
          issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
        } else if (issue2.code === "invalid_key") {
          processError({ issues: issue2.issues }, [...path, ...issue2.path]);
        } else if (issue2.code === "invalid_element") {
          processError({ issues: issue2.issues }, [...path, ...issue2.path]);
        } else {
          const fullpath = [...path, ...issue2.path];
          if (fullpath.length === 0) {
            fieldErrors._errors.push(mapper(issue2));
          } else {
            let curr = fieldErrors;
            let i = 0;
            while (i < fullpath.length) {
              const el = fullpath[i];
              const terminal = i === fullpath.length - 1;
              if (el === "_errors") {
                if (terminal)
                  curr._errors.push(mapper(issue2));
                i++;
                continue;
              }
              if (!Object.prototype.hasOwnProperty.call(curr, el)) {
                Object.defineProperty(curr, el, {
                  value: { _errors: [] },
                  enumerable: true,
                  writable: true,
                  configurable: true
                });
              }
              const node2 = curr[el];
              if (terminal) {
                node2._errors.push(mapper(issue2));
              }
              curr = node2;
              i++;
            }
          }
        }
      }
    };
    processError(error2);
    return fieldErrors;
  }

  // node_modules/zod/v4/core/parse.js
  function finalizeParams(callee, params) {
    return { callee: params?.callee ?? callee, Err: params?.Err };
  }
  var _parse = (_Err) => {
    const fn = (schema, value, _ctx, _params) => {
      const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
      const result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise) {
        throw new $ZodAsyncError();
      }
      if (result.issues.length) {
        const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
        captureStackTrace(e, _params?.callee ?? fn);
        throw e;
      }
      return result.value;
    };
    return fn;
  };
  var _parseAsync = (_Err) => {
    const fn = async (schema, value, _ctx, params) => {
      const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
      let result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise)
        result = await result;
      if (result.issues.length) {
        const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
        captureStackTrace(e, params?.callee ?? fn);
        throw e;
      }
      return result.value;
    };
    return fn;
  };
  var _safeParse = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
  };
  function failure(Err, issues, ctx) {
    let error2;
    return {
      success: false,
      get error() {
        if (!error2) {
          error2 = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
          issues = void 0;
          ctx = void 0;
        }
        return error2;
      },
      set error(e) {
        error2 = e;
        issues = void 0;
        ctx = void 0;
      }
    };
  }
  var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
  };
  var COMPILE_INVALID = /* @__PURE__ */ Symbol.for("zod.compile.invalid");
  var COMPILE_FALLBACK = /* @__PURE__ */ Symbol.for("zod.compile.fallback");
  var validate = ((schema, value, _ctx) => {
    const validator = schema._zod.bag.validator;
    if (validator !== void 0) {
      if (validator(value) !== COMPILE_INVALID)
        return true;
      if (validator.definite === true && _ctx === void 0)
        return false;
    }
    return validateFallback(schema, value, _ctx);
  });
  function validateFallback(schema, value, _ctx) {
    const ctx = _ctx ? { ..._ctx, async: false, abortEarly: true } : { async: false, abortEarly: true };
    const fallbackRun = schema._zod.bag.fallbackRun;
    let result;
    if (fallbackRun) {
      ctx[COMPILE_FALLBACK] = true;
      result = fallbackRun({ value, issues: [] }, ctx);
    } else {
      result = schema._zod.run({ value, issues: [] }, ctx);
    }
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    return result.issues.length === 0;
  }
  var validateAsync = async (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: true, abortEarly: true } : { async: true, abortEarly: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    return result.issues.length === 0;
  };
  var _encode = (_Err) => {
    const parse2 = _parse(_Err);
    const fn = (schema, value, _ctx, _params) => {
      const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
      return parse2(schema, value, ctx, finalizeParams(fn, _params));
    };
    return fn;
  };
  var _decode = (_Err) => {
    const parse2 = _parse(_Err);
    const fn = (schema, value, _ctx, _params) => {
      return parse2(schema, value, _ctx, finalizeParams(fn, _params));
    };
    return fn;
  };
  var _encodeAsync = (_Err) => {
    const parseAsync2 = _parseAsync(_Err);
    const fn = async (schema, value, _ctx, _params) => {
      const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
      return await parseAsync2(schema, value, ctx, finalizeParams(fn, _params));
    };
    return fn;
  };
  var _decodeAsync = (_Err) => {
    const parseAsync2 = _parseAsync(_Err);
    const fn = async (schema, value, _ctx, _params) => {
      return await parseAsync2(schema, value, _ctx, finalizeParams(fn, _params));
    };
    return fn;
  };
  var _safeEncode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return _safeParse(_Err)(schema, value, ctx);
  };
  var _safeDecode = (_Err) => (schema, value, _ctx) => {
    return _safeParse(_Err)(schema, value, _ctx);
  };
  var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return _safeParseAsync(_Err)(schema, value, ctx);
  };
  var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _safeParseAsync(_Err)(schema, value, _ctx);
  };

  // node_modules/zod/v4/core/regexes.js
  var cuid = /^[cC][0-9a-z]{6,}$/;
  var cuid2 = /^[0-9a-z]+$/;
  var ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
  var xid = /^[0-9a-vA-V]{20}$/;
  var ksuid = /^[A-Za-z0-9]{27}$/;
  var nanoid = /^[a-zA-Z0-9_-]{21}$/;
  function nanoidOfLength(length) {
    return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
  }
  var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  var uuid = (version2) => {
    if (!version2)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
  };
  var email = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  var _emoji = `^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$`;
  function emoji() {
    return new RegExp(_emoji, "u");
  }
  var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  var base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
  var httpProtocol = /^https?$/;
  var e164 = /^\+[1-9]\d{6,14}$/;
  var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
  function anchor(source) {
    return new RegExp(`^${source}$`);
  }
  var date = /* @__PURE__ */ anchor(dateSource);
  function timeSource(args) {
    const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
    const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : args.seconds ? `${hhmm}:[0-5]\\d(?:\\.\\d+)?` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
    return regex;
  }
  function time(args) {
    return new RegExp(`^${timeSource(args)}$`);
  }
  function datetime(args) {
    const opts = ["Z"];
    if (args.offset)
      opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
    const qualified = `${timeSource({ precision: args.precision, seconds: true })}(?:${opts.join("|")})`;
    const timeRegex = args.local ? `${qualified}|${timeSource({ precision: args.precision })}` : qualified;
    return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
  }
  var anyString = /^[\s\S]{0,}$/;
  var number = /^-?\d+(?:\.\d+)?$/;
  var boolean = /^(?:true|false)$/i;
  var lowercase = /^[^A-Z]*$/;
  var uppercase = /^[^a-z]*$/;

  // node_modules/zod/v4/core/checks.js
  var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a3;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a3 = inst._zod).onattach ?? (_a3.onattach = []);
  });
  var _whenHasLength = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  };
  var numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin: numericOriginMap[typeof payload.value] ?? origin,
        code: "too_big",
        maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin: numericOriginMap[typeof payload.value] ?? origin,
        code: "too_small",
        minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? (
        // `value % 0n` throws, and nothing is a multiple of zero — the number branch already fails this way via NaN
        def.value !== BigInt(0) && payload.value % def.value === BigInt(0)
      ) : floatSafeRemainder(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            continue: false,
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              inclusive: true,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a3;
    $ZodCheck.init(inst, def);
    (_a3 = inst._zod.def).when ?? (_a3.when = _whenHasLength);
    inst._zod.check = (payload) => {
      const input = payload.value;
      const units = input.length;
      const length = typeof input === "string" && units > def.maximum ? codePointLength(input) : units;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a3;
    $ZodCheck.init(inst, def);
    (_a3 = inst._zod.def).when ?? (_a3.when = _whenHasLength);
    inst._zod.check = (payload) => {
      const input = payload.value;
      const units = input.length;
      const length = typeof input === "string" && units >= def.minimum && units < def.minimum * 2 ? codePointLength(input) : units;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a3;
    $ZodCheck.init(inst, def);
    (_a3 = inst._zod.def).when ?? (_a3.when = _whenHasLength);
    inst._zod.check = (payload) => {
      const input = payload.value;
      const units = input.length;
      const length = typeof input === "string" && units >= def.length && units <= def.length * 2 ? codePointLength(input) : units;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push({
        origin,
        ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a3, _b;
    $ZodCheck.init(inst, def);
    if (def.pattern)
      (_a3 = inst._zod).check ?? (_a3.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...def.pattern ? { pattern: def.pattern.toString() } : {},
          inst,
          continue: !def.abort
        });
      });
    else
      (_b = inst._zod).check ?? (_b.check = () => {
      });
  });
  var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position},}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });

  // node_modules/zod/v4/core/doc.js
  var Doc = class {
    constructor(args = [], closed = {}) {
      this.content = [];
      this.indent = 0;
      this.args = args;
      this.closed = closed;
    }
    // the compiler catches a child's throw and keeps writing into this doc, so the indent has to unwind with it
    indented(fn) {
      this.indent += 1;
      try {
        fn(this);
      } finally {
        this.indent -= 1;
      }
    }
    write(arg) {
      if (typeof arg === "function") {
        arg(this, { execution: "sync" });
        arg(this, { execution: "async" });
        return;
      }
      const content = arg;
      const lines = content.split("\n").filter((x) => x);
      const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
      const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
      for (const line of dedented) {
        this.content.push(line);
      }
    }
    compile() {
      const F = Function;
      const content = this?.content ?? [``];
      const factory = new F(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {
${content.join("\n")}
};`);
      return factory(...Object.values(this.closed));
    }
  };

  // node_modules/zod/v4/core/versions.js
  var version = {
    major: 4,
    minor: 6,
    patch: 7
  };

  // node_modules/zod/v4/core/schemas.js
  var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a3;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
    const defChecks = inst._zod.def.checks;
    const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
    for (const ch of checks) {
      for (const fn of ch._zod.onattach) {
        fn(inst);
      }
    }
    if (checks.length === 0) {
      (_a3 = inst._zod).deferred ?? (_a3.deferred = []);
      inst._zod.deferred?.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks2, ctx) => {
        if (payload.memo)
          return payload;
        let isAborted = aborted(payload);
        let asyncResult;
        for (const ch of checks2) {
          if (ch._zod.def.when) {
            if (explicitlyAborted(payload))
              continue;
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted) {
            continue;
          }
          const currLen = payload.issues.length;
          const _ = ch._zod.check(payload);
          if (_ instanceof Promise && ctx?.async === false) {
            throw new $ZodAsyncError();
          }
          if (asyncResult || _ instanceof Promise) {
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              attachSchema(payload.issues, currLen, inst);
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            attachSchema(payload.issues, currLen, inst);
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      const handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        const checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
        }
        return inst._zod.parse(checkResult, ctx);
      };
      inst._zod.run = (payload, ctx) => {
        if (ctx.skipChecks) {
          return inst._zod.parse(payload, ctx);
        }
        if (ctx.direction === "backward") {
          const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
          if (canary instanceof Promise) {
            return canary.then((canary2) => {
              return handleCanaryResult(canary2, payload, ctx);
            });
          }
          return handleCanaryResult(canary, payload, ctx);
        }
        const result = inst._zod.parse(payload, ctx);
        if (result instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return result.then((result2) => runChecks(result2, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
  }, {
    // Wrappers extend this by installing a richer factory over it; reading it eagerly would defeat the laziness.
    get "~standard"() {
      return hide(this, "~standard", standardProps(this));
    },
    set "~standard"(value) {
      own(this, "~standard", value);
    }
  });
  var toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value };
  async function validateAsync2(inst, value) {
    const ctx = { async: true };
    return toStandardResult(await inst._zod.run({ value, issues: [] }, ctx), ctx);
  }
  function standardProps(inst) {
    return {
      validate: (value) => {
        const ctx = { async: false };
        try {
          const r = inst._zod.run({ value, issues: [] }, ctx);
          if (!(r instanceof Promise))
            return toStandardResult(r, ctx);
        } catch (_) {
        }
        return validateAsync2(inst, value);
      },
      vendor: "zod",
      version: 1
    };
  }
  var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = def.pattern ?? anyString;
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_2) {
        }
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v = versionMap[def.version];
      if (v === void 0)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = uuid(v));
    } else
      def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
  });
  var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
  });
  var URL_BAD_FORMAT = 1;
  var URL_UNPARSEABLE = 2;
  function canParseURL(input) {
    try {
      if (typeof URL !== "undefined" && typeof URL.canParse === "function")
        return URL.canParse(input);
      new URL(input);
      return true;
    } catch {
      return false;
    }
  }
  function validateURL(trimmed, def) {
    if (!("normalize" in def) && !("hostname" in def) && !("protocol" in def)) {
      return canParseURL(trimmed) || URL_UNPARSEABLE;
    }
    return parseURLObject(trimmed, def);
  }
  function parseURLObject(trimmed, def) {
    if (!def.normalize && def.protocol?.source === httpProtocol.source && !/^https?:\/\//i.test(trimmed)) {
      return URL_BAD_FORMAT;
    }
    try {
      if (typeof URL !== "undefined") {
        const URLStatic = URL;
        if (typeof URLStatic.parse === "function")
          return URLStatic.parse(trimmed) ?? URL_UNPARSEABLE;
      }
      return new URL(trimmed);
    } catch {
      return URL_UNPARSEABLE;
    }
  }
  var asciiTabOrNewline = /[\t\n\r]/g;
  function stripTabAndNewline(value) {
    return value.replace(asciiTabOrNewline, "");
  }
  function urlHostnameOk(url, hostname) {
    hostname.lastIndex = 0;
    return hostname.test(url.hostname);
  }
  function urlProtocolOk(url, protocol) {
    protocol.lastIndex = 0;
    return protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol);
  }
  var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const trimmed = payload.value.trim();
        const url = validateURL(trimmed, def);
        if (url === URL_BAD_FORMAT) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid URL format",
            input: payload.value,
            inst,
            continue: !def.abort
          });
          return;
        }
        if (url === URL_UNPARSEABLE) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            input: payload.value,
            inst,
            continue: !def.abort
          });
          return;
        }
        if (url === true) {
          payload.value = stripTabAndNewline(trimmed);
          return;
        }
        if (def.hostname && !urlHostnameOk(url, def.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
        if (def.protocol && !urlProtocolOk(url, def.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
        payload.value = def.normalize ? url.href : stripTabAndNewline(trimmed);
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
  });
  var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    if (def.length !== void 0 && (!Number.isInteger(def.length) || def.length < 1))
      throw new Error(`Invalid nanoid length: ${def.length}`);
    def.pattern ?? (def.pattern = def.length === void 0 ? nanoid : nanoidOfLength(def.length));
    $ZodStringFormat.init(inst, def);
  });
  var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime(def));
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time(def));
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
  });
  var ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
  function isValidIPv6(value) {
    if (!ipv6Alphabet.test(value))
      return false;
    return canParseURL(`http://[${value}]`);
  }
  var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (!isValidIPv6(payload.value)) {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
  });
  function isValidCIDRv6(value) {
    const parts = value.split("/");
    if (parts.length !== 2)
      return false;
    const [address, prefix] = parts;
    if (!prefix)
      return false;
    const prefixNum = Number(prefix);
    if (`${prefixNum}` !== prefix)
      return false;
    if (prefixNum < 0 || prefixNum > 128)
      return false;
    return isValidIPv6(address);
  }
  var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (!isValidCIDRv6(payload.value)) {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  function isValidBase64(data) {
    if (data === "")
      return true;
    if (/\s/.test(data))
      return false;
    if (data.length % 4 !== 0)
      return false;
    try {
      atob(data);
      return true;
    } catch {
      return false;
    }
  }
  var base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
  var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64Charset);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var base64urlCharset = /^[A-Za-z0-9_-]*$/;
  function isValidBase64URL(data) {
    if (!base64urlCharset.test(data))
      return false;
    const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
    const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
    return isValidBase64(padded);
  }
  var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64urlCharset);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
  });
  function isValidJWT(token, algorithm = null) {
    try {
      const tokensParts = token.split(".");
      if (tokensParts.length !== 3)
        return false;
      const [header] = tokensParts;
      if (!header)
        return false;
      const parsedHeader = JSON.parse(atob(header));
      if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
        return false;
      if (!parsedHeader.alg)
        return false;
      if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
        return false;
      return true;
    } catch {
      return false;
    }
  }
  var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = number;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...received ? { received } : {}
      });
      return payload;
    };
  });
  var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  function capSize(inst, size) {
    const caps = sizeCaps(inst._zod.def.checks);
    if (!caps.length)
      return;
    const cap = Math.min(...caps.map((c) => c[0]));
    const parse2 = inst._zod.parse;
    inst._zod.parse = (payload, ctx) => {
      const n2 = size(payload.value);
      if (n2 > cap && !ctx?.skipChecks && ctx?.direction !== "backward") {
        for (const [max, ch] of sizeCaps(inst._zod.def.checks)) {
          if (n2 > max && ch._zod.def.when(payload)) {
            const start = payload.issues.length;
            ch._zod.check(payload);
            payload.issues[start].continue = false;
            attachSchema(payload.issues, start, inst);
            return payload;
          }
        }
      }
      return parse2(payload, ctx);
    };
  }
  var arraySize = (input) => Array.isArray(input) ? input.length : -1;
  function handleArrayResult(result, final, index) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
  }
  var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    const memo2 = globalConfig.memoizer;
    memo2?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = memo2 ? memo2.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
      const proms = [];
      const abortEarly = ctx?.abortEarly;
      for (let i = 0; i < input.length; i++) {
        const item = input[i];
        const result = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
        } else {
          handleArrayResult(result, payload, i);
          if (abortEarly && result.issues.length !== 0 && aborted(result))
            break;
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
    capSize(inst, arraySize);
  });
  function handlePropertyResult(result, final, key, input, optin, optout) {
    const isPresent = key in input;
    const isOptionalOut = optout === "optional";
    if (!isPresent && isOptionalOut && optin === "optional") {
      return;
    }
    if (result.issues.length) {
      if (optin !== void 0 && isOptionalOut && !isPresent) {
        return;
      }
      final.issues.push(...prefixIssues(key, result.issues));
    }
    if (!isPresent && optin === void 0) {
      if (!result.issues.length) {
        final.issues.push({
          code: "invalid_type",
          expected: "nonoptional",
          input: void 0,
          path: [key]
        });
      }
      return;
    }
    if (result.value === void 0) {
      if (isPresent || optin === "defaulted" && !isOptionalOut) {
        final.value[key] = void 0;
      }
    } else {
      final.value[key] = result.value;
    }
  }
  var NO_SYMBOL_KEYS = [];
  function normalizeDef(def) {
    const keys = Object.keys(def.shape);
    const ownSymbols = Object.getOwnPropertySymbols(def.shape);
    const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
    const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
    for (const k of allKeys) {
      if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
        throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
      }
    }
    const okeys = optionalKeys(def.shape);
    return {
      ...def,
      allKeys,
      symbolKeys,
      // string-only: handleCatchall matches it against `for...in`, which never yields a symbol
      keySet: new Set(keys),
      numKeys: keys.length,
      optionalKeys: new Set(okeys)
    };
  }
  function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
    const unrecognized = [];
    const keySet = def.keySet;
    const _catchall = def.catchall._zod;
    const t = _catchall.def.type;
    const optin = _catchall.optin;
    const optout = _catchall.optout;
    let seen = 0;
    for (const key in input) {
      if (abortEarly && payload.issues.length !== seen) {
        if (aborted(payload, seen))
          break;
        seen = payload.issues.length;
      }
      if (keySet.has(key))
        continue;
      if (key === "__proto__") {
        if (t === "never")
          unrecognized.push(key);
        continue;
      }
      if (t === "never") {
        unrecognized.push(key);
        continue;
      }
      const r = _catchall.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
      } else {
        handlePropertyResult(r, payload, key, input, optin, optout);
      }
    }
    if (unrecognized.length) {
      payload.issues.push({
        code: "unrecognized_keys",
        keys: unrecognized,
        input,
        inst,
        // Describes the shape of the input, not the validity of the parsed value, so it never aborts. The parse still fails; the schema's own checks just get to run first, and an enclosing intersection can reconcile the key against a sibling operand.
        continue: true
      });
    }
    if (!proms.length)
      return payload;
    return Promise.all(proms).then(() => {
      return payload;
    });
  }
  var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    const sh = desc?.get ? desc.get.raw : def.shape ?? {};
    if (sh) {
      const get = () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", { value: newSh });
        get.raw = newSh;
        return newSh;
      };
      get.raw = sh;
      Object.defineProperty(def, "shape", { get });
    }
    const _normalized = cached(() => normalizeDef(def));
    defineLazyInternal(inst, "propValues", (zod) => {
      const shape = zod.def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          if (!Object.prototype.hasOwnProperty.call(propValues, key)) {
            assignProp(propValues, key, /* @__PURE__ */ new Set());
          }
          for (const v of field.values)
            propValues[key].add(v);
          if (field.optin !== void 0)
            propValues[key].add(void 0);
        }
      }
      return propValues;
    });
    const isObject2 = isObject;
    const catchall = def.catchall;
    let value;
    const memo2 = globalConfig.memoizer;
    memo2?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = memo2 ? memo2.alloc(inst, payload, {}, ctx) : {};
      const proms = [];
      const shape = value.shape;
      const abortEarly = ctx?.abortEarly;
      let seen = payload.issues.length;
      for (const key of value.allKeys) {
        if (abortEarly && payload.issues.length !== seen) {
          if (aborted(payload, seen))
            break;
          seen = payload.issues.length;
        }
        if (key === "__proto__")
          continue;
        const el = shape[key];
        const optin = el._zod.optin;
        const optout = el._zod.optout;
        const r = el._zod.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
        } else {
          handlePropertyResult(r, payload, key, input, optin, optout);
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
    };
  });
  var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const memo2 = globalConfig.memoizer;
    const generateFastpass = (shape) => {
      const normalized = _normalized.value;
      const syms = normalized.symbolKeys;
      const doc = new Doc(["payload", "ctx"], { shape, inst, memo: memo2, syms });
      const parseStr = (k) => `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      const prefixStr = (id, k) => `
          let ${id}_ab = false;
          for (let i = 0; i < ${id}.issues.length; i++) {
            const iss = ${id}.issues[i];
            iss.path = iss.path ? [${k}, ...iss.path] : [${k}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${id}_ab = true;
          }
          if (${id}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
      doc.write(`const input = payload.value;`);
      const ids = /* @__PURE__ */ Object.create(null);
      let counter = 0;
      for (const key of normalized.allKeys) {
        ids[key] = `key_${counter++}`;
      }
      doc.write(memo2 ? `const newResult = memo.alloc(inst, payload, {}, ctx);` : `const newResult = {};`);
      for (const key of normalized.allKeys) {
        if (key === "__proto__")
          continue;
        const id = ids[key];
        const k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : esc(key);
        const isPresent = `${k} in input`;
        const schema = shape[key];
        const optin = schema?._zod?.optin;
        const isOptionalIn = optin !== void 0;
        const isOptionalOut = schema?._zod?.optout === "optional";
        doc.write(`const ${id} = ${parseStr(k)};`);
        if (isOptionalIn && isOptionalOut) {
          const assign = optin === "optional" ? `${id}_present` : `${id}.value !== undefined || ${id}_present`;
          doc.write(`
        const ${id}_present = ${isPresent};
        if (!${id}.issues.length || ${id}_present) {
          if (${id}.issues.length) {${prefixStr(id, k)}
          }

          if (${assign}) {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
        } else if (!isOptionalIn) {
          doc.write(`
        const ${id}_present = ${isPresent};
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${id}_present) {
          newResult[${k}] = ${id}.value;
        }

      `);
        } else {
          doc.write(`
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
      `);
          if (optin === "defaulted") {
            doc.write(`newResult[${k}] = ${id}.value;`);
          } else {
            doc.write(`
        if (${id}.value !== undefined || ${isPresent}) {
          newResult[${k}] = ${id}.value;
        }
      `);
          }
        }
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      return doc.compile();
    };
    let fastpass;
    const isObject2 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval2 = allowsEval;
    const fastEnabled = jit && allowsEval2.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall)
          return payload;
        return handleCatchall([], input, payload, ctx, value, inst, ctx?.abortEarly === true);
      }
      return superParse(payload, ctx);
    };
  });
  function handleUnionResults(results, final, inst, ctx) {
    for (const result of results) {
      if (result.issues.length === 0) {
        final.value = result.value;
        return final;
      }
    }
    const nonaborted = results.filter((r) => !aborted(r));
    if (nonaborted.length === 1) {
      final.value = nonaborted[0].value;
      return nonaborted[0];
    }
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
    return final;
  }
  var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
    defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
    defineLazyInternal(inst, "values", (zod) => {
      if (zod.def.options.every((o) => o._zod.values)) {
        return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return void 0;
    });
    defineLazyInternal(inst, "pattern", (zod) => {
      if (zod.def.options.every((o) => o._zod.pattern)) {
        const patterns = zod.def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
      }
      return void 0;
    });
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
      if (first) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0)
            return result;
          results.push(result);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left2, right2]) => {
          return handleIntersectionResults(payload, left2, right2);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  function mergeValues(a, b) {
    if (a === b) {
      return { valid: true, data: a };
    }
    if (a instanceof Date && b instanceof Date && +a === +b) {
      return { valid: true, data: a };
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      const bKeys = Object.keys(b);
      const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a, ...b };
      if (Object.prototype.hasOwnProperty.call(newObj, "__proto__"))
        delete newObj.__proto__;
      for (const key of sharedKeys) {
        if (key === "__proto__")
          continue;
        const sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
          };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return { valid: false, mergeErrorPath: [] };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
          };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    }
    return { valid: false, mergeErrorPath: [] };
  }
  function handleIntersectionResults(result, left, right) {
    const unrecKeys = /* @__PURE__ */ new Map();
    let unrecIssue;
    const keyIssues = /* @__PURE__ */ new Map();
    const collect = (iss, side) => {
      let keys;
      if (iss.code === "unrecognized_keys" && !iss.path?.length) {
        unrecIssue ?? (unrecIssue = iss);
        keys = iss.keys;
      } else if (iss.code === "invalid_key" && iss.origin === "record" && iss.path?.length === 1) {
        const k = String(iss.path[0]);
        if (!keyIssues.has(k))
          keyIssues.set(k, iss);
        keys = [k];
      } else {
        return false;
      }
      for (const k of keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k)[side] = true;
      }
      return true;
    };
    for (const iss of left.issues) {
      if (!collect(iss, "l"))
        result.issues.push(iss);
    }
    for (const iss of right.issues) {
      if (!collect(iss, "r"))
        result.issues.push(iss);
    }
    const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
    if (bothKeys.length) {
      const aggregated = unrecIssue ? bothKeys.filter((k) => unrecIssue.keys.includes(k)) : [];
      if (aggregated.length)
        result.issues.push({ ...unrecIssue, keys: aggregated });
      for (const k of bothKeys) {
        if (!aggregated.includes(k) && keyIssues.has(k))
          result.issues.push(keyIssues.get(k));
      }
    }
    const merged = mergeValues(left.value, right.value);
    if (!merged.valid) {
      if (aborted(result))
        return result;
      throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result.value = merged.data;
    return result;
  }
  var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    defineLazyInternal(inst, "pattern", (zod) => {
      const patternValues = getEnumValues(zod.def.entries).filter((k) => propertyKeyTypes.has(typeof k));
      return new RegExp(patternValues.length ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
    });
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (valuesSet.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    globalConfig.memoizer?.guard(inst);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      const _out = def.transform(payload.value, payload);
      if (ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError();
      }
      payload.value = _out;
      return payload;
    };
  });
  function handleOptionalResult(payload, result) {
    payload.value = result.issues.length ? void 0 : result.value;
    return payload;
  }
  var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
    inst._zod.optout = "optional";
    defineLazyInternal(inst, "values", (zod) => {
      const values = zod.def.innerType._zod.values;
      return values ? /* @__PURE__ */ new Set([...values, void 0]) : void 0;
    });
    defineLazyInternal(inst, "pattern", (zod) => {
      const pattern = zod.def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === void 0) {
        if (def.innerType._zod.optin !== "defaulted")
          return payload;
        const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
        if (result instanceof Promise)
          return result.then((result2) => handleOptionalResult(payload, result2));
        return handleOptionalResult(payload, result);
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
    inst._zod.parse = (payload, ctx) => {
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
    defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
    defineLazyInternal(inst, "pattern", (zod) => {
      const pattern = zod.def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
    });
    defineLazyInternal(inst, "values", (zod) => {
      return zod.def.innerType._zod.values ? /* @__PURE__ */ new Set([...zod.def.innerType._zod.values, null]) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "defaulted";
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleDefaultResult(result2, def));
      }
      return handleDefaultResult(result, def);
    };
  });
  function handleDefaultResult(payload, def) {
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return payload;
  }
  var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "defaulted";
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "values", (zod) => {
      const v = zod.def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleNonOptionalResult(result2, inst));
      }
      return handleNonOptionalResult(result, inst);
    };
  });
  function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === void 0) {
      payload.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: payload.value,
        inst
      });
    }
    return payload;
  }
  function handleCatchResult(payload, result, def, ctx) {
    if (!result.issues.length) {
      payload.value = result.value;
      if (result.memo)
        payload.memo = true;
      return payload;
    }
    payload.value = def.catchValue({
      ...result,
      value: payload.value,
      error: {
        issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      },
      input: payload.value
    });
    return payload;
  }
  var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
    defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleCatchResult(payload, result2, def, ctx));
      }
      return handleCatchResult(payload, result, def, ctx);
    };
  });
  var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
    defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
    defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
    defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handlePipeResult(right2, def.in, ctx));
        }
        return handlePipeResult(right, def.in, ctx);
      }
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handlePipeResult(left2, def.out, ctx));
      }
      return handlePipeResult(left, def.out, ctx);
    };
  });
  function handlePipeResult(left, next, ctx) {
    if (left.issues.some((iss) => iss.code !== "unrecognized_keys")) {
      left.aborted = true;
      return left;
    }
    return next._zod.run({ value: left.value, issues: left.issues }, ctx);
  }
  var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
    defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
    defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result);
    };
  });
  function handleReadonlyResult(payload) {
    if (!payload.memo)
      payload.value = Object.freeze(payload.value);
    return payload;
  }
  var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r = def.fn(input);
      if (r instanceof Promise) {
        return r.then((r2) => handleRefineResult(r2, payload, input, inst));
      }
      handleRefineResult(r, payload, input, inst);
      return;
    };
  });
  function handleRefineResult(result, payload, input, inst) {
    if (!result) {
      const _iss = {
        code: "custom",
        input,
        inst,
        // incorporates params.error into issue reporting
        path: [...inst._zod.def.path ?? []],
        // incorporates params.error into issue reporting
        continue: !inst._zod.def.abort
        // params: inst._zod.def.params,
      };
      if (inst._zod.def.params)
        _iss.params = inst._zod.def.params;
      payload.issues.push(issue(_iss));
    }
  }

  // node_modules/zod/v4/core/memoizer.js
  var $ZodCyclicError = class extends Error {
    constructor() {
      super(`Cannot parse a reference cycle that closes through a transform`);
      this.name = "ZodCyclicError";
    }
  };
  var STATE = "~memo";
  var NO_ISSUES = [];
  function isRef(value) {
    return value !== null && typeof value === "object";
  }
  function cloneIssues(issues) {
    return issues.map((iss) => iss.path ? { ...iss, path: iss.path.slice() } : { ...iss });
  }
  var recursive = /* @__PURE__ */ new WeakMap();
  var NONE = 0;
  var ASSUMED = 1;
  var PROVEN = 2;
  function isRecursive(inst, stack, resolve) {
    const cached2 = recursive.get(inst);
    if (cached2 !== void 0)
      return cached2 ? PROVEN : NONE;
    if (stack.has(inst))
      return PROVEN;
    stack.add(inst);
    let result = NONE;
    const check = (child) => {
      if (result !== PROVEN && child?._zod) {
        const answer = isRecursive(child, stack, resolve);
        if (answer > result)
          result = answer;
      }
    };
    const shape = (sh, spread) => {
      let answer = NONE;
      for (const key of Reflect.ownKeys(sh)) {
        const desc = Object.getOwnPropertyDescriptor(sh, key);
        if (spread && !desc.enumerable)
          continue;
        const child = desc.get ? ASSUMED : desc.value?._zod ? isRecursive(desc.value, stack, resolve) : NONE;
        if (child > answer)
          answer = child;
      }
      return answer;
    };
    const merge2 = (answer) => {
      if (answer > result)
        result = answer;
    };
    const def = inst._zod.def;
    const kind = def.type;
    switch (kind) {
      case "object": {
        const raw = rawShape(def);
        merge2(raw ? shape(raw, true) : ASSUMED);
        check(def.catchall);
        break;
      }
      case "array":
        check(def.element);
        break;
      case "tuple":
        for (const el of def.items)
          check(el);
        check(def.rest);
        break;
      case "record":
      case "map":
        check(def.keyType);
        check(def.valueType);
        break;
      case "set":
        check(def.valueType);
        break;
      case "union":
        for (const el of def.options)
          check(el);
        break;
      case "intersection":
        check(def.left);
        check(def.right);
        break;
      case "optional":
      case "nullable":
      case "default":
      case "prefault":
      case "catch":
      case "readonly":
      case "nonoptional":
      case "promise":
      case "success":
        check(def.innerType);
        break;
      case "pipe":
        check(def.in);
        check(def.out);
        break;
      case "function":
        check(def.input);
        check(def.output);
        break;
      // `$ZodLazy` caches its inner on the def, so a resolved edge is followed exactly
      case "lazy": {
        const inner = def._cachedInner ?? (resolve ? inst._zod.innerType : void 0);
        merge2(inner ? isRecursive(inner, stack, false) : ASSUMED);
        break;
      }
      // a leaf by choice: `parts` are regex fragments, not data positions
      case "template_literal":
      // leaves
      case "string":
      case "number":
      case "int":
      case "boolean":
      case "bigint":
      case "symbol":
      case "undefined":
      case "null":
      case "void":
      case "never":
      case "any":
      case "unknown":
      case "date":
      case "nan":
      case "enum":
      case "literal":
      case "file":
      case "transform":
      case "custom":
        break;
      default: {
        kind;
        for (const key in def) {
          const desc = Object.getOwnPropertyDescriptor(def, key);
          if (!desc || desc.get)
            continue;
          const value = desc.value;
          if (!value || typeof value !== "object")
            continue;
          if (value._zod)
            check(value);
          else if (Array.isArray(value))
            for (const el of value)
              check(el);
        }
      }
    }
    stack.delete(inst);
    return settle(inst, result);
  }
  function settle(inst, answer) {
    if (answer !== ASSUMED)
      recursive.set(inst, answer === PROVEN);
    return answer;
  }
  function bucketFor(state, inst) {
    let bucket = state.buckets.get(inst);
    if (!bucket) {
      bucket = /* @__PURE__ */ new WeakMap();
      state.buckets.set(inst, bucket);
    }
    return bucket;
  }
  var handoff;
  var open = [];
  var memo = {
    alloc(_inst, payload, empty) {
      const bucket = handoff;
      if (!bucket)
        return empty;
      handoff = void 0;
      const entry = { value: empty, issues: null };
      bucket.set(payload.value, entry);
      open.push(entry);
      return empty;
    },
    guard(inst) {
      var _a3;
      (_a3 = inst._zod).deferred ?? (_a3.deferred = []);
      inst._zod.deferred.push(() => {
        const base = inst._zod.parse;
        const wrapped = (payload, ctx) => {
          if (ctx.direction !== "backward" && isBackEdge(ctx, payload.value))
            throw new $ZodCyclicError();
          return base(payload, ctx);
        };
        inst._zod.parse = wrapped;
        if (inst._zod.run === base)
          inst._zod.run = wrapped;
      });
    },
    attach(inst) {
      var _a3;
      let isRecursiveInst;
      let rechecked = false;
      let lastCtx;
      let lastBucket;
      (_a3 = inst._zod).deferred ?? (_a3.deferred = []);
      inst._zod.deferred.push(() => {
        const base = inst._zod.parse;
        const wrapped = (payload, ctx) => {
          if (isRecursiveInst === void 0) {
            const walked = isRecursive(inst, /* @__PURE__ */ new Set(), false);
            if (walked === NONE) {
              inst._zod.parse = base;
              if (inst._zod.run === wrapped)
                inst._zod.run = base;
              return base(payload, ctx);
            }
            if (walked === PROVEN || rechecked)
              isRecursiveInst = true;
            else
              rechecked = true;
          }
          const input = payload.value;
          if (!isRef(input))
            return base(payload, ctx);
          let state = ctx[STATE];
          if (!state) {
            state = { buckets: /* @__PURE__ */ new WeakMap(), backEdges: void 0 };
            ctx[STATE] = state;
          }
          let bucket;
          if (lastCtx === ctx) {
            bucket = lastBucket;
          } else {
            bucket = bucketFor(state, inst);
            lastCtx = ctx;
            lastBucket = bucket;
          }
          const hit = bucket.get(input);
          if (hit) {
            payload.value = hit.value;
            if (hit.issues) {
              if (hit.issues.length)
                payload.issues.push(...cloneIssues(hit.issues));
            } else {
              payload.memo = true;
              state.backEdges ?? (state.backEdges = /* @__PURE__ */ new WeakSet());
              state.backEdges.add(hit.value);
            }
            return payload;
          }
          handoff = bucket;
          const depth = open.length;
          const result = base(payload, ctx);
          handoff = void 0;
          const entry = open.length > depth ? open.pop() : void 0;
          if (result instanceof Promise) {
            return result.then((r) => {
              if (entry)
                entry.issues = r.issues.length ? cloneIssues(r.issues) : NO_ISSUES;
              return r;
            });
          }
          if (entry)
            entry.issues = result.issues.length ? cloneIssues(result.issues) : NO_ISSUES;
          return result;
        };
        inst._zod.parse = wrapped;
        if (inst._zod.run === base)
          inst._zod.run = wrapped;
      });
    }
  };
  function memoizer() {
    return memo;
  }
  function isBackEdge(ctx, value) {
    const backEdges = ctx[STATE]?.backEdges;
    return backEdges !== void 0 && isRef(value) && backEdges.has(value);
  }

  // node_modules/zod/v4/locales/en.js
  var error = () => {
    const Sizable = {
      string: { unit: "characters", verb: "to have" },
      file: { unit: "bytes", verb: "to have" },
      array: { unit: "items", verb: "to have" },
      set: { unit: "items", verb: "to have" },
      map: { unit: "entries", verb: "to have" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
      regex: "input",
      email: "email address",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datetime",
      date: "ISO date",
      time: "ISO time",
      duration: "ISO duration",
      ipv4: "IPv4 address",
      ipv6: "IPv6 address",
      mac: "MAC address",
      cidrv4: "IPv4 range",
      cidrv6: "IPv6 range",
      base64: "base64-encoded string",
      base64url: "base64url-encoded string",
      json_string: "JSON string",
      e164: "E.164 number",
      currency_code: "currency code",
      credit_card: "credit card number",
      iban: "IBAN",
      jwt: "JWT",
      template_literal: "input"
    };
    const TypeDictionary = {
      // Compatibility: "nan" -> "NaN" for display
      nan: "NaN"
      // All other type names omitted - they fall back to raw values via ?? operator
    };
    function getTypeName(type, input) {
      if (type === "number" && typeof input === "number" && !Number.isFinite(input)) {
        return String(input);
      }
      return TypeDictionary[type] ?? type;
    }
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type": {
          const expected = getTypeName(issue2.expected);
          const receivedType = parsedType(issue2.input);
          const received = getTypeName(receivedType, issue2.input);
          return `Invalid input: expected ${expected}, received ${received}`;
        }
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
          return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.exact ? "exactly " : issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
          return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.exact ? "exactly " : issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Invalid string: must start with "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Invalid string: must end with "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Invalid string: must include "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Invalid string: must match pattern ${_issue.pattern}`;
          return `Invalid ${FormatDictionary[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Invalid number: must be a multiple of ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Invalid key in ${issue2.origin}`;
        case "invalid_union":
          if (issue2.options && Array.isArray(issue2.options) && issue2.options.length > 0) {
            const opts = issue2.options.map((o) => `'${o}'`).join(" | ");
            return `Invalid discriminator value. Expected ${opts}`;
          }
          if (issue2.inclusive === false) {
            return "Invalid input: more than one option matched";
          }
          return "Invalid input";
        case "invalid_element":
          return `Invalid value in ${issue2.origin}`;
        default:
          return `Invalid input`;
      }
    };
  };
  function en_default() {
    return {
      localeError: error()
    };
  }

  // node_modules/zod/v4/core/registries.js
  var _a2;
  var $ZodRegistry = class {
    constructor() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
    }
    add(schema, ..._meta) {
      const meta2 = _meta[0];
      this._map.set(schema, meta2);
      if (meta2 && typeof meta2 === "object" && "id" in meta2) {
        this._idmap.set(meta2.id, schema);
      }
      return this;
    }
    clear() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
      return this;
    }
    remove(schema) {
      const meta2 = this._map.get(schema);
      if (meta2 && typeof meta2 === "object" && "id" in meta2) {
        this._idmap.delete(meta2.id);
      }
      this._map.delete(schema);
      return this;
    }
    get(schema) {
      const p = schema._zod.parent;
      if (p) {
        const pm = { ...this.get(p) ?? {} };
        delete pm.id;
        const f = { ...pm, ...this._map.get(schema) };
        return Object.keys(f).length ? f : void 0;
      }
      return this._map.get(schema);
    }
    has(schema) {
      return this._map.has(schema);
    }
  };
  function registry() {
    return new $ZodRegistry();
  }
  (_a2 = globalThis).__zod_globalRegistry ?? (_a2.__zod_globalRegistry = registry());
  var globalRegistry = globalThis.__zod_globalRegistry;

  // node_modules/zod/v4/core/api.js
  function snapshotChecks(def) {
    if (def.checks)
      def.checks = [...def.checks];
    return def;
  }
  // @__NO_SIDE_EFFECTS__
  function _string(Class2, params) {
    return new Class2(snapshotChecks({ type: "string", ...normalizeParams(params) }));
  }
  // @__NO_SIDE_EFFECTS__
  function _email(Class2, params) {
    return new Class2({
      type: "string",
      format: "email",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _guid(Class2, params) {
    return new Class2({
      type: "string",
      format: "guid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuid(Class2, params) {
    return new Class2({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuidv4(Class2, params) {
    return new Class2({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v4",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuidv6(Class2, params) {
    return new Class2({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v6",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uuidv7(Class2, params) {
    return new Class2({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v7",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _url(Class2, params) {
    return new Class2({
      type: "string",
      format: "url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _emoji2(Class2, params) {
    return new Class2({
      type: "string",
      format: "emoji",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _nanoid(Class2, params) {
    return new Class2({
      type: "string",
      format: "nanoid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cuid(Class2, params) {
    return new Class2({
      type: "string",
      format: "cuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cuid2(Class2, params) {
    return new Class2({
      type: "string",
      format: "cuid2",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ulid(Class2, params) {
    return new Class2({
      type: "string",
      format: "ulid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _xid(Class2, params) {
    return new Class2({
      type: "string",
      format: "xid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ksuid(Class2, params) {
    return new Class2({
      type: "string",
      format: "ksuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ipv4(Class2, params) {
    return new Class2({
      type: "string",
      format: "ipv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _ipv6(Class2, params) {
    return new Class2({
      type: "string",
      format: "ipv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cidrv4(Class2, params) {
    return new Class2({
      type: "string",
      format: "cidrv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _cidrv6(Class2, params) {
    return new Class2({
      type: "string",
      format: "cidrv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _base64(Class2, params) {
    return new Class2({
      type: "string",
      format: "base64",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _base64url(Class2, params) {
    return new Class2({
      type: "string",
      format: "base64url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _e164(Class2, params) {
    return new Class2({
      type: "string",
      format: "e164",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _jwt(Class2, params) {
    return new Class2({
      type: "string",
      format: "jwt",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoDateTime(Class2, params) {
    return new Class2({
      type: "string",
      format: "datetime",
      check: "string_format",
      offset: false,
      local: false,
      precision: null,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoDate(Class2, params) {
    return new Class2({
      type: "string",
      format: "date",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoTime(Class2, params) {
    return new Class2({
      type: "string",
      format: "time",
      check: "string_format",
      precision: null,
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _isoDuration(Class2, params) {
    return new Class2({
      type: "string",
      format: "duration",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _number(Class2, params) {
    return new Class2(snapshotChecks({ type: "number", checks: [], ...normalizeParams(params) }));
  }
  // @__NO_SIDE_EFFECTS__
  function _int(Class2, params) {
    return new Class2({
      type: "number",
      check: "number_format",
      abort: false,
      format: "safeint",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _boolean(Class2, params) {
    return new Class2({
      type: "boolean",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _unknown(Class2) {
    return new Class2({
      type: "unknown"
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _never(Class2, params) {
    return new Class2({
      type: "never",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _lt(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _lte(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _gt(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _gte(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _multipleOf(value, params) {
    return new $ZodCheckMultipleOf({
      check: "multiple_of",
      ...normalizeParams(params),
      value
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _maxLength(maximum, params) {
    const ch = new $ZodCheckMaxLength({
      check: "max_length",
      ...normalizeParams(params),
      maximum
    });
    return ch;
  }
  // @__NO_SIDE_EFFECTS__
  function _minLength(minimum, params) {
    return new $ZodCheckMinLength({
      check: "min_length",
      ...normalizeParams(params),
      minimum
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _length(length, params) {
    return new $ZodCheckLengthEquals({
      check: "length_equals",
      ...normalizeParams(params),
      length
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _regex(pattern, params) {
    return new $ZodCheckRegex({
      check: "string_format",
      format: "regex",
      ...normalizeParams(params),
      pattern
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _lowercase(params) {
    return new $ZodCheckLowerCase({
      check: "string_format",
      format: "lowercase",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _uppercase(params) {
    return new $ZodCheckUpperCase({
      check: "string_format",
      format: "uppercase",
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _includes(includes, params) {
    return new $ZodCheckIncludes({
      check: "string_format",
      format: "includes",
      ...normalizeParams(params),
      includes
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _startsWith(prefix, params) {
    return new $ZodCheckStartsWith({
      check: "string_format",
      format: "starts_with",
      ...normalizeParams(params),
      prefix
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _endsWith(suffix, params) {
    return new $ZodCheckEndsWith({
      check: "string_format",
      format: "ends_with",
      ...normalizeParams(params),
      suffix
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _overwrite(tx) {
    return new $ZodCheckOverwrite({
      check: "overwrite",
      tx
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _normalize(form) {
    return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
  }
  // @__NO_SIDE_EFFECTS__
  function _trim() {
    return /* @__PURE__ */ _overwrite((input) => input.trim());
  }
  // @__NO_SIDE_EFFECTS__
  function _toLowerCase() {
    return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
  }
  // @__NO_SIDE_EFFECTS__
  function _toUpperCase() {
    return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
  }
  // @__NO_SIDE_EFFECTS__
  function _slugify() {
    return /* @__PURE__ */ _overwrite((input) => slugify(input));
  }
  // @__NO_SIDE_EFFECTS__
  function _array(Class2, element, params) {
    return new Class2({
      type: "array",
      element,
      // get element() {
      //   return element;
      // },
      ...normalizeParams(params)
    });
  }
  // @__NO_SIDE_EFFECTS__
  function _refine(Class2, fn, _params) {
    const schema = new Class2({
      type: "custom",
      check: "custom",
      fn,
      ...normalizeParams(_params)
    });
    return schema;
  }
  // @__NO_SIDE_EFFECTS__
  function _superRefine(fn, params) {
    const ch = /* @__PURE__ */ _check((payload) => {
      payload.addIssue = (issue2) => {
        if (typeof issue2 === "string") {
          payload.issues.push(issue(issue2, payload.value, ch._zod.def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          if (!("input" in _issue))
            _issue.input = payload.value;
          _issue.inst ?? (_issue.inst = ch);
          _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
          payload.issues.push(issue(_issue));
        }
      };
      return fn(payload.value, payload);
    }, params);
    return ch;
  }
  // @__NO_SIDE_EFFECTS__
  function _check(fn, params) {
    const ch = new $ZodCheck({
      check: "custom",
      ...normalizeParams(params)
    });
    ch._zod.check = fn;
    return ch;
  }

  // node_modules/zod/v4/core/to-json-schema.js
  function assignProps(target, ...sources) {
    for (const source of sources) {
      for (const key of Reflect.ownKeys(source)) {
        if (Object.prototype.propertyIsEnumerable.call(source, key)) {
          assignProp(target, key, source[key]);
        }
      }
    }
    return target;
  }
  function initializeContext(params) {
    let target = params?.target ?? "draft-2020-12";
    if (target === "draft-4")
      target = "draft-04";
    if (target === "draft-7")
      target = "draft-07";
    return {
      processors: params.processors ?? {},
      metadataRegistry: params?.metadata ?? globalRegistry,
      target,
      unrepresentable: params?.unrepresentable ?? "throw",
      override: params?.override ?? (() => {
      }),
      io: params?.io ?? "output",
      counter: 0,
      seen: /* @__PURE__ */ new Map(),
      sharedDefsExtractedFor: void 0,
      sharedEmitDoneFor: void 0,
      cycles: params?.cycles ?? "ref",
      reused: params?.reused ?? "inline",
      intersections: [],
      deferred: [],
      external: params?.external ?? void 0
    };
  }
  function handleUnrepresentable(schema, ctx, json, params, message) {
    const result = typeof ctx.unrepresentable === "function" ? ctx.unrepresentable({ zodSchema: schema, path: params.path, message }) : ctx.unrepresentable;
    if (result === "any")
      return false;
    if (result === void 0 || result === "throw")
      throw new Error(message);
    Object.assign(json, result);
    return true;
  }
  function processSchema(schema, ctx, _params = { path: [], schemaPath: [] }) {
    var _a3;
    const def = schema._zod.def;
    const seen = ctx.seen.get(schema);
    if (seen) {
      seen.count++;
      const isCycle = _params.schemaPath.includes(schema);
      if (isCycle) {
        seen.cycle = _params.path;
      }
      return seen.schema;
    }
    const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
    ctx.seen.set(schema, result);
    ctx.sharedDefsExtractedFor = void 0;
    ctx.sharedEmitDoneFor = void 0;
    const overrideSchema = schema._zod.toJSONSchema?.();
    if (overrideSchema) {
      result.schema = overrideSchema;
    } else {
      const params = {
        ..._params,
        schemaPath: [..._params.schemaPath, schema],
        path: _params.path
      };
      if (schema._zod.processJSONSchema) {
        schema._zod.processJSONSchema(ctx, result.schema, params);
      } else {
        const _json = result.schema;
        const processor = ctx.processors[def.type];
        if (!processor) {
          throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
        }
        processor(schema, ctx, _json, params);
      }
      const parent = schema._zod.parent;
      if (parent) {
        if (!result.ref)
          result.ref = parent;
        processSchema(parent, ctx, params);
        ctx.seen.get(parent).isParent = true;
      }
    }
    const meta2 = ctx.metadataRegistry.get(schema);
    if (meta2)
      assignProps(result.schema, meta2);
    if (ctx.io === "input" && isTransforming(schema)) {
      delete result.schema.examples;
      delete result.schema.default;
    }
    if (ctx.io === "input" && "_prefault" in result.schema)
      (_a3 = result.schema).default ?? (_a3.default = result.schema._prefault);
    delete result.schema._prefault;
    const _result = ctx.seen.get(schema);
    return _result.schema;
  }
  function encodeJSONPointerSegment(segment) {
    return segment.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  function extractDefs(ctx, schema) {
    const root2 = ctx.seen.get(schema);
    if (!root2)
      throw new Error("Unprocessed schema. This is a bug in Zod.");
    if (ctx.external && ctx.sharedDefsExtractedFor === ctx.external)
      return;
    const idToSchema = /* @__PURE__ */ new Map();
    for (const entry of ctx.seen.entries()) {
      const id = ctx.metadataRegistry.get(entry[0])?.id;
      if (id) {
        const existing = idToSchema.get(id);
        if (existing && existing !== entry[0]) {
          throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
        }
        idToSchema.set(id, entry[0]);
      }
    }
    const makeURI = (entry) => {
      const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
      if (ctx.external) {
        const externalId = ctx.external.registry.get(entry[0])?.id;
        const uriGenerator = ctx.external.uri ?? ((id2) => id2);
        if (externalId) {
          return { ref: uriGenerator(externalId) };
        }
        const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
        entry[1].defId = id;
        return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${encodeJSONPointerSegment(id)}` };
      }
      const uriPrefix = `#`;
      const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
      if (entry[1] === root2 && !entry[1].schema.id) {
        return { ref: uriPrefix };
      }
      const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
      return { defId, ref: defUriPrefix + encodeJSONPointerSegment(defId) };
    };
    const extractToDef = (entry) => {
      if (entry[1].schema.$ref) {
        return;
      }
      const seen = entry[1];
      const { ref, defId } = makeURI(entry);
      seen.def = { ...seen.schema };
      if (defId)
        seen.defId = defId;
      const schema2 = seen.schema;
      for (const key in schema2) {
        delete schema2[key];
      }
      schema2.$ref = ref;
    };
    if (ctx.cycles === "throw") {
      for (const entry of ctx.seen.entries()) {
        const seen = entry[1];
        if (seen.cycle) {
          throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
        }
      }
    }
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (schema === entry[0]) {
        extractToDef(entry);
        continue;
      }
      if (ctx.external) {
        const ext = ctx.external.registry.get(entry[0])?.id;
        if (schema !== entry[0] && ext) {
          extractToDef(entry);
          continue;
        }
      }
      const id = ctx.metadataRegistry.get(entry[0])?.id;
      if (id) {
        extractToDef(entry);
        continue;
      }
      if (seen.cycle) {
        extractToDef(entry);
        continue;
      }
      if (seen.count > 1) {
        if (ctx.reused === "ref") {
          extractToDef(entry);
        }
      }
    }
    if (ctx.external)
      ctx.sharedDefsExtractedFor = ctx.external;
  }
  function compactTypeUnion(schema) {
    const options = schema.anyOf;
    if (!Array.isArray(options) || options.length === 0 || schema.type !== void 0)
      return;
    const types = [];
    for (const option of options) {
      if (!option || typeof option !== "object")
        return;
      compactTypeUnion(option);
      const keys = Object.keys(option);
      if (keys.length !== 1 || keys[0] !== "type")
        return;
      const type = option.type;
      for (const member of Array.isArray(type) ? type : [type]) {
        if (typeof member !== "string")
          return;
        if (!types.includes(member))
          types.push(member);
      }
    }
    delete schema.anyOf;
    schema.type = types.length === 1 ? types[0] : types;
  }
  var FOLDABLE_KEYS = /* @__PURE__ */ new Set(["type", "properties", "required", "additionalProperties"]);
  var UNION_KEYS = ["oneOf", "anyOf"];
  function undeclaredConstraint(member) {
    const extra = member.additionalProperties;
    if (extra === void 0 || extra === false || typeof extra !== "object" || extra === null)
      return null;
    return Object.keys(extra).length ? extra : null;
  }
  function foldObjects(members2) {
    const objects = [];
    for (const member of members2) {
      if (typeof member !== "object" || member.type !== "object")
        return null;
      for (const key in member) {
        if (!FOLDABLE_KEYS.has(key))
          return null;
      }
      objects.push(member);
    }
    const properties = {};
    const required2 = /* @__PURE__ */ new Set();
    for (const object2 of objects) {
      for (const key in object2.properties) {
        if (Object.prototype.hasOwnProperty.call(properties, key))
          continue;
        const parts = [];
        for (const other of objects) {
          const part = other.properties?.[key] ?? undeclaredConstraint(other);
          if (part === null || part === void 0)
            continue;
          if (!parts.some((seen) => JSON.stringify(seen) === JSON.stringify(part)))
            parts.push(part);
        }
        const merged = parts.length === 1 ? parts[0] : foldObjects(parts) ?? { allOf: parts };
        assignProp(properties, key, merged);
      }
      for (const key of object2.required ?? [])
        required2.add(key);
    }
    const folded = { type: "object", properties };
    if (required2.size)
      folded.required = [...required2];
    if (objects.every((object2) => object2.additionalProperties === false)) {
      folded.additionalProperties = false;
    } else {
      const constraints = [];
      for (const object2 of objects) {
        const constraint = undeclaredConstraint(object2);
        if (constraint && !constraints.some((seen) => JSON.stringify(seen) === JSON.stringify(constraint)))
          constraints.push(constraint);
      }
      if (constraints.length === 1)
        folded.additionalProperties = constraints[0];
      else if (constraints.length > 1)
        folded.additionalProperties = { allOf: constraints };
    }
    return folded;
  }
  function foldIntersection(json) {
    const allOf = json.allOf;
    if (!Array.isArray(allOf) || allOf.length < 2)
      return;
    for (const key of FOLDABLE_KEYS)
      if (key in json)
        return;
    const unions = allOf.filter((m) => UNION_KEYS.some((k) => Array.isArray(m[k])));
    let folded = null;
    if (!unions.length) {
      folded = foldObjects(allOf);
    } else {
      const union2 = unions[0];
      const keyword = UNION_KEYS.find((k) => Array.isArray(union2[k]));
      if (Object.keys(union2).length !== 1)
        return;
      const rest = allOf.filter((m) => m !== union2);
      const branches = union2[keyword].map((branch) => foldObjects([...rest, branch]));
      if (branches.some((b) => !b))
        return;
      folded = { [keyword]: branches };
    }
    if (!folded)
      return;
    delete json.allOf;
    assignProps(json, folded);
  }
  function finalize(ctx, schema) {
    const root2 = ctx.seen.get(schema);
    if (!root2)
      throw new Error("Unprocessed schema. This is a bug in Zod.");
    const flattenRef = (zodSchema) => {
      const seen = ctx.seen.get(zodSchema);
      if (seen.ref === null)
        return;
      const schema2 = seen.def ?? seen.schema;
      const _cached = { ...schema2 };
      const ref = seen.ref;
      seen.ref = null;
      if (ref) {
        flattenRef(ref);
        const refSeen = ctx.seen.get(ref);
        const refSchema = refSeen.schema;
        if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
          schema2.allOf = schema2.allOf ?? [];
          schema2.allOf.push(refSchema);
        } else {
          assignProps(schema2, refSchema);
        }
        assignProps(schema2, _cached);
        const isParentRef = zodSchema._zod.parent === ref;
        if (isParentRef) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (!(key in _cached)) {
              delete schema2[key];
            }
          }
        }
        if (refSchema.$ref && refSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
      const parent = zodSchema._zod.parent;
      if (parent && parent !== ref) {
        flattenRef(parent);
        const parentSeen = ctx.seen.get(parent);
        if (parentSeen?.schema.$ref) {
          schema2.$ref = parentSeen.schema.$ref;
          if (parentSeen.def) {
            for (const key in schema2) {
              if (key === "$ref" || key === "allOf")
                continue;
              if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
                delete schema2[key];
              }
            }
          }
        }
      }
      ctx.override({
        zodSchema,
        jsonSchema: schema2,
        path: seen.path ?? []
      });
    };
    if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
      for (const entry of [...ctx.seen.entries()].reverse()) {
        flattenRef(entry[0]);
      }
      if (ctx.target !== "openapi-3.0") {
        for (const entry of ctx.seen.entries()) {
          compactTypeUnion(entry[1].def ?? entry[1].schema);
        }
      }
      for (const rewrite of ctx.deferred)
        rewrite();
      if (ctx.intersections.length) {
        const carriers = /* @__PURE__ */ new Map();
        for (const seen of ctx.seen.values()) {
          for (const json of [seen.schema, seen.def]) {
            const allOf = json?.allOf;
            if (!Array.isArray(allOf))
              continue;
            const existing = carriers.get(allOf);
            if (existing)
              existing.push(json);
            else
              carriers.set(allOf, [json]);
          }
        }
        for (const allOf of ctx.intersections) {
          for (const json of carriers.get(allOf) ?? [])
            foldIntersection(json);
        }
      }
    }
    const result = {};
    if (ctx.target === "draft-2020-12") {
      result.$schema = "https://json-schema.org/draft/2020-12/schema";
    } else if (ctx.target === "draft-07") {
      result.$schema = "http://json-schema.org/draft-07/schema#";
    } else if (ctx.target === "draft-04") {
      result.$schema = "http://json-schema.org/draft-04/schema#";
    } else if (ctx.target === "openapi-3.0") {
    } else {
    }
    if (ctx.external?.uri) {
      const id = ctx.external.registry.get(schema)?.id;
      if (!id)
        throw new Error("Schema is missing an `id` property");
      result.$id = ctx.external.uri(id);
    }
    assignProps(result, root2.defId ? root2.schema : root2.def ?? root2.schema);
    const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
    if (rootMetaId !== void 0 && result.id === rootMetaId)
      delete result.id;
    const defs = ctx.external?.defs ?? {};
    if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
      for (const entry of ctx.seen.entries()) {
        const seen = entry[1];
        if (seen.def && seen.defId) {
          if (seen.def.id === seen.defId)
            delete seen.def.id;
          assignProp(defs, seen.defId, seen.def);
        }
      }
    }
    if (ctx.external)
      ctx.sharedEmitDoneFor = ctx.external;
    if (ctx.external) {
    } else {
      if (Object.keys(defs).length > 0) {
        if (ctx.target === "draft-2020-12") {
          result.$defs = defs;
        } else {
          result.definitions = defs;
        }
      }
    }
    try {
      const finalized = JSON.parse(JSON.stringify(result));
      Object.defineProperty(finalized, "~standard", {
        value: {
          ...schema["~standard"],
          jsonSchema: {
            input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
            output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
          }
        },
        enumerable: false,
        writable: false
      });
      return finalized;
    } catch (_err) {
      throw new Error("Error converting schema to JSON.");
    }
  }
  function isTransforming(_schema, _ctx) {
    const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
    if (ctx.seen.has(_schema))
      return false;
    ctx.seen.add(_schema);
    const def = _schema._zod.def;
    if (def.type === "transform")
      return true;
    if (def.type === "array")
      return isTransforming(def.element, ctx);
    if (def.type === "set")
      return isTransforming(def.valueType, ctx);
    if (def.type === "lazy")
      return isTransforming(def.getter(), ctx);
    if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault" || def.type === "catch") {
      return isTransforming(def.innerType, ctx);
    }
    if (def.type === "intersection") {
      return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
    }
    if (def.type === "record" || def.type === "map") {
      return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    if (def.type === "pipe") {
      if (_schema._zod.traits.has("$ZodCodec"))
        return true;
      return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
    }
    if (def.type === "object") {
      for (const key in def.shape) {
        if (isTransforming(def.shape[key], ctx))
          return true;
      }
      return false;
    }
    if (def.type === "union") {
      for (const option of def.options) {
        if (isTransforming(option, ctx))
          return true;
      }
      return false;
    }
    if (def.type === "tuple") {
      for (const item of def.items) {
        if (isTransforming(item, ctx))
          return true;
      }
      if (def.rest && isTransforming(def.rest, ctx))
        return true;
      return false;
    }
    return false;
  }
  var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
    const ctx = initializeContext({ ...params, processors });
    processSchema(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
  };
  var createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
    const { libraryOptions, target } = params ?? {};
    const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
    processSchema(schema, ctx);
    extractDefs(ctx, schema);
    return finalize(ctx, schema);
  };

  // node_modules/zod/v4/core/json-schema-processors.js
  var narrowMin = (agg, key, value) => {
    if (agg[key] === void 0 || value > agg[key])
      agg[key] = value;
  };
  var narrowMax = (agg, key, value) => {
    if (agg[key] === void 0 || value < agg[key])
      agg[key] = value;
  };
  var narrowBoth = (agg, value) => {
    narrowMin(agg, "minimum", value);
    narrowMax(agg, "maximum", value);
  };
  var addDivisor = (agg, value) => {
    agg.multipleOf ?? (agg.multipleOf = []);
    if (!agg.multipleOf.includes(value))
      agg.multipleOf.push(value);
  };
  var addPattern = (agg, pattern) => {
    agg.patterns ?? (agg.patterns = /* @__PURE__ */ new Set());
    agg.patterns.add(pattern);
  };
  var intersectMime = (agg, mime) => {
    agg.mime = agg.mime ? agg.mime.filter((m) => mime.includes(m)) : [...mime];
  };
  var setFormat = (agg, format) => {
    agg.format = format;
    if (format.includes("int"))
      agg.isInt = true;
  };
  var minContributor = (agg, def) => narrowMin(agg, "minimum", def.minimum);
  var maxContributor = (agg, def) => narrowMax(agg, "maximum", def.maximum);
  var formatContributor = (ranges) => (agg, def) => {
    setFormat(agg, def.format);
    const [minimum, maximum] = ranges[def.format];
    narrowMin(agg, "minimum", minimum);
    narrowMax(agg, "maximum", maximum);
  };
  var contributors = {
    greater_than: (agg, def) => narrowMin(agg, def.inclusive ? "minimum" : "exclusiveMinimum", def.value),
    less_than: (agg, def) => narrowMax(agg, def.inclusive ? "maximum" : "exclusiveMaximum", def.value),
    multiple_of: (agg, def) => addDivisor(agg, def.value),
    number_format: formatContributor(NUMBER_FORMAT_RANGES),
    bigint_format: formatContributor(BIGINT_FORMAT_RANGES),
    min_length: minContributor,
    max_length: maxContributor,
    length_equals: (agg, def) => narrowBoth(agg, def.length),
    min_size: minContributor,
    max_size: maxContributor,
    size_equals: (agg, def) => narrowBoth(agg, def.size),
    string_format: (agg, def) => {
      setFormat(agg, def.format);
      if (def.pattern)
        addPattern(agg, def.pattern);
      if (def.format === "base64" || def.format === "base64url")
        agg.contentEncoding = def.format;
      if (def.local || def.precision === -1)
        agg.laxFormat = true;
    },
    mime_type: (agg, def) => intersectMime(agg, def.mime)
  };
  function aggregateChecks(schema) {
    const agg = {};
    const def = schema._zod.def;
    const list = schema._zod.traits.has("$ZodCheck") ? [schema, ...def.checks ?? []] : def.checks ?? [];
    for (const ch of list)
      contributors[ch._zod.def.check]?.(agg, ch._zod.def);
    const bag = schema._zod.bag;
    if (bag.minimum !== void 0)
      narrowMin(agg, "minimum", bag.minimum);
    if (bag.exclusiveMinimum !== void 0)
      narrowMin(agg, "exclusiveMinimum", bag.exclusiveMinimum);
    if (bag.maximum !== void 0)
      narrowMax(agg, "maximum", bag.maximum);
    if (bag.exclusiveMaximum !== void 0)
      narrowMax(agg, "exclusiveMaximum", bag.exclusiveMaximum);
    if (bag.multipleOf !== void 0)
      addDivisor(agg, bag.multipleOf);
    if (bag.format !== void 0) {
      agg.format ?? (agg.format = bag.format);
      if (bag.format.includes("int"))
        agg.isInt = true;
    }
    if (bag.mime)
      intersectMime(agg, bag.mime);
    for (const pattern of bag.patterns ?? [])
      addPattern(agg, pattern);
    return agg;
  }
  var formatMap = {
    guid: "uuid",
    url: "uri",
    datetime: "date-time",
    json_string: "json-string",
    regex: ""
    // do not set
  };
  var exactPatterns = /* @__PURE__ */ new Map([
    [base64Charset, base64],
    [base64urlCharset, base64url]
  ]);
  var exactPattern = (p) => exactPatterns.get(p) ?? p;
  var stringProcessor = (schema, ctx, _json, _params) => {
    const json = _json;
    json.type = "string";
    const { minimum, maximum, format, patterns, contentEncoding, laxFormat } = aggregateChecks(schema);
    if (typeof minimum === "number")
      json.minLength = minimum;
    if (typeof maximum === "number")
      json.maxLength = maximum;
    if (format) {
      json.format = formatMap[format] ?? format;
      if (json.format === "")
        delete json.format;
      if (format === "time" || laxFormat) {
        delete json.format;
      }
    }
    if (contentEncoding)
      json.contentEncoding = contentEncoding;
    if (patterns && patterns.size > 0) {
      const patternList = [...patterns].map(exactPattern);
      if (patternList.length === 1)
        json.pattern = patternList[0].source;
      else if (patternList.length > 1) {
        json.allOf = [
          ...patternList.map((regex) => ({
            ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
            pattern: regex.source
          }))
        ];
      }
    }
  };
  var numberProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const { minimum, maximum, multipleOf, exclusiveMaximum, exclusiveMinimum, isInt } = aggregateChecks(schema);
    json.type = isInt ? "integer" : "number";
    const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
    const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
    const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
    if (exMin) {
      if (legacy) {
        json.minimum = exclusiveMinimum;
        json.exclusiveMinimum = true;
      } else {
        json.exclusiveMinimum = exclusiveMinimum;
      }
    } else if (typeof minimum === "number") {
      json.minimum = minimum;
    }
    if (exMax) {
      if (legacy) {
        json.maximum = exclusiveMaximum;
        json.exclusiveMaximum = true;
      } else {
        json.exclusiveMaximum = exclusiveMaximum;
      }
    } else if (typeof maximum === "number") {
      json.maximum = maximum;
    }
    if (multipleOf) {
      const divisors = /* @__PURE__ */ new Set();
      for (const divisor of multipleOf) {
        if (Number.isFinite(divisor) && divisor !== 0)
          divisors.add(Math.abs(divisor));
        else
          handleUnrepresentable(schema, ctx, json, params, `A multipleOf divisor of ${divisor} cannot be represented in JSON Schema`);
      }
      const [first, ...rest] = divisors;
      if (first !== void 0)
        json.multipleOf = first;
      if (rest.length)
        json.allOf = [...json.allOf ?? [], ...rest.map((m) => ({ multipleOf: m }))];
    }
  };
  var booleanProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
  };
  var neverProcessor = (_schema, _ctx, json, _params) => {
    json.not = {};
  };
  var unknownProcessor = (_schema, _ctx, _json, _params) => {
  };
  var enumProcessor = (schema, _ctx, json, _params) => {
    const def = schema._zod.def;
    const values = getEnumValues(def.entries);
    if (values.length === 0) {
      json.not = {};
      return;
    }
    if (values.every((v) => typeof v === "number"))
      json.type = "number";
    if (values.every((v) => typeof v === "string"))
      json.type = "string";
    json.enum = values;
  };
  var customProcessor = (schema, ctx, json, params) => {
    handleUnrepresentable(schema, ctx, json, params, "Custom types cannot be represented in JSON Schema");
  };
  var transformProcessor = (schema, ctx, json, params) => {
    handleUnrepresentable(schema, ctx, json, params, "Transforms cannot be represented in JSON Schema");
  };
  var arrayProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    const { minimum, maximum } = aggregateChecks(schema);
    if (typeof minimum === "number")
      json.minItems = minimum;
    if (typeof maximum === "number")
      json.maxItems = maximum;
    json.type = "array";
    json.items = processSchema(def.element, ctx, {
      ...params,
      path: [...params.path, "items"]
    });
  };
  function inputOptin(schema) {
    const def = schema._zod.def;
    if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) {
      return inputOptin(def.out);
    }
    if (def.type === "catch") {
      return inputOptin(def.innerType);
    }
    return schema._zod.optin;
  }
  var objectProcessor = (schema, ctx, _json, params) => {
    const json = _json;
    const def = schema._zod.def;
    const shape = def.shape;
    const symbolKeys = Object.getOwnPropertySymbols(shape);
    if (symbolKeys.length && handleUnrepresentable(schema, ctx, json, params, "Symbol keys cannot be represented in JSON Schema")) {
      return;
    }
    json.type = "object";
    json.properties = {};
    for (const key in shape) {
      assignProp(json.properties, key, processSchema(shape[key], ctx, {
        ...params,
        path: [...params.path, "properties", key]
      }));
    }
    const requiredKeys = [];
    for (const key of Object.keys(shape)) {
      const field = def.shape[key];
      if (ctx.io === "input" ? inputOptin(field) === void 0 : field._zod.optout === void 0) {
        requiredKeys.push(key);
      }
    }
    if (requiredKeys.length > 0) {
      json.required = requiredKeys;
    }
    if (def.catchall?._zod.def.type === "never") {
      json.additionalProperties = false;
    } else if (!def.catchall) {
      if (ctx.io === "output")
        json.additionalProperties = false;
    } else if (def.catchall) {
      json.additionalProperties = processSchema(def.catchall, ctx, {
        ...params,
        path: [...params.path, "additionalProperties"]
      });
    }
  };
  var unionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const isExclusive = def.inclusive === false;
    const options = def.options.map((x, i) => processSchema(x, ctx, {
      ...params,
      path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
    }));
    if (isExclusive) {
      json.oneOf = options;
    } else {
      json.anyOf = options;
    }
  };
  var intersectionProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const a = processSchema(def.left, ctx, {
      ...params,
      path: [...params.path, "allOf", 0]
    });
    const b = processSchema(def.right, ctx, {
      ...params,
      path: [...params.path, "allOf", 1]
    });
    const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
    const allOf = [
      ...isSimpleIntersection(a) ? a.allOf : [a],
      ...isSimpleIntersection(b) ? b.allOf : [b]
    ];
    json.allOf = allOf;
    ctx.intersections.push(allOf);
  };
  var nullableProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    const inner = processSchema(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    if (ctx.target === "openapi-3.0") {
      seen.ref = def.innerType;
      json.nullable = true;
    } else {
      json.anyOf = [inner, { type: "null" }];
    }
  };
  var nonoptionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    processSchema(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };
  var UNREPRESENTABLE_DEFAULT = /* @__PURE__ */ Symbol();
  function serializeDefaultValue(value, schema, ctx, json, params) {
    let unrepresentable = false;
    const serialized = JSON.stringify(value, (_, val) => {
      if (typeof val !== "bigint")
        return val;
      unrepresentable = true;
      return null;
    });
    if (!unrepresentable)
      return JSON.parse(serialized);
    handleUnrepresentable(schema, ctx, json, params, "BigInt defaults cannot be represented in JSON Schema");
    return UNREPRESENTABLE_DEFAULT;
  }
  var defaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    processSchema(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
    if (value !== UNREPRESENTABLE_DEFAULT)
      json.default = value;
  };
  var prefaultProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    processSchema(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    if (ctx.io !== "input")
      return;
    const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
    if (value !== UNREPRESENTABLE_DEFAULT)
      json._prefault = value;
  };
  var catchProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    processSchema(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    let catchValue;
    try {
      catchValue = def.catchValue(void 0);
    } catch {
      handleUnrepresentable(schema, ctx, json, params, "Dynamic catch values are not supported in JSON Schema");
      return;
    }
    json.default = catchValue;
  };
  var pipeProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    const inIsTransform = def.in._zod.traits.has("$ZodTransform");
    const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
    processSchema(innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = innerType;
  };
  var readonlyProcessor = (schema, ctx, json, params) => {
    const def = schema._zod.def;
    processSchema(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.readOnly = true;
  };
  var optionalProcessor = (schema, ctx, _json, params) => {
    const def = schema._zod.def;
    processSchema(def.innerType, ctx, params);
    const seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };

  // node_modules/zod/v4/classic/errors.js
  var _installedErrorProtos = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
  function _lazyMethod(proto, key, make) {
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        const value = make(this);
        Object.defineProperty(this, key, { value, configurable: true, writable: true });
        return value;
      },
      set(value) {
        Object.defineProperty(this, key, { value, configurable: true, writable: true });
      }
    });
  }
  var initializer2 = (inst, issues) => {
    $ZodError.init(inst, issues);
    inst.name = "ZodError";
    const proto = Object.getPrototypeOf(inst);
    if (_installedErrorProtos.has(proto))
      return;
    _installedErrorProtos.add(proto);
    _lazyMethod(proto, "format", (self) => (mapper) => formatError(self, mapper));
    _lazyMethod(proto, "flatten", (self) => (mapper) => flattenError(self, mapper));
    _lazyMethod(proto, "addIssue", (self) => (issue2) => {
      self.issues.push(issue2);
      self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
    });
    _lazyMethod(proto, "addIssues", (self) => (issues2) => {
      self.issues.push(...issues2);
      self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
    });
    Object.defineProperty(proto, "isEmpty", {
      configurable: true,
      enumerable: false,
      get() {
        return this.issues.length === 0;
      }
    });
  };
  var ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer2, void 0, {
    Parent: Error
  });

  // node_modules/zod/v4/classic/parse.js
  var parse = /* @__PURE__ */ _parse(ZodRealError);
  var parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
  var safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
  var safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  var encode = /* @__PURE__ */ _encode(ZodRealError);
  var decode = /* @__PURE__ */ _decode(ZodRealError);
  var encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
  var decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
  var safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
  var safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
  var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
  var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

  // node_modules/zod/v4/classic/schemas.js
  function _ensureDefaultLocale() {
    if (!globalConfig.localeError)
      config(en_default());
  }
  function _ensureDefaultMemoizer() {
    if (!globalConfig.memoizer)
      config({ memoizer: memoizer() });
  }
  var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    _ensureDefaultLocale();
    $ZodType.init(inst, def);
    inst.def = def;
    inst.type = def.type;
    return inst;
  }, {
    check(...chks) {
      const def = this.def;
      return this.clone(util_exports.mergeDefs(def, {
        checks: [
          ...def.checks ?? [],
          ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }), { parent: true });
    },
    with(...chks) {
      return this.check(...chks);
    },
    clone(def, params) {
      return clone(this, def, params);
    },
    brand() {
      return this;
    },
    register(reg, meta2) {
      reg.add(this, meta2);
      return this;
    },
    refine(check, params) {
      return this.check(refine(check, params));
    },
    superRefine(refinement, params) {
      return this.check(superRefine(refinement, params));
    },
    overwrite(fn) {
      return this.check(_overwrite(fn));
    },
    optional() {
      return optional(this);
    },
    exactOptional() {
      return exactOptional(this);
    },
    nullable() {
      return nullable(this);
    },
    nullish() {
      return optional(nullable(this));
    },
    nonoptional(params) {
      return nonoptional(this, params);
    },
    array() {
      return array(this);
    },
    or(arg) {
      return union([this, arg]);
    },
    and(arg) {
      return intersection(this, arg);
    },
    transform(tx) {
      return pipe(this, transform(tx));
    },
    default(d) {
      return _default(this, d);
    },
    prefault(d) {
      return prefault(this, d);
    },
    catch(params) {
      return _catch(this, params);
    },
    pipe(target) {
      return pipe(this, target);
    },
    readonly() {
      return readonly(this);
    },
    describe(description) {
      const cl = this.clone();
      globalRegistry.add(cl, { description });
      return cl;
    },
    meta(...args) {
      if (args.length === 0)
        return globalRegistry.get(this);
      const cl = this.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    },
    isOptional() {
      return this.safeParse(void 0).success;
    },
    isNullable() {
      return this.safeParse(null).success;
    },
    apply(fn, ...args) {
      return args.length === 0 ? fn(this) : fn(this, ...args);
    },
    // Overrides core's `~standard` to add `jsonSchema`. Must stay a prototype entry: redefining it per instance demotes instances to dictionary mode.
    get "~standard"() {
      return util_exports.hide(this, "~standard", {
        ...standardProps(this),
        jsonSchema: {
          input: createStandardJSONSchemaMethod(this, "input"),
          output: createStandardJSONSchemaMethod(this, "output")
        }
      });
    },
    set "~standard"(value) {
      util_exports.own(this, "~standard", value);
    },
    parse: function _parse2(data, params) {
      return parse(this, data, params, { callee: _parse2 });
    },
    parseAsync: async function _parseAsync2(data, params) {
      return await parseAsync(this, data, params, { callee: _parseAsync2 });
    },
    safeParse(data, params) {
      return safeParse(this, data, params);
    },
    async safeParseAsync(data, params) {
      return safeParseAsync(this, data, params);
    },
    // `spa` is an alias: same function object as `safeParseAsync`, as before.
    get spa() {
      return this?.safeParseAsync;
    },
    set spa(value) {
      util_exports.own(this, "spa", value);
    },
    validate(data, params) {
      return validate(this, data, params);
    },
    validateAsync(data, params) {
      return validateAsync(this, data, params);
    },
    encode: function _encode2(data, params) {
      return encode(this, data, params, { callee: _encode2 });
    },
    decode: function _decode2(data, params) {
      return decode(this, data, params, { callee: _decode2 });
    },
    encodeAsync: async function _encodeAsync2(data, params) {
      return await encodeAsync(this, data, params, { callee: _encodeAsync2 });
    },
    decodeAsync: async function _decodeAsync2(data, params) {
      return await decodeAsync(this, data, params, { callee: _decodeAsync2 });
    },
    safeEncode(data, params) {
      return safeEncode(this, data, params);
    },
    safeDecode(data, params) {
      return safeDecode(this, data, params);
    },
    async safeEncodeAsync(data, params) {
      return safeEncodeAsync(this, data, params);
    },
    async safeDecodeAsync(data, params) {
      return safeDecodeAsync(this, data, params);
    },
    toJSONSchema(params) {
      return createToJSONSchemaMethod(this, {})(params);
    },
    // Reads through to the registry on every access, so it must not cache.
    get description() {
      return globalRegistry.get(this)?.description;
    },
    // No setter: `schema._def = x` throws, as it did when `_def` was a non-writable own property.
    get _def() {
      return this._zod.def;
    }
  });
  var _ZodString = /* @__PURE__ */ $constructor(
    "_ZodString",
    (inst, def) => {
      $ZodString.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
    },
    /* @__PURE__ */ util_exports.derived({
      format: (inst) => aggregateChecks(inst).format ?? null,
      minLength: (inst) => aggregateChecks(inst).minimum ?? null,
      maxLength: (inst) => aggregateChecks(inst).maximum ?? null
    }, {
      regex(...args) {
        return this.check(_regex(...args));
      },
      includes(...args) {
        return this.check(_includes(...args));
      },
      startsWith(...args) {
        return this.check(_startsWith(...args));
      },
      endsWith(...args) {
        return this.check(_endsWith(...args));
      },
      min(...args) {
        return this.check(_minLength(...args));
      },
      max(...args) {
        return this.check(_maxLength(...args));
      },
      length(...args) {
        return this.check(_length(...args));
      },
      nonempty(...args) {
        return this.check(_minLength(1, ...args));
      },
      lowercase(params) {
        return this.check(_lowercase(params));
      },
      uppercase(params) {
        return this.check(_uppercase(params));
      },
      trim() {
        return this.check(_trim());
      },
      normalize(...args) {
        return this.check(_normalize(...args));
      },
      toLowerCase() {
        return this.check(_toLowerCase());
      },
      toUpperCase() {
        return this.check(_toUpperCase());
      },
      slugify() {
        return this.check(_slugify());
      }
    })
  );
  var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
  }, {
    email(params) {
      return this.check(_email(ZodEmail, params));
    },
    url(params) {
      return this.check(_url(ZodURL, params));
    },
    jwt(params) {
      return this.check(_jwt(ZodJWT, params));
    },
    emoji(params) {
      return this.check(_emoji2(ZodEmoji, params));
    },
    guid(params) {
      return this.check(_guid(ZodGUID, params));
    },
    uuid(params) {
      return this.check(_uuid(ZodUUID, params));
    },
    uuidv4(params) {
      return this.check(_uuidv4(ZodUUID, params));
    },
    uuidv6(params) {
      return this.check(_uuidv6(ZodUUID, params));
    },
    uuidv7(params) {
      return this.check(_uuidv7(ZodUUID, params));
    },
    nanoid(params) {
      return this.check(_nanoid(ZodNanoID, params));
    },
    cuid(params) {
      return this.check(_cuid(ZodCUID, params));
    },
    cuid2(params) {
      return this.check(_cuid2(ZodCUID2, params));
    },
    ulid(params) {
      return this.check(_ulid(ZodULID, params));
    },
    base64(params) {
      return this.check(_base64(ZodBase64, params));
    },
    base64url(params) {
      return this.check(_base64url(ZodBase64URL, params));
    },
    xid(params) {
      return this.check(_xid(ZodXID, params));
    },
    ksuid(params) {
      return this.check(_ksuid(ZodKSUID, params));
    },
    ipv4(params) {
      return this.check(_ipv4(ZodIPv4, params));
    },
    ipv6(params) {
      return this.check(_ipv6(ZodIPv6, params));
    },
    cidrv4(params) {
      return this.check(_cidrv4(ZodCIDRv4, params));
    },
    cidrv6(params) {
      return this.check(_cidrv6(ZodCIDRv6, params));
    },
    e164(params) {
      return this.check(_e164(ZodE164, params));
    },
    datetime(params) {
      return this.check(_isoDateTime(ZodISODateTime, params));
    },
    date(params) {
      return this.check(_isoDate(ZodISODate, params));
    },
    time(params) {
      return this.check(_isoTime(ZodISOTime, params));
    },
    duration(params) {
      return this.check(_isoDuration(ZodISODuration, params));
    }
  });
  function string2(params) {
    return _string(ZodString, params);
  }
  var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  var ZodNumber = /* @__PURE__ */ $constructor(
    "ZodNumber",
    (inst, def) => {
      $ZodNumber.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
      inst.isFinite = true;
    },
    /* @__PURE__ */ util_exports.derived({
      minValue: (inst) => {
        const { minimum, exclusiveMinimum } = aggregateChecks(inst);
        return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
      },
      maxValue: (inst) => {
        const { maximum, exclusiveMaximum } = aggregateChecks(inst);
        return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
      },
      isInt: (inst) => {
        const { isInt, multipleOf } = aggregateChecks(inst);
        return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
      },
      format: (inst) => aggregateChecks(inst).format ?? null
    }, {
      gt(value, params) {
        return this.check(_gt(value, params));
      },
      gte(value, params) {
        return this.check(_gte(value, params));
      },
      min(value, params) {
        return this.check(_gte(value, params));
      },
      lt(value, params) {
        return this.check(_lt(value, params));
      },
      lte(value, params) {
        return this.check(_lte(value, params));
      },
      max(value, params) {
        return this.check(_lte(value, params));
      },
      int(params) {
        return this.check(int(params));
      },
      safe(params) {
        return this.check(int(params));
      },
      positive(params) {
        return this.check(_gt(0, params));
      },
      nonnegative(params) {
        return this.check(_gte(0, params));
      },
      negative(params) {
        return this.check(_lt(0, params));
      },
      nonpositive(params) {
        return this.check(_lte(0, params));
      },
      multipleOf(value, params) {
        return this.check(_multipleOf(value, params));
      },
      step(value, params) {
        return this.check(_multipleOf(value, params));
      },
      finite() {
        return this;
      }
    })
  );
  function number2(params) {
    return _number(ZodNumber, params);
  }
  var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
  });
  function int(params) {
    return _int(ZodNumberFormat, params);
  }
  var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
  });
  function boolean2(params) {
    return _boolean(ZodBoolean, params);
  }
  var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
  });
  function unknown() {
    return _unknown(ZodUnknown);
  }
  var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
  });
  function never(params) {
    return _never(ZodNever, params);
  }
  var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    _ensureDefaultMemoizer();
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
    inst.element = def.element;
  }, {
    min(n2, params) {
      return this.check(_minLength(n2, params));
    },
    nonempty(params) {
      return this.check(_minLength(1, params));
    },
    max(n2, params) {
      return this.check(_maxLength(n2, params));
    },
    length(n2, params) {
      return this.check(_length(n2, params));
    },
    unwrap() {
      return this.element;
    }
  });
  function array(element, params) {
    return _array(ZodArray, element, params);
  }
  var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    _ensureDefaultMemoizer();
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
    util_exports.installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
  }, {
    keyof() {
      return _enum(Object.keys(this._zod.def.shape));
    },
    catchall(catchall) {
      return this.clone(util_exports.mergeDefs(this._zod.def, { catchall }));
    },
    passthrough() {
      return this.clone(util_exports.mergeDefs(this._zod.def, { catchall: unknown() }));
    },
    loose() {
      return this.clone(util_exports.mergeDefs(this._zod.def, { catchall: unknown() }));
    },
    strict() {
      return this.clone(util_exports.mergeDefs(this._zod.def, { catchall: never() }));
    },
    strip() {
      return this.clone(util_exports.mergeDefs(this._zod.def, { catchall: void 0 }));
    },
    extend(incoming) {
      return util_exports.extend(this, incoming);
    },
    safeExtend(incoming) {
      return util_exports.safeExtend(this, incoming);
    },
    merge(other) {
      return util_exports.merge(this, other);
    },
    pick(mask) {
      return util_exports.pick(this, mask);
    },
    omit(mask) {
      return util_exports.omit(this, mask);
    },
    partial(...args) {
      return util_exports.partial(ZodOptional, this, args[0]);
    },
    exactPartial(...args) {
      return util_exports.partial(ZodExactOptional, this, args[0], "exactPartial");
    },
    required(...args) {
      return util_exports.required(ZodNonOptional, this, args[0]);
    }
  });
  function object(shape, params) {
    const def = {
      type: "object",
      shape: shape ?? {},
      ...util_exports.normalizeParams(params)
    };
    return new ZodObject(def);
  }
  var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
  });
  function union(options, params) {
    return new ZodUnion({
      type: "union",
      options,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
  });
  function intersection(left, right) {
    return new ZodIntersection({
      type: "intersection",
      left,
      right
    });
  }
  var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
    inst.enum = def.entries;
    inst.options = [...inst._zod.values];
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...util_exports.normalizeParams(params),
        entries: newEntries
      });
    };
    inst.exclude = (values, params) => {
      const newEntries = { ...def.entries };
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...util_exports.normalizeParams(params),
        entries: newEntries
      });
    };
  });
  function _enum(values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new ZodEnum({
      type: "enum",
      entries,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    _ensureDefaultMemoizer();
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      payload.addIssue = (issue2) => {
        if (typeof issue2 === "string") {
          payload.issues.push(util_exports.issue(issue2, payload.value, def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          if (!("input" in _issue))
            _issue.input = payload.value;
          _issue.inst ?? (_issue.inst = inst);
          payload.issues.push(util_exports.issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      payload.value = output;
      return payload;
    };
  });
  function transform(fn) {
    return new ZodTransform({
      type: "transform",
      transform: fn
    });
  }
  var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function optional(innerType) {
    return new ZodOptional({
      type: "optional",
      innerType
    });
  }
  var ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
    $ZodExactOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function exactOptional(innerType) {
    return new ZodExactOptional({
      type: "optional",
      innerType
    });
  }
  var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nullable(innerType) {
    return new ZodNullable({
      type: "nullable",
      innerType
    });
  }
  var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  function _default(innerType, defaultValue) {
    return new ZodDefault({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
      }
    });
  }
  var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function prefault(innerType, defaultValue) {
    return new ZodPrefault({
      type: "prefault",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
      }
    });
  }
  var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nonoptional(innerType, params) {
    return new ZodNonOptional({
      type: "nonoptional",
      innerType,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  function _catch(innerType, catchValue) {
    return new ZodCatch({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : util_exports.constantCatch(catchValue)
    });
  }
  var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
  });
  function pipe(in_, out) {
    return new ZodPipe({
      type: "pipe",
      in: in_,
      out
      // ...util.normalizeParams(params),
    });
  }
  var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function readonly(innerType) {
    return new ZodReadonly({
      type: "readonly",
      innerType
    });
  }
  var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
  });
  function refine(fn, _params = {}) {
    return _refine(ZodCustom, fn, _params);
  }
  function superRefine(fn, params) {
    return _superRefine(fn, params);
  }

  // src/lib/profile.ts
  var REGIONS = {
    us: "United States",
    canada: "Canada",
    uk: "United Kingdom",
    europe: "Europe (EU/EEA, Switzerland)",
    asia: "Asia",
    australia_nz: "Australia & New Zealand",
    middle_east: "Middle East",
    africa: "Africa",
    latin_america: "Latin America"
  };
  var s = () => string2().nullable();
  var n = () => number2().nullable();
  var Education = object({
    institution: string2(),
    degree: s(),
    // "B.Sc", "HND", "MBA"
    field: s(),
    country: s(),
    start: s(),
    // "2012" or "2012-09"
    end: s(),
    grade: s(),
    // as written: "Second Class Upper", "3.6/4.0", "4.2/5.0"
    gpa: n(),
    gpa_scale: n()
  });
  var Work = object({
    company: string2(),
    role: string2(),
    start: s(),
    end: s(),
    // null = current
    location: s(),
    highlights: array(string2())
    // achievements, with numbers where the source has them
  });
  var Test = object({
    name: _enum(["GRE", "GMAT", "SAT", "ACT", "TOEFL", "IELTS", "Duolingo", "Other"]),
    status: _enum(["taken", "booked", "planned", "not_planned"]),
    score: s(),
    date: s()
  });
  var Story = object({
    title: string2(),
    // short handle: "grew vendy merchant base"
    summary: string2(),
    // what happened, what they did
    metrics: array(string2())
  });
  var Profile = object({
    identity: object({
      full_name: s(),
      citizenship: s(),
      country_of_residence: s(),
      city: s()
    }),
    education: array(Education),
    work: array(Work),
    tests: array(Test),
    english: object({
      route: _enum(["test", "waiver", "undecided"]).nullable(),
      // waiver = medium-of-instruction letter
      notes: s()
    }),
    goals: object({
      study_level: _enum(["undergraduate", "masters", "phd"]).nullable(),
      fields: array(string2()).nullable(),
      // null = not asked yet. for undergrads: intended majors
      research_interests: array(string2()).nullable(),
      // phd (and research masters)
      degree_types: array(string2()).nullable(),
      target_term: s(),
      short_term_goal: s(),
      long_term_goal: s(),
      why_masters: s(),
      // "why this degree, why now" at any level (key kept for stored data)
      gmat_gre_plan: _enum(["will_take", "avoid", "undecided"]).nullable()
    }),
    funding: object({
      need: _enum(["full", "partial", "self"]).nullable(),
      annual_budget_usd: n(),
      // what they can cover per year
      application_fee_budget_usd: n(),
      notes: s()
    }),
    preferences: object({
      regions: array(string2()).nullable(),
      // REGIONS keys; null = not asked
      locations: array(string2()).nullable(),
      // specific countries/cities. [] = no preference, null = not asked
      avoid: array(string2()).nullable(),
      stem_preferred: boolean2().nullable(),
      max_applications: n()
    }),
    recommenders: object({
      count_lined_up: n(),
      notes: s()
    }),
    stories: array(Story),
    skills: array(string2()),
    notes: array(string2()),
    // facts the user picked when sources disagreed. authoritative: agents never override these.
    confirmed_facts: array(object({ topic: string2(), value: string2() })),
    // gap keys the user answered without a clean value ("the budget decides"). never asked again.
    skipped_gaps: array(string2())
  });
  var ProfilePatch = object({
    identity: Profile.shape.identity.optional(),
    education: array(Education).optional(),
    work: array(Work).optional(),
    tests: array(Test).optional(),
    english: Profile.shape.english.optional(),
    goals: Profile.shape.goals.optional(),
    funding: Profile.shape.funding.optional(),
    preferences: Profile.shape.preferences.optional(),
    recommenders: Profile.shape.recommenders.optional(),
    stories: array(Story).optional(),
    skills: array(string2()).optional(),
    notes: array(string2()).optional(),
    skipped_gaps: array(string2()).optional()
  });
  var SCALAR_FIELDS = [
    "identity.full_name",
    "identity.citizenship",
    "identity.country_of_residence",
    "identity.city",
    "english.route",
    "english.notes",
    "goals.study_level",
    "goals.target_term",
    "goals.short_term_goal",
    "goals.long_term_goal",
    "goals.why_masters",
    "goals.gmat_gre_plan",
    "funding.need",
    "funding.annual_budget_usd",
    "funding.application_fee_budget_usd",
    "funding.notes",
    "preferences.stem_preferred",
    "preferences.max_applications",
    "recommenders.count_lined_up",
    "recommenders.notes"
  ];
  var LIST_FIELDS = [
    "goals.fields",
    "goals.research_interests",
    "goals.degree_types",
    "preferences.regions",
    "preferences.locations",
    "preferences.avoid",
    "skills",
    "notes",
    "skipped_gaps"
  ];
  var WirePatch = object({
    facts: array(object({ field: _enum(SCALAR_FIELDS), value: string2() })),
    lists: array(object({ field: _enum(LIST_FIELDS), values: array(string2()) })),
    education: array(object({
      institution: string2(),
      degree: string2(),
      field: string2(),
      country: string2(),
      start: string2(),
      end: string2(),
      grade: string2(),
      gpa: string2(),
      gpa_scale: string2()
    })),
    work: array(object({
      company: string2(),
      role: string2(),
      start: string2(),
      end: string2(),
      location: string2(),
      highlights: array(string2())
    })),
    tests: array(object({
      name: _enum(["GRE", "GMAT", "SAT", "ACT", "TOEFL", "IELTS", "Duolingo", "Other"]),
      status: _enum(["taken", "booked", "planned", "not_planned"]),
      score: string2(),
      date: string2()
    })),
    stories: array(object({ title: string2(), summary: string2(), metrics: array(string2()) }))
  });
  var WIRE_GUIDE = `patch format: every field is required. use "" for unknown, [] for nothing to add.
- facts: scalar fields you learned. value is a string. numbers as plain digits ("15000"). booleans "yes"/"no".
  enums: goals.study_level undergraduate|masters|phd, english.route test|waiver|undecided, goals.gmat_gre_plan will_take|avoid|undecided (about admissions tests at their level), funding.need full|partial|self.
- lists: list fields. preferences.locations with values [] means "no preference".
  preferences.regions values must be keys from: ${Object.keys(REGIONS).join(", ")}.
  skipped_gaps: gap keys (like "preferences.max_applications") the user answered without a clean value; record their answer in notes.
- education / work / tests / stories: items to add or update. work.end "" means current role.`;

  // src/lib/portal-fields.ts
  var PNTS = "Prefer not to say";
  var YN_PNTS = ["Yes", "No", PNTS];
  var EDUCATION = ["No formal education", "Primary school", "Secondary / high school", "Vocational or technical", "Some university", "Bachelor's degree", "Master's degree", "Doctorate or professional degree", "Don't know"];
  var DETAIL_GROUPS = [
    {
      id: "contact",
      title: "Contact and identity",
      why: "Every portal starts here.",
      fields: [
        { key: "legal_first_name", label: "Legal first name", hint: "Exactly as on your passport" },
        { key: "legal_middle_name", label: "Middle name(s)", hint: "Leave empty if you have none" },
        { key: "legal_last_name", label: "Legal last name (surname)" },
        { key: "email", label: "Email for applications", kind: "email", required: true },
        { key: "phone", label: "Phone (with country code)", kind: "tel", required: true },
        { key: "date_of_birth", label: "Date of birth", kind: "date", required: true },
        { key: "title", label: "Title", kind: "select", options: ["Mr", "Ms", "Mrs", "Mx", "Dr", "None"] },
        { key: "preferred_name", label: "Preferred first name" },
        { key: "other_names", label: "Other or previous names", hint: "A maiden name, or names on old transcripts" },
        { key: "gender", label: "Gender", kind: "select", options: ["Male", "Female", "Non-binary", "Another gender", PNTS] },
        { key: "pronouns", label: "Pronouns", kind: "select", options: ["he/him", "she/her", "they/them", "Another", PNTS] },
        { key: "marital_status", label: "Marital status", kind: "select", options: ["Single", "Married", "Divorced", "Widowed", "Separated", PNTS] },
        { key: "linkedin", label: "LinkedIn URL", kind: "url" },
        { key: "website", label: "Website or portfolio", kind: "url" }
      ]
    },
    {
      id: "address",
      title: "Address",
      why: "Your permanent address. Portals send offers and visa letters here.",
      fields: [
        { key: "address_line1", label: "Address line 1", required: true },
        { key: "address_line2", label: "Address line 2" },
        { key: "city", label: "City", required: true },
        { key: "state", label: "State / province" },
        { key: "postal_code", label: "Postal code" },
        { key: "country", label: "Country", required: true },
        { key: "mailing_address", label: "Mailing address, if different", kind: "long" },
        { key: "hometown", label: "Hometown (where you grew up)" }
      ]
    },
    {
      id: "citizenship",
      title: "Citizenship and travel",
      why: "Decides visa questions and which scholarships you qualify for.",
      fields: [
        { key: "country_of_birth", label: "Country of birth" },
        { key: "city_of_birth", label: "City of birth" },
        { key: "second_citizenship", label: "Second citizenship, if any" },
        { key: "passport_country", label: "Country that issued your passport" },
        { key: "passport_expiry", label: "Passport expiry date", kind: "date", hint: "Not the number: that stays with you" },
        { key: "current_visa", label: "Current visa or residence status", hint: "e.g. none, F-1 student, UK Skilled Worker, permanent resident" },
        { key: "studied_in_country_before", label: "Studied in the country you're applying to before?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "previous_visa_refusal", label: "Ever been refused a visa?", kind: "yes_no", options: YN_PNTS },
        { key: "visa_overstay", label: "Ever stayed in a country longer than your visa allowed?", kind: "yes_no", options: YN_PNTS },
        { key: "travelled_abroad", label: "Travelled outside your country before?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "dependants_travelling", label: "Will a spouse or children come with you?", kind: "yes_no", options: ["Yes", "No", "Not sure yet"] },
        { key: "family_in_destination", label: "Family living in the country you'd study in?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "housing_plan", label: "Where you'd like to live", kind: "select", options: ["University housing", "Off campus", "With family", "Not sure yet"] }
      ]
    },
    {
      id: "languages",
      title: "Languages",
      why: "Portals ask these to decide English test requirements.",
      fields: [
        { key: "first_language", label: "First language" },
        { key: "home_language", label: "Language spoken most at home" },
        { key: "other_languages", label: "Other languages, with level", hint: "e.g. French (fluent), Yoruba (native)" },
        { key: "english_medium_education", label: "Was your degree taught in English?", kind: "yes_no", options: ["Yes", "No"] }
      ]
    },
    {
      id: "study_plans",
      title: "How you want to study",
      why: "Portals ask this on the first page, and it filters programs.",
      fields: [
        { key: "study_mode", label: "How you want to study", kind: "select", options: ["On campus", "Online", "Hybrid", "Any of these"] },
        { key: "attendance", label: "Full-time or part-time", kind: "select", options: ["Full-time", "Part-time", "Either"] },
        { key: "entry_route", label: "Direct entry or a foundation year first?", kind: "select", options: ["Direct entry", "Foundation year", "Either"], levels: ["undergraduate"] },
        { key: "transfer_student", label: "Transferring from another university?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "second_choice_field", label: "Second-choice subject, if your first is full", hint: "Many forms ask for one" },
        { key: "contacted_department", label: "Spoken to anyone at a department or a potential supervisor?", kind: "long", hint: "Who and when. Leave empty if not yet" }
      ]
    },
    {
      id: "school_record",
      title: "Your school record",
      why: "The questions behind your grades. Honest answers here avoid surprises later.",
      fields: [
        { key: "class_rank", label: "Class rank, if your school gives one", hint: "e.g. 3 of 120, top 5%", levels: ["undergraduate"] },
        { key: "strongest_subjects", label: "Your strongest subjects" },
        { key: "weakest_subjects", label: "The subject you find hardest", levels: ["undergraduate"] },
        { key: "repeated_year", label: "Ever repeated a class or academic year?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "education_gap", label: "Any break in your education (a year or more)?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "education_gap_reason", label: "What you did during the break", kind: "long", hint: "Work, family, health, exams again: a line is enough" },
        { key: "transferred_schools", label: "Moved schools or universities part-way through?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "academic_probation", label: "Ever been on academic probation?", kind: "yes_no", options: YN_PNTS },
        { key: "awaiting_results", label: "Any results you're still waiting for?", hint: "Which exam, and when they come out" },
        { key: "retaking_tests", label: "Planning to retake any exam or test?", hint: "Which, and when" },
        { key: "instruction_language_school", label: "Language your last school taught in" },
        { key: "years_in_english", label: "Years of study taught in English", kind: "select", options: ["None", "1 to 2", "3 to 4", "5 or more", "All my education"] }
      ]
    },
    {
      id: "money",
      title: "Paying for it",
      why: "Scholarship forms and visa letters ask exactly this.",
      fields: [
        { key: "sponsor_name", label: "Who will sponsor you (name or organisation)", hint: "Leave empty if you're paying yourself" },
        { key: "sponsor_relationship", label: "Their relationship to you", kind: "select", options: ["Parent", "Other family", "Employer", "Government", "Scholarship body", "Myself", "Other"] },
        { key: "funds_available", label: "Money you can show per year (tuition + living)", kind: "select", options: ["Under $5,000", "$5,000 to $15,000", "$15,000 to $30,000", "$30,000 to $50,000", "Over $50,000", "I need full funding", PNTS] },
        { key: "receiving_aid_now", label: "Do you have a scholarship or grant right now?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "other_scholarships", label: "Other scholarships you've applied for or won", kind: "long", hint: "Name, year, result" },
        { key: "need_statement", label: "Why you need funding, in your words", kind: "long", hint: "Used for need-based aid and fee waiver requests. A few honest sentences" }
      ]
    },
    {
      id: "support",
      title: "Support at university",
      why: "Optional. Only shared with a school's disability or support office when a form asks.",
      fields: [
        { key: "accessibility_needs", label: "Would you like support or adjustments for a disability, condition or learning difference?", kind: "yes_no", options: YN_PNTS },
        { key: "accessibility_details", label: "What would help", kind: "long", hint: "Only if you'd like schools to know" }
      ]
    },
    {
      id: "story",
      title: "Your story",
      why: "The material your essays are written from. Ivyward AI asks these in conversation.",
      fields: [
        { key: "three_words", label: "Three words that describe you", ask: "if your closest friend had to describe you in three words, what would they say?" },
        { key: "proudest_achievement", label: "What you're most proud of", kind: "long" },
        { key: "challenge_overcome", label: "A challenge you overcame", kind: "long" },
        { key: "failure_lesson", label: "A time something went wrong, and what you learned", kind: "long" },
        { key: "leadership_moment", label: "A time you led others", kind: "long" },
        { key: "teamwork_disagreement", label: "A time you worked through a disagreement", kind: "long" },
        { key: "intellectual_spark", label: "The idea, book or problem that got you hooked on your field", kind: "long" },
        { key: "problem_to_solve", label: "A problem you want to help solve", kind: "long" },
        { key: "community_impact", label: "Something you did that helped other people", kind: "long" },
        { key: "not_in_grades", label: "Something about you that isn't in your grades", kind: "long" },
        { key: "circumstances", label: "Circumstances that affected your studies, if any", kind: "long", hint: "Optional: family duties, work, health, money. Used only if you want it mentioned" },
        { key: "anything_else", label: "Anything else admissions should know", kind: "long" }
      ]
    },
    {
      id: "background",
      title: "Background",
      why: "Optional. Many schools ask for statistics, and some scholarships are for particular groups. Answer only what you want to.",
      fields: [
        { key: "race_ethnicity", label: "Race or ethnicity", kind: "select", options: ["Black or African", "African American", "White", "Asian", "South Asian", "East Asian", "Southeast Asian", "Middle Eastern or North African", "Hispanic or Latino", "Indigenous", "Pacific Islander", "Mixed or multiple", "Another", PNTS] },
        { key: "hispanic_latino", label: "Hispanic or Latino?", kind: "yes_no", options: YN_PNTS },
        { key: "religion", label: "Religion or faith", kind: "select", options: ["Christian", "Muslim", "Jewish", "Hindu", "Buddhist", "Sikh", "Traditional or indigenous faith", "Another", "None", PNTS] },
        { key: "disability", label: "Do you have a disability or long-term condition?", kind: "yes_no", options: YN_PNTS, hint: "Schools use this to offer support, never to judge your application" },
        { key: "lgbtq", label: "Do you identify as LGBTQ+?", kind: "yes_no", options: YN_PNTS },
        { key: "military_service", label: "Military or national service", kind: "select", options: ["None", "Completed national service (e.g. NYSC)", "Veteran", "Currently serving", PNTS] },
        { key: "first_generation", label: "First in your family to go to university?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "refugee_or_displaced", label: "Refugee or displaced person?", kind: "yes_no", options: YN_PNTS }
      ]
    },
    {
      id: "family",
      title: "Family",
      why: "Asked on most undergraduate and many graduate forms; also opens need-based and first-generation awards.",
      fields: [
        { key: "parent1_relationship", label: "Parent or guardian 1", kind: "select", options: ["Mother", "Father", "Guardian", "Other"] },
        { key: "parent1_education", label: "Their highest education", kind: "select", options: EDUCATION },
        { key: "parent1_occupation", label: "Their occupation" },
        { key: "parent2_relationship", label: "Parent or guardian 2", kind: "select", options: ["Mother", "Father", "Guardian", "Other", "None"] },
        { key: "parent2_education", label: "Their highest education", kind: "select", options: EDUCATION },
        { key: "parent2_occupation", label: "Their occupation" },
        { key: "parent1_name", label: "Parent or guardian 1: full name", levels: ["undergraduate"] },
        { key: "parent1_email", label: "Parent or guardian 1: email", kind: "email", levels: ["undergraduate"] },
        { key: "parent2_name", label: "Parent or guardian 2: full name", levels: ["undergraduate"] },
        { key: "parent2_email", label: "Parent or guardian 2: email", kind: "email", levels: ["undergraduate"] },
        { key: "family_alumni", label: "Did a family member study at any school you're applying to?", kind: "long", hint: "Who, which school, which years. Leave empty if none" },
        { key: "siblings", label: "Number of siblings" },
        { key: "dependents", label: "Children or other dependents", kind: "select", options: ["None", "1", "2", "3 or more", PNTS] },
        { key: "household_income", label: "Household income per year (USD)", kind: "select", options: ["Under $10,000", "$10,000 to $25,000", "$25,000 to $50,000", "$50,000 to $100,000", "Over $100,000", PNTS] }
      ]
    },
    {
      id: "interests",
      title: "Interests and activities",
      why: "What essays, interviews and scholarships are made of. A line each is enough.",
      fields: [
        { key: "hobbies", label: "Hobbies", kind: "long", hint: "What you do for fun, and how seriously" },
        { key: "interests", label: "Interests and causes you care about", kind: "long" },
        { key: "sports", label: "Sports, and at what level", hint: "e.g. football, university first team" },
        { key: "arts_music", label: "Arts, music, writing or performance" },
        { key: "volunteering", label: "Volunteering and community work", kind: "long", hint: "Where, what you did, roughly how long" },
        { key: "leadership", label: "Clubs, societies and leadership roles", kind: "long" },
        { key: "awards", label: "Awards, competitions and honours", kind: "long", hint: "Name, year, and what it was for" },
        { key: "skills", label: "Skills and certifications", kind: "long", hint: "Software, tools, licences, courses" },
        { key: "publications", label: "Publications, projects or patents", kind: "long" }
      ]
    },
    {
      id: "application",
      title: "Application questions",
      why: "The yes/no and housekeeping questions near the end of most forms.",
      fields: [
        { key: "how_heard", label: "How you heard about the schools", kind: "select", options: ["Search engine", "School website", "Social media", "Friend or family", "Alumni", "Education fair", "Rankings", "Employer"] },
        { key: "funding_source", label: "How you'll pay for your studies", kind: "select", options: ["Scholarship or funding", "Family", "Personal savings", "Employer sponsorship", "Loan", "A mix of these"] },
        { key: "employer_sponsored", label: "Is an employer sponsoring you?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "previously_applied", label: "Applied to any of these schools before?", hint: "Which, and when" },
        { key: "disciplinary_history", label: "Ever had academic or disciplinary action at school or university?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "criminal_history", label: "Ever been convicted of a criminal offence?", kind: "yes_no", options: ["Yes", "No"] },
        { key: "emergency_contact_name", label: "Emergency contact name" },
        { key: "emergency_contact_relationship", label: "Their relationship to you" },
        { key: "emergency_contact_phone", label: "Their phone", kind: "tel" },
        { key: "emergency_contact_email", label: "Their email", kind: "email" }
      ]
    }
  ];
  var PORTAL_DETAIL_FIELDS = DETAIL_GROUPS.flatMap((g) => g.fields);

  // src/lib/fillsheet.ts
  var DIAL = ["1", "7", "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49", "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98", "211", "212", "213", "216", "218", "220", "221", "222", "223", "224", "225", "226", "227", "228", "229", "230", "231", "232", "233", "234", "235", "236", "237", "238", "239", "240", "241", "242", "243", "244", "245", "246", "248", "249", "250", "251", "252", "253", "254", "255", "256", "257", "258", "260", "261", "262", "263", "264", "265", "266", "267", "268", "269", "290", "291", "297", "298", "299", "350", "351", "352", "353", "354", "355", "356", "357", "358", "359", "370", "371", "372", "373", "374", "375", "376", "377", "378", "380", "381", "382", "383", "385", "386", "387", "389", "420", "421", "423", "852", "853", "855", "856", "880", "886", "960", "961", "962", "963", "964", "965", "966", "967", "968", "970", "971", "972", "973", "974", "975", "976", "977", "992", "993", "994", "995", "996", "998"].sort((a, b) => b.length - a.length);
  var LABEL_RULES = [
    // yes/no: is the mailing address another one (before the address-part rules below)
    [/\b(mailing|postal|correspondence|current)\s+address\b.{0,40}\b(different|differ)\b|\bdifferent\s+(mailing|postal|correspondence)\s+address\b/i, "mailing_differs"],
    [/\b(mailing|postal|correspondence)\s+address\b.{0,40}\bsame as\b|\bsame as (my |your )?(permanent|home|current|residential) address\b/i, "mailing_same"],
    // first, before the name rules: its label says "last name". a user id the portal wants built from the name: calgary's "eID first.last"
    [/\bfirst(\s*name)?\s*\.\s*last(\s*name)?\b|\bfirstname\.lastname\b/i, "username_first_last"],
    // words forms use for the same thing: tried before the general rules below. most specific first.
    [/\bemergency\s*contact.*\b(phone|number|tel|mobile)\b/i, "emergency_contact_phone"],
    [/\bemergency\s*contact.*\be-?mail\b/i, "emergency_contact_email"],
    [/\bemergency\s*contact.*\brelation/i, "emergency_contact_relationship"],
    [/\bemergency\s*contact/i, "emergency_contact_name"],
    [/\b(country|dial(l?ing)?|international|area)\s*(phone\s*)?code\b|\bphone\s*prefix\b|\bcalling code\b/i, "phone_country_code"],
    [/\b(fore\s*names?|given\s*names?|christian\s*name)\b/i, "first_name"],
    [/\b(family\s*name|last\s*names?|surname)\b/i, "last_name"],
    [/^(?!.*\b(job|position|course|programme|program|thesis|dissertation)\b).*\b(salutation|honorific|title)\s*\*?\s*$|^\s*(salutation|title)\b(?!.*\b(job|course)\b)/i, "title"],
    [/\b(nationality|citizen(ship)?|passport\s*country|country\s*of\s*citizenship)\b/i, "citizenship"],
    [/\b(sex|gender|gender identity|legal sex|sex at birth)\b/i, "gender"],
    [/\bis english your (first|native|main)\b|english.*\b(first|native|mother|main)\b.{0,10}(language|tongue)/i, "english_first_language"],
    [/\b(first|native|mother|home|main)\s*(language|tongue)\b|\blanguage\s*(spoken\s*)?(most\s*)?(at\s*home|often)\b/i, "first_language"],
    [/^(?!.*\b(no|none|don.?t have|do not have)\b).*\b(mobile|cell(ular)?|telephone|phone|contact\s*number|tel\.?|whats\s*app)\b/i, "phone"],
    [/\bmarital\s*status|civil\s*status\b/i, "marital_status"],
    [/\b(ethnic|ethnicity|race)\b/i, "race_ethnicity"],
    [/\breligio|\bfaith\b/i, "religion"],
    [/\bdisabilit|special\s*(needs|requirements)|learning\s*difficult/i, "disability"],
    [/\b(city|town|place)\s*of\s*birth\b/i, "city_of_birth"],
    [/\bhow\s*did\s*you\s*(hear|find|learn)|where\s*did\s*you\s*hear|source\s*of\s*(information|referral)/i, "how_heard"],
    [/\bpronoun/i, "pronouns"],
    [/\b(post\s*code|postcode|zip(\s*code)?|postal\s*code)\b/i, "postal_code"],
    [/^\s*(country|country\s*\/\s*region|country or region|country of (residence|domicile))\s*\*?\s*$/i, "country"],
    [/^(?!.*\bcountry\b).*\b(county|state|province|region)\s*(\/\s*(state|province|county))?\s*\*?\s*$/i, "state"],
    [/\b(re-?enter|confirm|verify)\b.*e-?mail/i, "email"],
    [/\b(first|given)\s*name/i, "first_name"],
    [/\bmiddle\s*name/i, "middle_name"],
    [/\b(last|family|sur)\s*name|surname/i, "last_name"],
    [/\bpreferred\s*(first\s*)?name|nick\s*name/i, "preferred_name"],
    [/^\s*(full\s*)?(legal\s*)?name\s*\*?\s*$/i, "full_name"],
    [/e-?mail/i, "email"],
    [/\b(birth|dob)\w*\b.*\b(month|mm|m)\s*\*?$|\bbirth\s*month\b/i, "dob_month"],
    [/\b(birth|dob)\w*\b.*\b(day|dd|d)\s*\*?$|\bbirth\s*day\b/i, "dob_day"],
    [/\b(birth|dob)\w*\b.*\b(year|yyyy|y)\s*\*?$|\bbirth\s*year\b/i, "dob_year"],
    [/\b(date\s*of\s*birth|birth\s*date|birthdate|dob)\b/i, "date_of_birth"],
    [/\b(user\s*(id|name)|login\s*(id|name)|choose a (user|login)|identifiant|nom d.utilisateur|e-?id)\b/i, "username"],
    [/\bcitizenship|nationality\b/i, "citizenship"],
    [/\b(country|region)\s*(\/\s*region\s*)?of\s*birth|birth\s*(country|place)|place of birth/i, "country_of_birth"],
    [/\bpermanent\s*residen|country\s*of\s*domicile|domicile/i, "country_of_residence"],
    [/\b(application|applicant|admission|admit)\s+type\b|type of (application|applicant|admission)/i, "application_type"],
    [/applying (for myself|using an (education )?agent|through an agent)|education agent|use an agent|who are you applying for/i, "applying_as"],
    [/\b(permanent code|code permanent)\b/i, "has_quebec_code"],
    [/\bdo you (have|hold) (a|an|your)?\s*[\w .'&-]{0,40}\b(student|id|identification|matriculation)\s*(number|no\.?|#)/i, "has_school_id"],
    [/\b(mode of study|study mode|attendance mode|full.?time or part.?time|part.?time or full.?time)\b|^\s*full.?time\s+part.?time\s*$|^\s*part.?time\s+full.?time\s*$/i, "study_mode"],
    [/\b(do you|will you) (require|need) a (student )?visa|\bvisa (required|needed)|require a visa/i, "visa_required"],
    [/\b(start date|intake|entry (date|point|month)|course start|commenc|when (do|would) you (like|want|intend) to start)/i, "entry_start"],
    [/\bcountry\s*of\s*(permanent\s*)?residen/i, "country_of_residence"],
    // "Mailing Address Country", "Mailing Address City" (ut dallas): the part named at the end wins over "address"
    [/\b(address|mailing|home|current|permanent|residential|contact|postal)\b.*\bcountry\s*\*?\s*$/i, "country"],
    [/\b(address|mailing|home|current|permanent|residential|contact)\b.*\b(city|town)\s*\*?\s*$/i, "city"],
    [/\b(address|mailing|home|current|permanent|residential|contact)\b.*\b(state|province|county|region)\s*\*?\s*$/i, "state"],
    [/\b(address|mailing|home|current|permanent|residential|contact)\b.*\b(zip|postal|post)\s*code\s*\*?\s*$/i, "postal_code"],
    [/\b(address|street)\b.*\b(2|two|line\s*2)\b/i, "address_line2"],
    [/\b(street|address)(\s*line\s*1)?\b/i, "address_line1"],
    [/\b(city|town)\b/i, "city"],
    [/^(?!.*\bcountry\b).*\b(state|province|region)\b/i, "state"],
    [/\b(zip|postal|post)\s*code\b/i, "postal_code"],
    [/^\s*country\s*\*?\s*$/i, "country"],
    [/linkedin/i, "linkedin"],
    [/\b(personal\s*)?(website|portfolio)\b/i, "website"],
    [/\b(entry|start|intended)\s*(term|semester|session)\b/i, "entry_term"],
    [/\bentry\s*year|start\s*year\s*of\s*study/i, "entry_year"],
    [/\b(program|programme)\s*(of\s*interest|name)?\b/i, "program"],
    [/\b(institution|university|college|school)\s*(name|attended)?\b/i, "edu1_institution"],
    [/\b(major|field\s*of\s*study|concentration|discipline)\b/i, "edu1_major"],
    [/\b(degree\s*(earned|awarded|obtained|type)?)\b/i, "edu1_degree"],
    [/\bgpa\s*scale|out\s*of\b/i, "edu1_gpa_scale"],
    [/\b(gpa|cgpa|grade\s*point)\b/i, "edu1_gpa"],
    [/\b(class\s*of\s*degree|classification|final\s*grade)\b/i, "edu1_grade"],
    [/\b(graduation|completion)\s*(date|year)\b/i, "edu1_end_year"],
    [/\b(employer|company|organi[sz]ation)\b/i, "work1_employer"],
    [/\b(job\s*title|position|role)\b/i, "work1_title"],
    [/\byears\s*of\s*(full[-\s]*time\s*)?(work\s*)?experience\b/i, "years_of_experience"],
    [/\bgre\b.*\bscore|\bgre\b/i, "gre_score"],
    [/\bgmat\b/i, "gmat_score"],
    [/\btoefl\b/i, "toefl_score"],
    [/\bielts\b/i, "ielts_score"],
    [/\bduolingo\b/i, "duolingo_score"]
  ];
  var REC = /\b(recommender|referee|reference|recommendation)\s*#?\s*(\d)\b/i;
  function keyForLabel(label) {
    const l = label.replace(/\s+/g, " ").trim();
    if (!l) return null;
    const rec = l.match(REC);
    if (rec) {
      const n2 = rec[2];
      if (/e-?mail/i.test(l)) return `rec${n2}_email`;
      if (/first/i.test(l)) return `rec${n2}_first_name`;
      if (/last|sur/i.test(l)) return `rec${n2}_last_name`;
      if (/title|position/i.test(l)) return `rec${n2}_title`;
      if (/organi|institution|company|employer/i.test(l)) return `rec${n2}_organization`;
      if (/relationship/i.test(l)) return `rec${n2}_relationship`;
      if (/phone/i.test(l)) return `rec${n2}_phone`;
      if (/name/i.test(l)) return `rec${n2}_name`;
      return null;
    }
    for (const [re, key] of LABEL_RULES) if (re.test(l)) return key;
    return null;
  }

  // src/lib/cloud-engine.ts
  var orOutage = (fallback) => (e) => {
    const msg = String(e?.message ?? e);
    if (e?.name === "AiUnavailable" || /AI is paused until|credit balance is too low|insufficient.?credit|invalid x-api-key|authentication_error/i.test(msg)) throw e;
    return fallback;
  };
  function ask(state, f, key) {
    const label = cleanLabel(f.label, f.options).slice(0, 200);
    if (!label) return;
    const list = state.questions ?? [];
    const i = list.findIndex((q2) => q2.label.toLowerCase() === label.toLowerCase());
    const q = { label, type: f.type, ...f.options?.length ? { options: f.options.filter((o) => o && !/^(select|choose|please|--)/i.test(o.trim())).slice(0, 40) } : {}, ...key ? { key } : {} };
    if (i >= 0) list[i] = { ...list[i], ...q, key: key ?? list[i].key };
    else list.push(q);
    state.questions = list.slice(-12);
  }
  function notAQuestion(state, f) {
    if (f.type === "file") {
      state.missingDocs = [.../* @__PURE__ */ new Set([...state.missingDocs ?? [], cleanLabel(f.label, f.options).slice(0, 80) || "a required document"])];
      return true;
    }
    const l = cleanLabel(f.label, f.options).slice(0, 50);
    return !!l && (state.missingDocs ?? []).some((m) => m.includes(l));
  }
  function questionNote(state) {
    const qs = state.questions ?? [];
    if (!qs.length) return missingNote(state.missing ?? []);
    return `the portal asks ${qs.length === 1 ? "something" : `${qs.length} things`} your profile doesn't answer yet: ${qs.slice(0, 3).map((q) => q.label.slice(0, 60)).join("; ")}. Ivyward AI will ask you, and the agents carry on once you answer`;
  }
  var FINAL = /^(submit( (my|the|your))?( application)?|submit (and|&) pay|sign (and|&) submit|submit now|final submit)$/i;
  var NEXT = /^(save (and|&) (continue|next)|next( page| section| step)?|continue( to .{0,30})?|proceed|save (and|&) proceed|go to next|save and go to next|suivant|continuer)\b/i;
  var START = /^(start|begin|continue|resume) (my |an |your |a new |new )?application\b.{0,20}$|^apply( now| online| today| here)?( for (this|the) program.{0,30})?$|^start( here| now)?$|^(how to )?apply to (this|the) program$/i;
  var CREATE = /^((create|register|sign up)( for| an| a| new| my| your)*( account| profile| login| here| e-?id| user ?id| username| applicant account)?|new (user|applicant)s?|first.?time (user|applicant)s?.*|create (a )?login|(get|request) (an? )?(e-?id|account))[?!.]*$/i;
  var SIGNIN = /^(sign in|log ?in|login|continue|next|submit)$/i;
  var CREATE_SUBMIT = /^(create( (an |my )?account)?|register|sign up|continue|submit|next|(set|save|create|update|change|choose) (my |your |a )?password|save|activate( (my )?account)?|finish|complete( registration)?|confirm)$/i;
  var LEAD_PAGE = /request[-_ ]?(more[-_ ])?info(rmation)?|\b(rfi|inquiry|enquiry|enquire|inquire|brochure|newsletter|subscribe|contact[-_ ]us|stay[-_ ]in[-_ ]touch|keep[-_ ]me[-_ ]informed)\b/i;
  var CREATE_LOOSE = /^(create|register|sign ?up|submit|continue|next|proceed|save|activate|finish|complete|confirm|get started|join|request)\b.{0,40}$|\b(create|register)\b.{0,20}\b(account|e-?id|profile|login|user)\b/i;
  var VERIFY_BTN = /^(verify|confirm|submit|continue|next|activate|log ?in|login|sign in)$/i;
  var CHANGE_PW = /(change (your )?password|must change|password (has )?expired|choose a new password|changer (votre )?mot de passe|nouveau mot de passe)/i;
  var SIGNUP_WORDS = /(create (an |your )?account|register|sign up|new user|confirm password|re-?enter password)/i;
  var CHECK_EMAIL = /(check your (e-?mail|inbox)|verify your e-?mail|we('ve| have) sent (you )?(an? )?(e-?mail|code|link)|activation (link|e-?mail)|confirm your e-?mail)/i;
  var CODE_LABEL = /(verification|security|confirmation|access|one.?time|activation)?\s*(code|pin|otp|passcode)\b/i;
  var REGISTER_PAGE = /(regist|create.?(an.?)?account|sign.?up|new.?user)/i;
  var LOGIN_LINK = /^(log ?in|login|sign ?in)( here| now)?$|^returning (users?|applicants?)/i;
  var FORGOT = /(forgot|forgotten|reset|lost|recover|change)\b.{0,25}(password|login|details|credentials|pin)|(password|login) (reset|recovery|help)|trouble (signing|logging) in|can'?t (sign|log) ?in/i;
  var RESET_BTN = /^(send|reset|submit|continue|next|request|email me|recover|go|ok|confirm)\b/i;
  var NO_ACCOUNT = /(no (account|user|record)s? (was |were )?(found|exists?|matches|associated)|(not|isn'?t) (found|registered|recogni[sz]ed)|does(n'?t| not) (exist|match)|unknown (user|email|account))/i;
  var APPLY_STRONG = /^(apply( now| online| today| here| directly)?( for (this|the) (program(me)?|course|degree))?|start (my |an |your |a new |new |the )?application|begin (my |an |your )?application|online application( form| portal| system)?|application (portal|form|system)|apply (via|through|using) .{2,30}|submit (an|your) application|apply to (this|the) (program(me)?|course)|(go to|access) (the )?(online )?application( portal)?)\b/i;
  var APPLY_WEAK = /\b(how to apply|apply|applying|application process|admissions? process|ready to apply)\b/i;
  var NOT_APPLY = /\b(news|events?|blog|podcast|webinars?|open days?|visit|tour|chat|faq|request (info|information|a prospectus)|brochure|prospectus|fees?|funding|accommodation|housing|jobs?|careers?|vacanc|staff|alumni|donate|giving|search|menu|cookies?|privacy)\b/i;
  var SIGN_WORDS = /\b(log ?-?in|login|log ?on|logon|sign ?-?in)\b|^(returning|existing) (users?|applicants?|accounts?)\b|already (have|registered|created)( an)? account|access (my|your) (application|account|portal)/i;
  var NOT_MINE = /\b(sign ?-?up|register|create|new (user|applicant)|log ?out|sign ?out|faculty|staff|employees?|recommend(er|ers|ation)|referees?|reviewers?|admin(istrator)?|current students?|alumni|partners?|agents?|counsell?ors?|google|facebook|linkedin|apple|microsoft|github|forgot|reset|help|trouble)\b/i;
  function isSignIn(label) {
    const l = label.replace(/\s+/g, " ").trim();
    return l.length > 0 && l.length <= 48 && SIGN_WORDS.test(l) && !NOT_MINE.test(l);
  }
  var findBy = (s2, ok) => s2.buttons.find((b) => ok(clean(b.label)) && goesSomewhere(s2, b));
  var BLOCK_TITLE = /^(access denied|forbidden|403\b|request (blocked|rejected)|attention required|just a moment|pardon our interruption|are you a (robot|human)|you have been blocked|blocked)/i;
  var BLOCK_BODY = /(unusual traffic from your|automated (requests|queries|access)|request (was|has been) (blocked|rejected)|verify (that )?you are (a )?human|checking (if the site connection is secure|your browser before)|enable javascript and cookies to continue|performing security verification|verif(y|ies) (that )?you are not a bot|security service to protect against malicious bots)/i;
  var isBlockPage = (s2) => BLOCK_TITLE.test(s2.title.trim()) || BLOCK_BODY.test(s2.body.slice(0, 800));
  var TERMS = /(i (have read and )?(agree|accept)|i confirm (that )?i have read|accept to continue|terms (of use|and conditions|of service)|privacy (policy|notice)|data protection (statement|policy|notice))/i;
  function isCodeBox(f) {
    return /^(text|tel|number|search|)$/.test(f.type) && CODE_LABEL.test(f.label) && !/zip|postal|area|country|permanent|course|program|programme|subject|school|institution|promo|discount|coupon|referral|invite|tax|sort|swift|bank|do you have|have you/i.test(f.label);
  }
  function classify(s2) {
    if (s2.confirmation) return "confirmation";
    if (s2.captcha || /error generating captcha token|captcha (verification|validation) failed|recaptcha (verification )?failed/i.test(`${s2.body.slice(0, 4e3)} ${(s2.errors ?? []).join(" ")}`)) return "captcha";
    if (s2.payment) return "payment";
    const pw = s2.allFields.filter((f) => f.type === "password");
    const code = s2.allFields.find((f) => isCodeBox(f));
    if (pw.length >= 2 || pw.length === 1 && SIGNUP_WORDS.test(s2.body.slice(0, 3e3)) && s2.allFields.length >= 4) return "signup";
    if (pw.length === 1) return "login";
    if (code && s2.allFields.length <= 3) return "verify_code";
    if (CHECK_EMAIL.test(s2.body) && s2.fields.length <= 1) return "check_email";
    return "form";
  }
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  var active = /* @__PURE__ */ new WeakMap();
  var frameOf = (page) => active.get(page) ?? page.mainFrame();
  async function snapFrame(f) {
    try {
      await f.helper();
      return await f.evaluate(() => window.__am.snapshot(), void 0);
    } catch {
      return null;
    }
  }
  async function snapMain(page) {
    for (let i = 0; i < 3; i++) {
      const s2 = await snapFrame(page.mainFrame());
      if (s2) return s2;
      await page.waitForLoadState("domcontentloaded", { timeout: 1e4 }).catch(() => {
      });
      await sleep(800);
    }
    const url = await page.url();
    return { url, title: "", body: "", captcha: false, payment: false, confirmation: false, fingerprint: `blank:${url}`, fields: [], allFields: [], buttons: [] };
  }
  var recentDialogs = /* @__PURE__ */ new WeakMap();
  async function snap(page) {
    const main = await snapMain(page);
    let best = { f: page.mainFrame(), s: main };
    const score = (x) => x.allFields.length * 3 + x.buttons.length;
    let confirmation = main.confirmation;
    let captcha = main.captcha;
    for (const f of await page.frames()) {
      if (f.isMain || !f.url().startsWith("http")) continue;
      const s2 = await snapFrame(f);
      if (!s2) continue;
      confirmation ||= s2.confirmation;
      captcha ||= s2.captcha;
      if ((s2.allFields.length || s2.buttons.length > main.buttons.length) && score(s2) > score(best.s)) best = { f, s: s2 };
    }
    active.set(page, best.f);
    const said = page.dialogs?.() ?? [];
    if (said.length) recentDialogs.set(page, said);
    const shown = recentDialogs.get(page) ?? [];
    return { ...best.s, captcha, confirmation, title: main.title || best.s.title, ...shown.length ? { errors: [...best.s.errors ?? [], ...shown], body: `${shown.join(" ")} ${best.s.body}` } : {} };
  }
  async function lookUp(page, deps2, title) {
    const what = title.replace(/^\s*look ?up\s*/i, "").trim();
    const key = keyForLabel(what) ?? keyForLabel(`${what} *`);
    if (!what || !key) return false;
    for (const f of await page.frames()) {
      const s2 = await snapFrame(f);
      if (!s2) continue;
      const box = s2.allFields.find((x) => x.type === "text" && /\b(description|descr|search|name)\b/i.test(`${x.label} ${x.name ?? ""}`));
      const go = s2.buttons.find((b) => /^(look ?up|search|find)$/i.test(clean(b.label)));
      if (!box || !go) continue;
      const fill = await deps2.fillFromKey({ ...box, label: what }, key);
      if (!fill || fill.action !== "fill") return false;
      active.set(page, f);
      await fillText(page, box.id, fill.value);
      await click(page, go.id);
      await settle2(page);
      const after = await snapFrame(f);
      const want = fill.value.toLowerCase().replace(/\s+/g, " ").trim();
      const label = (b) => clean(b.label).toLowerCase();
      const hit = after?.buttons.find((b) => label(b) === want) ?? after?.buttons.find((b) => label(b).startsWith(want) && label(b).length <= want.length + 20);
      if (!hit) return false;
      await click(page, hit.id);
      await settle2(page);
      return true;
    }
    return false;
  }
  async function click(page, id) {
    const sel = `[data-am-id="${id}"]`;
    const href = await frameOf(page).evaluate((q) => {
      const id2 = q.match(/data-am-id="([^"]+)"/)?.[1] ?? "";
      const a = window.__am?.byId?.(id2) ?? document.querySelector(q);
      return a && a.tagName === "A" && a.target && a.target !== "_self" && /^https?:/.test(a.href) ? a.href : null;
    }, sel).catch(() => null);
    if (href) {
      await page.goto(href, { timeout: 45e3 });
      await page.waitForLoadState("networkidle", { timeout: 15e3 }).catch(() => {
      });
      await sleep(1200);
      return;
    }
    try {
      await Promise.all([page.waitForLoadState("domcontentloaded").catch(() => {
      }), frameOf(page).click(sel, { timeout: 8e3 })]);
    } catch {
      await frameOf(page).evaluate((i) => (window.__am?.byId?.(i) ?? document.querySelector(`[data-am-id="${i}"]`))?.click(), id);
    }
    await page.waitForLoadState("networkidle", { timeout: 15e3 }).catch(() => {
    });
    await sleep(1200);
  }
  async function fillText(page, id, value) {
    try {
      await frameOf(page).fill(`[data-am-id="${id}"]`, value, { timeout: 1e4 });
    } catch (e) {
      if (/detached|Timeout \d+ms exceeded|not attached|not visible/i.test(String(e?.message ?? e))) throw new Redrawn();
      throw e;
    }
  }
  var IDP_HOST = /(^|\.)(login\.microsoftonline\.com|login\.live\.com|account\.live\.com|account\.microsoft\.com|accounts\.google\.com|myaccount\.google\.com|appleid\.apple\.com|idmsa\.apple\.com|login\.yahoo\.com|facebook\.com|linkedin\.com|okta\.com|auth0\.com)$/i;
  var hostOf = (u) => {
    try {
      return new URL(u).hostname.toLowerCase();
    } catch {
      return "";
    }
  };
  var DEAD_END = /an error has occurred that has stopped this transaction|(your |the )?session (has )?(timed out|expired)|has timed out due to inactivity|this page has expired|page (is )?no longer (valid|available)/i;
  var LOGIN_REFUSED = /\b(invalid|incorrect|wrong|not recogni[sz]ed|unrecogni[sz]ed|unknown (user|login|e-?mail|account|username|id)|failed|does not exist|doesn't exist|no account|not match|identifiant (inconnu|invalide)|mot de passe (invalide|incorrect))/i;
  var EMAIL_EXISTS = /\b(e-?mail|email address|courriel)\b[^.!?]{0,80}\b(is |has )?(already )(been )?(registered|in use|used|taken|assigned|associated|linked|on file|exists?)\b|\b(an )?account (with|for|using) (this|that|the) e-?mail( address)? (already )?exists|\b(e-?mail|courriel)\b[^.!?]{0,60}\bdéjà (utilisé|associé|enregistré)/i;
  var LOCKED = /\b(temporarily (blocked|locked|disabled|suspended)|too many (failed |unsuccessful |login |sign-?in )?(attempts|tries|requests)|account (has been |is )?(temporarily )?(locked|blocked)|try again (in|after) \d+\s*(min|hour)|rate limit(ed)?)\b/i;
  function lockMinutes(text) {
    const m = text.match(/(?:in|after)\s+(\d+)\s*(min|minute|hour|hr)/i);
    if (!m) return 30;
    const n2 = Number(m[1]) * (/^h/i.test(m[2]) ? 60 : 1);
    return Math.min(Math.max(n2 + 2, 5), 24 * 60);
  }
  var DOWN = /\b(scheduled maintenance|undergoing maintenance|down for maintenance|temporarily unavailable|service unavailable|503 service|502 bad gateway|504 gateway|site is currently (down|offline|unavailable)|system is (currently )?(unavailable|offline|down))\b/i;
  var CLOSED = /\b(applications? (are|is) (now )?closed|(application )?deadline (has )?passed|no longer (accepting|taking) applications|not (currently |yet )?(accepting|open for) applications|applications? (will )?(open|opens) (on|in)\b|this (term|intake|program(me)?) is (closed|not available))/i;
  var ALREADY_SUBMITTED = /\b(you have already submitted|application (has )?already been submitted|already submitted (an|this|your) application)\b/i;
  var PDF_ONLY = /\b(only pdf|pdf (files? )?only|must be (in )?(a )?pdf|upload (a |your )?pdf|accepted (file )?(format|type)s?:? pdf\b(?!\s*,)|file type (is )?not (allowed|supported|accepted)|invalid file (type|format))/i;
  function safeFileName(name) {
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 6) : "";
    const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^[_.]+|[_.]+$/g, "");
    return `${(base || "document").slice(0, 60 - ext.length)}${ext}`;
  }
  var ADD_ANOTHER = /^(add|save and add|add (an)?other|add new|\+)\s*(another|more|new|an?)?\s*(education|qualification|school|institution|degree|academic|employment|work|job|experience|position|employer)\b|^add another$/i;
  var entryKind = (label) => /(education|qualification|school|institution|degree|academic)/i.test(label) ? "edu" : /(employment|work|job|experience|position|employer)/i.test(label) ? "work" : null;
  var USERNAME_TAKEN = /^(?!.*e-?mail).*((user ?name|e-?id|user ?id|login( ?id| ?name)?|account name)\b.{0,60}\b(already (been )?(taken|exists?|in use|registered|used)|(is )?(not available|unavailable|taken))|already (taken|in use))/i;
  function usernameBox(s2) {
    return s2.allFields.find((f) => f.type !== "password" && f.type !== "email" && !/e-?mail/i.test(f.label) && /\b(user ?name|e-?id|user ?id|login ?(id|name))\b/i.test(`${f.label} ${f.name ?? ""}`));
  }
  async function valueOf(page, id) {
    return frameOf(page).evaluate((i) => String(window.__am?.byId?.(i)?.value ?? ""), id).catch(() => "");
  }
  function withNumber(name, n2) {
    const dot = name.lastIndexOf(".");
    if (dot > 0) return `${name.slice(0, dot).replace(/\d+$/, "")}${n2}${name.slice(dot)}`;
    return `${name.replace(/\d+$/, "")}${n2}`;
  }
  var Redrawn = class extends Error {
    constructor() {
      super("the page redrew the box while it was being filled");
    }
  };
  var clean = (l) => l.replace(/[\u2190-\u21ff\u2794-\u27bf›»<>←→]+/g, " ").split(/\s+\/\s+|\s+\|\s+/)[0].replace(/\s+/g, " ").trim();
  var here = (u) => u.replace(/#.*$/, "").replace(/\/$/, "");
  var goesSomewhere = (s2, b) => !b.href || /^javascript:/i.test(b.href) ? true : here(b.href) !== here(s2.url);
  var find = (s2, re, linksOnly = false) => s2.buttons.find((b) => re.test(clean(b.label)) && (!linksOnly || b.link) && goesSomewhere(s2, b));
  var findCreate = (s2) => s2.buttons.find((b) => CREATE.test(clean(b.label)));
  var findForgot = (s2) => s2.buttons.find((b) => clean(b.label).length <= 60 && FORGOT.test(clean(b.label)));
  function bestApply(s2, visited = []) {
    let best;
    for (const b of s2.buttons) {
      const l = clean(b.label);
      if (!l || l.length > 70 || !goesSomewhere(s2, b)) continue;
      if (b.href && visited.includes(here(b.href))) continue;
      let score = APPLY_STRONG.test(l) ? 10 : START.test(l) ? 9 : APPLY_WEAK.test(l) ? 3 : 0;
      if (!score) continue;
      if (NOT_APPLY.test(l)) score -= 8;
      if (b.href && /(^|[./])(apply|applygrad|gradapply|admissions?|application|portal|slate|ucas|enligne|register)[./-]/i.test(b.href.replace(/^https?:\/\//, ""))) score += 3;
      if (!best || score > best.score) best = { b, score };
    }
    return best && best.score >= 3 ? best.b : void 0;
  }
  var ASKED_BUTTON = /\b(?:remember to|please|you must|make sure (?:you|to)|click|press|select|use)\s+(?:the\s+)?["“'‘]([^"”'’]{3,40})["”'’]/gi;
  function namedButton(s2, state) {
    const text = s2.body.slice(0, 8e3) + " " + (s2.errors ?? []).join(" ");
    const asked = [...text.matchAll(ASKED_BUTTON)].map((m) => m[1].trim().toLowerCase());
    for (const m of text.matchAll(/\b([a-z]+?)\d*\s+(?:is|are)\s+required\b/gi)) {
      const word = m[1].toLowerCase();
      if (word.length < 4) continue;
      const add = s2.buttons.find((b2) => new RegExp(`^(add|enter|update|edit)( an?| your| new)? ${word}`, "i").test(clean(b2.label)));
      if (add) asked.push(clean(add.label).toLowerCase());
    }
    if (!asked.length) return void 0;
    const key = `${(state.lastFingerprint ?? "").slice(0, 60)}#${state.navClicks ?? 0}`;
    const done = new Set(state.pressedAsked ?? []);
    const b = s2.buttons.find((x) => asked.includes(clean(x.label).toLowerCase()) && !done.has(`${key}|${clean(x.label).toLowerCase()}`) && !DANGEROUS.test(x.label) && !FINAL.test(clean(x.label)));
    if (b) state.pressedAsked = [...done, `${key}|${clean(b.label).toLowerCase()}`].slice(-30);
    return b;
  }
  var SEC_Q = /\b(security|secret|memorable|challenge)?\s*question\b/i;
  var SEC_A = /\b(security|secret|memorable|challenge)?\s*answer\b/i;
  var isSecAnswer = (label) => SEC_A.test(label) && (!SEC_Q.test(label) || /\banswer\b[\s\S]*\bquestion\b/i.test(label));
  async function securityQuestions(page, fields, login) {
    const qs = fields.filter((f) => f.type === "select" && SEC_Q.test(f.label) && (f.options?.length ?? 0) > 1);
    const as = fields.filter((f) => (f.type === "text" || f.type === "password") && isSecAnswer(f.label));
    if (!as.length && !qs.length || !login.answers?.length) return [];
    const done = [];
    const used = /* @__PURE__ */ new Set();
    for (const [i, q] of qs.entries()) {
      const real = (q.options ?? []).filter((o) => o.trim() && !/^(select|choose|please|--|-)/i.test(o.trim()));
      const n2 = Number((q.label.match(/\d+/) ?? [])[0]);
      const want = Number.isFinite(n2) && n2 > 0 ? n2 - 1 : i;
      const pick2 = [...real.slice(want % Math.max(real.length, 1)), ...real].find((o) => !used.has(o));
      if (!pick2) continue;
      used.add(pick2);
      if (await frameOf(page).evaluate((x) => window.__am.apply(x), { id: q.id, action: "choose", option: pick2, source: "security" }).catch(() => false)) done.push(q.id);
    }
    if (done.length) {
      await sleep(2500);
      const again = (await snap(page)).fields.filter((f) => (f.type === "text" || f.type === "password") && isSecAnswer(f.label));
      as.splice(0, as.length, ...again);
    }
    for (const [i, a] of as.entries()) {
      const n2 = Number((a.label.match(/\d+/) ?? [])[0]);
      const k = Number.isFinite(n2) && n2 > 0 ? n2 - 1 : i;
      if (await fillText(page, a.id, login.answers[k % login.answers.length]).then(() => true, () => false)) done.push(a.id);
    }
    return done;
  }
  var DOC_TYPES = [
    [/\b(cv|curriculum vitae|r[eé]sum[eé])\b/i, (k) => k === "cv"],
    [/\btranscript|academic record|marks? sheet/i, (k) => k === "transcript"],
    [/\bdegree (certificate|award)|\bcertificate\b|\bdiploma\b/i, (k) => k === "degree_cert"],
    [/\b(english|ielts|toefl|pte|duolingo|test (score|result))/i, (k) => k === "test_score"],
    [/\b(personal statement|statement of purpose|supporting statement|motivation|research proposal)/i, (k) => k.startsWith("essay:")]
  ];
  var UPLOAD_GO = /^(go|upload|add|attach|upload (file|document)|add (file|document)|save document)$/i;
  async function uploadByType(page, deps2, s2, state) {
    const box = s2.allFields.find((f) => f.type === "file");
    const go = s2.buttons.find((b) => UPLOAD_GO.test(clean(b.label)));
    const list = s2.fields.find((f) => f.type === "select" && (f.options ?? []).filter((o) => DOC_TYPES.some(([re]) => re.test(o))).length >= 2);
    const keys = deps2.files?.() ?? [];
    if (!box || !go || !list || !keys.length) return 0;
    const host = (() => {
      try {
        return new URL(s2.url).hostname;
      } catch {
        return "";
      }
    })();
    const done = new Set(state.typedUploads ?? []);
    for (const [re, fits] of DOC_TYPES) {
      const key = keys.find((k) => fits(k) && !done.has(`${host}|${k}`));
      const option = (list.options ?? []).find((o) => re.test(o));
      if (!key || !option) continue;
      state.typedUploads = [...done, `${host}|${key}`].slice(-40);
      await deps2.progress(`uploading your ${option.toLowerCase()}`);
      await frameOf(page).evaluate((x) => window.__am.apply(x), { id: list.id, action: "choose", option, source: key }).catch(() => false);
      await sleep(800);
      const after = await snap(page);
      const box2 = after.allFields.find((f) => f.type === "file") ?? box;
      const go2 = after.buttons.find((b) => UPLOAD_GO.test(clean(b.label))) ?? go;
      await frameOf(page).setInputFiles(`[data-am-id="${box2.id}"]`, await deps2.file(key));
      await sleep(500);
      await click(page, go2.id);
      await sleep(2500);
      return 1;
    }
    return 0;
  }
  var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  function dateAs(iso, context) {
    const [y, m, d] = iso.split("-");
    const spelled = context.match(/\b(dd|mm|yyyy)([\/.\- ])(dd|mm)\2(yyyy|yy|dd)\b/i);
    if (spelled) {
      const parts = [spelled[1], spelled[3], spelled[4]].map((p) => p.toLowerCase());
      const val = (p) => p === "dd" ? d : p === "mm" ? m : p === "yy" ? y.slice(2) : y;
      return parts.map(val).join(spelled[2]);
    }
    const ex = context.match(/\b(?:example|e\.g\.|eg|format|for example)[^0-9]{0,20}(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4})\b/i);
    if (ex) {
      const first = Number(ex[1]);
      const second = Number(ex[3]);
      if (second > 12) return [m, d, y].join(ex[2]);
      if (first > 12) return [d, m, y].join(ex[2]);
    }
    if (/\/ps[cp]\//i.test(context)) return [m, d, y].join("/");
    return iso;
  }
  var DATE_COMPLAINT = /(does not understand the date|invalid date|not a valid date|enter a valid date|date (is )?(invalid|in the wrong format)|date format)/i;
  function dateRedo(s2, already) {
    if (!DATE_COMPLAINT.test(`${s2.body.slice(0, 4e3)} ${(s2.errors ?? []).join(" ")}`)) return [];
    const have = new Set(already.map((f) => f.id));
    return s2.allFields.filter((f) => f.type === "text" && /\b(date|birth|dob)\b/i.test(f.label) && !have.has(f.id));
  }
  function markNewApp(state, label) {
    if ((state.createClicks ?? []).some((c) => NEW_APP.test(c.split("|").pop() ?? ""))) return false;
    state.createClicks = [...state.createClicks ?? [], `${(state.lastFingerprint ?? "").slice(0, 60)}|${label}`].slice(-30);
    return true;
  }
  var VISION_BUDGET = 60;
  var VISION_KEYS = /* @__PURE__ */ new Set(["Enter", "Tab", "Shift+Tab", "Escape", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Space", "Backspace", "Delete", "PageDown", "PageUp", "Home", "End"]);
  async function visionLoop(page, deps2, state, goal, empty, max = 10) {
    if (!deps2.see || !page.screenshot || !page.mouseClick) return { acted: false };
    let acted = false;
    let idle = 0;
    const log = (t) => state.visionHistory = [...state.visionHistory ?? [], t].slice(-14);
    const main = page.mainFrame();
    const sig = () => main.evaluate(() => window.__am.sig(), void 0).catch(() => "");
    for (let i = 0; i < max && (state.visionCalls ?? 0) < VISION_BUDGET && idle < 3; i++) {
      if (deps2.shouldStop?.()) break;
      state.visionCalls = (state.visionCalls ?? 0) + 1;
      await main.helper().catch(() => {
      });
      const marks = await main.evaluate(() => window.__am.marks(true), void 0).catch(() => []);
      const image = await page.screenshot().catch(() => null);
      await main.evaluate(() => window.__am.clearMarks(), void 0).catch(() => {
      });
      if (!image) break;
      const a = await deps2.see({ image, goal, url: await page.url(), history: (state.visionHistory ?? []).slice(-10), empty, marks, files: deps2.files?.() ?? [] }).catch(orOutage(null));
      if (!a || a.action === "done") break;
      if (a.action === "handoff") {
        log(`handoff: ${a.note}`);
        const reason = /cloudflare|just a moment|security (check|verification)/i.test(a.note) ? "blocked" : /captcha|robot|human|bot check/i.test(a.note) ? "captcha" : /\b(pay|payment|fee|card)\b/i.test(a.note) ? "payment" : "stuck";
        return { acted, outcome: { kind: "needs_you", reason, note: a.note.slice(0, 280) } };
      }
      const m = a.mark ? marks.find((x2) => x2.n === a.mark) : void 0;
      const x = m ? m.x : a.x;
      const y = m ? m.y : a.y;
      const what = m ? `${m.type} "${m.label.slice(0, 40)}"` : `${Math.round(x)},${Math.round(y)}`;
      const before = await sig();
      if (["click", "double_click", "type", "clear", "upload", "hover"].includes(a.action)) {
        if (!m && !(x > 0 && y > 0)) {
          log(`no target for ${a.action}`);
          idle++;
          continue;
        }
        const under = await main.evaluate((p) => window.__am.at(p.x, p.y), { x, y }).catch(() => null);
        const label = clean(under?.label || m?.label || "");
        if ((a.action === "click" || a.action === "double_click") && DANGEROUS.test(label)) {
          log(`refused "${label}"`);
          return { acted, outcome: { kind: "needs_you", reason: /pay|checkout/i.test(label) ? "payment" : "stuck", note: /pay|checkout/i.test(label) ? "payment step: pay the application fee yourself; the agents confirm the submission after" : `the next step is "${label}", which the agents never press for you` } };
        }
        if ((a.action === "click" || a.action === "double_click") && (FINAL.test(label) || /^submit\b/i.test(label) || (deps2.finalButton?.test(label) ?? false))) {
          state.reachedSubmit = true;
          const d = await deps2.canSubmit();
          if (!d.allowed) return { acted, outcome: { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` } };
          state.submitClicked = true;
        }
        if ((a.action === "click" || a.action === "double_click") && (/\b(start|create|begin|register|sign ?up|new application)\b/i.test(label) || !label && /submit/i.test(m?.type ?? ""))) {
          const pageKey = (state.lastFingerprint ?? "").slice(0, 60);
          const k = `${pageKey}|${label || m?.type}`;
          if ((state.createClicks ?? []).some((c) => c.startsWith(`${pageKey}|`))) {
            log(`didn't press "${label || "submit"}" again: it was pressed already`);
            idle++;
            continue;
          }
          state.createClicks = [...state.createClicks ?? [], k].slice(-30);
        }
        if (a.action === "click") await page.mouseClick(x, y);
        else if (a.action === "double_click") await (page.doubleClick ?? page.mouseClick)(x, y);
        else if (a.action === "hover") await page.hover?.(x, y);
        else if (a.action === "clear") {
          await page.mouseClick(x, y);
          await page.pressKey?.("Control+A");
          await page.pressKey?.("Backspace");
        } else if (a.action === "upload") {
          if (!a.file || !(deps2.files?.() ?? []).includes(a.file) || !page.uploadAt) {
            log(`can't upload ${a.file || "?"}`);
            idle++;
            continue;
          }
          const ok = await page.uploadAt(x, y, await deps2.file(a.file)).catch(() => false);
          log(ok ? `uploaded ${a.file} at ${what}` : `upload of ${a.file} didn't take`);
        } else {
          const v = deps2.sheetValue?.(a.sheet_key) ?? null;
          const piece = a.text.trim();
          const typed = v && piece && v.toLowerCase().includes(piece.toLowerCase()) ? piece : v;
          if (!typed || NEVER_FILL.test(label) || m?.type === "password") {
            log(`nothing to type for ${a.sheet_key || "?"}`);
            idle++;
            continue;
          }
          if (/select/i.test(m?.type ?? "") || under?.tag === "select") {
            const r = await main.evaluate((p) => window.__am.selectAt(p.x, p.y, p.v), { x, y, v }).catch(() => null);
            if (r?.chose) {
              log(`chose "${r.chose.slice(0, 40)}" for ${a.sheet_key} in ${what}`);
              continue;
            }
          }
          await page.mouseClick(x, y);
          await page.pressKey?.("Control+A");
          await page.typeText?.(typed);
          log(`typed ${a.sheet_key}${typed !== v ? ` ("${typed}")` : ""} into ${what}`);
        }
        if (a.action === "click" || a.action === "double_click" || a.action === "hover") log(`${a.action.replace("_", " ")} ${what}${a.note ? ` (${a.note.slice(0, 50)})` : ""}`);
      } else if (a.action === "key") {
        if (!VISION_KEYS.has(a.key)) {
          log(`key ${a.key} not allowed`);
          idle++;
          continue;
        }
        await page.pressKey?.(a.key === "Space" ? " " : a.key);
        log(`pressed ${a.key}`);
      } else if (a.action === "scroll") {
        const dy = /up/i.test(a.direction) ? -650 : 650;
        await page.scrollBy?.(dy, m?.x, m?.y);
        log(`scrolled ${dy < 0 ? "up" : "down"}${m ? ` in ${what}` : ""}`);
      } else if (a.action === "back") {
        await page.goBack?.();
        log("went back");
      } else if (a.action === "wait") {
        await sleep(2500);
        log("waited");
      }
      acted = true;
      await page.waitForLoadState("domcontentloaded", { timeout: 8e3 }).catch(() => {
      });
      await sleep(900);
      const after = await sig();
      if (after && after === before && a.action !== "wait") {
        idle++;
        state.visionHistory = [...(state.visionHistory ?? []).slice(0, -1), `${(state.visionHistory ?? []).at(-1) ?? a.action} \u2192 nothing changed`].slice(-14);
      } else idle = 0;
    }
    return { acted };
  }
  async function decidePass(page, deps2, s2, fields, state) {
    if (!deps2.decide) return 0;
    const key = (f) => cleanLabel(f.label, f.options).toLowerCase().slice(0, 80);
    const seen = new Set((s2.errors ?? []).length ? [] : state.decided ?? []);
    const todo = fields.filter((f) => !seen.has(key(f)) && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`) && f.type !== "password");
    if (!todo.length) return 0;
    state.decided = [...seen, ...todo.map(key)].slice(-120);
    const fills = await deps2.decide(todo, { url: s2.url, title: s2.title, body: s2.body.slice(0, 2e3), errors: s2.errors ?? [] }).catch(orOutage([]));
    return applyList(page, deps2, todo, fills, state);
  }
  async function fillHard(page, deps2, state) {
    let filled = 0;
    let now = await snap(page);
    const blank = (x) => x.fields.filter((f) => (f.required || (x.errors ?? []).length > 0 && f.type !== "checkbox" && f.type !== "file") && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
    let empty = blank(now);
    if (empty.length) {
      filled += await decidePass(page, deps2, now, empty, state);
      now = await snap(page);
      empty = blank(now);
    }
    if (empty.length && deps2.see && page.screenshot) {
      const labels = empty.map((f) => cleanLabel(f.label, f.options).slice(0, 80));
      const v = await visionLoop(page, deps2, state, `fill in these required questions with the applicant's information, opening dropdowns and choosing the matching option: ${labels.join("; ")}`, labels);
      if (v.outcome) return { filled, empty, outcome: v.outcome };
      if (v.acted) filled += 1;
      if (v.acted) {
        now = await snap(page);
        empty = now.fields.filter((f) => f.required && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
      }
    }
    if (filled > 0 && (now.errors ?? []).length) {
      const save = now.buttons.find((b) => SECTION_SAVE.test(clean(b.label))) ?? find(now, NEXT);
      if (save) {
        await click(page, save.id);
        await sleep(1200);
        now = await snap(page);
        empty = now.fields.filter((f) => f.required && !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
      }
    }
    return { filled, empty };
  }
  var SECTION_SAVE = /^save( (my|this|the))?( [a-z]+){0,3}$|^(update|save changes|save section)$/i;
  var WRONG_PROGRAM = /\b(is for|for the|belongs to)\b.{0,80}\b(not|rather than|instead of)\b|\b(wrong|different|another|other) (program|programme|degree|course|application)\b|\bnot (the|for) (right|correct|same) (program|programme|degree|course)\b/i;
  var NEW_APP_QUESTION = "The application already started on this portal looks like it's for a different program. Should the agents start a new application for the program you're applying to?";
  function askAboutNewApp(r) {
    const st = r.state;
    if (r.outcome.kind !== "needs_you" || r.outcome.reason === "question" || !st.newAppBlocked || st.newAppAllowedUsed) return r;
    if (!WRONG_PROGRAM.test(`${r.outcome.note} ${(st.navHistory ?? []).slice(-4).join(" ")}`)) return r;
    ask(st, { id: "new-application", label: NEW_APP_QUESTION, type: "radio", options: ["Yes", "No"] }, "start_new_application");
    return { ...r, outcome: { kind: "needs_you", reason: "question", note: "the application already on this portal seems to be for another program: answer whether the agents should start a new one" } };
  }
  async function runEngine(page, deps2, state, budgetMs) {
    const end = Date.now() + budgetMs;
    for (let i = 0; i < 8; i++) {
      try {
        const r = await runPass(page, deps2, state, Math.max(0, end - Date.now()));
        return askAboutNewApp(r);
      } catch (e) {
        if (!(e instanceof Redrawn) || Date.now() >= end) throw e;
        state.navHistory = [...state.navHistory ?? [], "the page redrew while filling; looking again"].slice(-12);
        await sleep(1500);
      }
    }
    return { outcome: { kind: "continue", note: "continuing" }, state, filled: 0 };
  }
  async function runPass(page, deps2, state, budgetMs) {
    const end = Date.now() + budgetMs;
    let filled = 0;
    while (Date.now() < end) {
      if (deps2.shouldStop?.()) return { outcome: { kind: "continue", note: "paused" }, state, filled };
      state.steps += 1;
      state.totalSteps = (state.totalSteps ?? 0) + 1;
      if (state.steps > 150) return { outcome: { kind: "continue", note: "continuing on the next pages" }, state, filled };
      if (state.totalSteps > 1500) return { outcome: { kind: "needs_you", reason: "stuck", note: "the agents have been through this portal hundreds of pages without finishing; please check where it stands" }, state, filled };
      await page.waitForLoadState("domcontentloaded").catch(() => {
      });
      await sleep(800);
      let s2 = await snap(page);
      if (isBlockPage(s2)) {
        await sleep(8e3);
        s2 = await snap(page);
        if (isBlockPage(s2)) return { outcome: { kind: "needs_you", reason: "blocked", note: "this portal blocks the browser the agents are using" }, state, filled };
      }
      const lookTitle = [s2.title, (s2.fingerprint ?? "").split("|")[0]].find((t) => /^\s*look ?up\s+\S/i.test(t ?? "")) ?? "";
      if (lookTitle && (state.lookups ?? 0) < 6 && deps2.fillFromKey) {
        state.lookups = (state.lookups ?? 0) + 1;
        if (await lookUp(page, deps2, lookTitle)) {
          state.samePageCount = 0;
          continue;
        }
      }
      const said = `${(s2.errors ?? []).join(" ")} ${s2.body}`;
      const kind0 = classify(s2);
      if ((kind0 === "login" || kind0 === "signup") && LOCKED.test(said)) {
        state.lockWaits = (state.lockWaits ?? 0) + 1;
        if (state.lockWaits > 3) return { outcome: { kind: "needs_you", reason: "login", note: "the portal keeps the account locked after several waits. Reset the password on the portal, or wait a day and choose Try again" }, state, filled };
        const min = lockMinutes(said);
        return { outcome: { kind: "wait", seconds: min * 60, note: `the portal locked sign-ins for a while: trying again in ${min} minutes` }, state, filled };
      }
      if (said.length < 3e3 && DOWN.test(said) && !insideForm(s2)) {
        state.downWaits = (state.downWaits ?? 0) + 1;
        if (state.downWaits > 4) return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal has been down for maintenance for hours; the agents will try again when you choose Try again" }, state, filled };
        return { outcome: { kind: "wait", seconds: 30 * 60, note: "the portal is down for maintenance: trying again in 30 minutes" }, state, filled };
      }
      if (CLOSED.test(said) && !insideForm(s2) && !find(s2, START) && !find(s2, NEXT)) {
        const line = (said.match(new RegExp(`[^.!?]{0,120}${CLOSED.source}[^.!?]{0,120}`, "i"))?.[0] ?? "").trim();
        return { outcome: { kind: "needs_you", reason: "closed", note: `the portal says applications aren't open${line ? `: "${line.slice(0, 200)}"` : ""}. Check the intake, or choose another program` }, state, filled };
      }
      if (ALREADY_SUBMITTED.test(said)) {
        return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal says this application was already submitted. Check the portal, then mark it submitted in Ivyward" }, state, filled };
      }
      if (PDF_ONLY.test(said)) state.pdfOnly = true;
      if (state.samePageCount === 1) {
        await frameOf(page).evaluate(() => {
          for (const el of Array.from(document.querySelectorAll("*"))) if (el.scrollHeight > el.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight;
          window.scrollTo(0, document.body.scrollHeight);
          return true;
        }, void 0).catch(() => false);
      }
      if (s2.fingerprint !== state.lastFingerprint) recentDialogs.delete(page);
      const alertText = (recentDialogs.get(page) ?? []).join(" | ");
      if (alertText && !(state.navHistory ?? []).at(-1)?.startsWith("the page said:")) state.navHistory = [...state.navHistory ?? [], `the page said: ${alertText.slice(0, 200)}`].slice(-12);
      state.samePageCount = s2.fingerprint === state.lastFingerprint ? (state.samePageCount ?? 0) + 1 : 0;
      state.lastFingerprint = s2.fingerprint;
      if (REGISTER_PAGE.test(s2.url) && /^(forbidden|access denied|403|request blocked)/i.test(s2.title.trim() || s2.body.trim().slice(0, 40))) {
        return { outcome: { kind: "needs_you", reason: "account", note: "this portal won't let an automated browser create the account" }, state, filled };
      }
      const formComplains = /(invalid|do(es)? not exist|already (exists|registered|in use)|not (be )?found|error|please (enter|select|provide|choose|complete)|is required|are mandatory|is mandatory|required field|must (be|contain|match|include)|do(es)? not match|too (short|long))/i.test(`${s2.body} ${alertText} ${(s2.errors ?? []).join(" ")}`);
      const blankRequired = s2.fields.some((f) => f.required && f.type !== "checkbox");
      const changingPassword = s2.allFields.some((f) => f.type === "password" && /\b(current|old|existing|temporary)\b/i.test(`${f.label} ${f.name ?? ""}`)) || CHANGE_PW.test(s2.body.slice(0, 1500));
      if ((state.signupTries ?? 0) >= 3 && state.samePageCount >= 2 && REGISTER_PAGE.test(`${s2.url} ${s2.title}`) && !(state.missing ?? []).length && !formComplains && !blankRequired && !changingPassword) {
        return { outcome: { kind: "needs_you", reason: "account", note: "this portal won't let an automated browser create the account" }, state, filled };
      }
      if (!state.accountExists && ["signup", "form", "login"].includes(classify(s2)) && EMAIL_EXISTS.test(`${(s2.errors ?? []).join(" ")} ${alertText} ${s2.body}`)) {
        state.accountExists = true;
        state.triedCreate = true;
        state.wentBackToCreate = true;
        state.createNext = false;
        state.navHistory = [...state.navHistory ?? [], "the portal says this email has an account already: signing in instead"].slice(-12);
        await deps2.progress("you have an account here already: signing in instead");
        const way = find(s2, LOGIN_LINK) ?? findBy(s2, isSignIn);
        if (way) {
          await click(page, way.id);
          continue;
        }
        if (deps2.portalUrl) {
          await page.goto(deps2.portalUrl, { timeout: 45e3 }).catch(() => {
          });
          continue;
        }
      }
      const okBox = find(s2, /^(ok|okay)$/i);
      if (okBox && /\b(message|error|warning|alert)\b/i.test(s2.body.slice(0, 300)) && !(state.pressedAsked ?? []).includes(`${(s2.fingerprint ?? "").slice(0, 60)}|ok`)) {
        state.pressedAsked = [...state.pressedAsked ?? [], `${(s2.fingerprint ?? "").slice(0, 60)}|ok`].slice(-30);
        await click(page, okBox.id);
        continue;
      }
      if (state.samePageCount >= 2) {
        const named = namedButton(s2, state);
        if (named) {
          state.navHistory = [...state.navHistory ?? [], `pressed "${clean(named.label)}", which the page asked for`].slice(-12);
          await deps2.progress(`pressing "${clean(named.label)}", which the portal asks for`);
          await click(page, named.id);
          state.samePageCount = 0;
          state.lastFingerprint = void 0;
          continue;
        }
      }
      if (state.samePageCount >= 3 && s2.fields.some((f) => f.required)) {
        const h = await fillHard(page, deps2, state);
        filled += h.filled;
        if (h.outcome) return { outcome: h.outcome, state, filled };
        s2 = await snap(page);
      }
      if (state.samePageCount >= 3) {
        const req = s2.fields.filter((f) => f.required && f.type !== "checkbox").map((f) => cleanLabel(f.label, f.options).slice(0, 80));
        let stillEmpty = s2.fields.filter((x) => x.required && x.type !== "checkbox" && !NEVER_FILL.test(`${x.label} ${x.name ?? ""}`));
        if (stillEmpty.length) {
          const fills = await deps2.map(stillEmpty).catch(orOutage([]));
          const n2 = await applyList(page, deps2, stillEmpty, fills, state);
          if (n2) {
            filled += n2;
            state.samePageCount = 0;
            await sleep(500);
            s2 = await snap(page);
            stillEmpty = s2.fields.filter((x) => x.required && x.type !== "checkbox" && !NEVER_FILL.test(`${x.label} ${x.name ?? ""}`));
            if (!stillEmpty.length) continue;
          }
        }
        const pwBoxes2 = s2.allFields.filter((f) => f.type === "password");
        const pwKey = `${(s2.fingerprint ?? "").slice(0, 60)}|pw`;
        if (s2.fields.some((f) => f.type === "password") && pwBoxes2.length && !(state.pressedAsked ?? []).includes(pwKey)) {
          const login = await deps2.existingLogin();
          if (login) {
            state.pressedAsked = [...state.pressedAsked ?? [], pwKey].slice(-30);
            for (const p of pwBoxes2) await fillText(page, p.id, login.password);
            filled += pwBoxes2.length;
            state.samePageCount = 0;
            continue;
          }
        }
        if (stillEmpty.some((f) => SEC_A.test(f.label) || SEC_Q.test(f.label))) {
          const login = await deps2.existingLogin();
          const sec = login ? await securityQuestions(page, stillEmpty, login) : [];
          if (sec.length) {
            filled += sec.length;
            state.samePageCount = 0;
            continue;
          }
        }
        const notTaken = stillEmpty.filter((f) => deps2.hasValue?.(f.label));
        stillEmpty = stillEmpty.filter((f) => !notTaken.includes(f));
        if (notTaken.length && !stillEmpty.length && state.samePageCount < 6) {
          const o3 = await stuckStep(page, deps2, s2, state, `these fields have the applicant's details but the page didn't keep them (they may be locked until an earlier section is finished, or need a different control): ${notTaken.map((f) => cleanLabel(f.label, f.options).slice(0, 40)).join("; ")}`, { kind: "needs_you", reason: "stuck", note: `the portal won't take ${notTaken.map((f) => cleanLabel(f.label, f.options).slice(0, 30)).slice(0, 3).join(", ")} yet; it may need an earlier section finished first` });
          if (o3) return { outcome: o3, state, filled };
          continue;
        }
        for (const f of stillEmpty) if (!notAQuestion(state, f)) ask(state, f);
        if (state.missingDocs?.length) return { outcome: { kind: "needs_you", reason: "documents", note: `the portal needs what your packet doesn't have yet: ${state.missingDocs.slice(0, 6).join("; ")}. Add documents under Documents in Ivyward (or shorten the essay), then choose Try again` }, state, filled };
        const fix = (state.missing ?? []).length || stillEmpty.length ? questionNote(state) : "";
        const err = (s2.errors ?? []).join("; ").slice(0, 160);
        const stop = { kind: "needs_you", reason: fix ? "question" : "stuck", note: fix || (err ? `the portal says: ${err}` : req.length ? `the portal wants: ${req.slice(0, 3).join("; ")}` : "the portal didn't accept this page") };
        if (fix || state.samePageCount >= 6) return { outcome: stop, state, filled };
        const o2 = await stuckStep(page, deps2, s2, state, `the same page came back ${state.samePageCount} times after the usual steps${err ? `; the portal shows: ${err}` : ""}`, stop);
        if (o2) return { outcome: o2, state, filled };
        continue;
      }
      if (IDP_HOST.test(hostOf(s2.url)) && !(deps2.portalUrl && hostOf(deps2.portalUrl) === hostOf(s2.url))) {
        state.idpBacks = (state.idpBacks ?? 0) + 1;
        state.navHistory = [...state.navHistory ?? [], `left ${hostOf(s2.url)} (another company's sign-in): back to the school's portal`].slice(-20);
        if (state.idpBacks > 2 || !deps2.portalUrl) return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal kept sending the agents to another company's sign-in page (Microsoft, Google or similar). Open the portal and sign in with the school's own account option" }, state, filled };
        await page.goto(deps2.portalUrl, { timeout: 45e3 }).catch(() => null);
        continue;
      }
      if (deps2.portalUrl && DEAD_END.test(s2.body.slice(0, 2e3)) && s2.fields.length === 0 && (state.restarts ?? 0) < 2) {
        state.restarts = (state.restarts ?? 0) + 1;
        state.navHistory = [...state.navHistory ?? [], `the portal ended the session ("${(s2.body.match(DEAD_END)?.[0] ?? "").slice(0, 60)}"): started again from the portal`].slice(-20);
        await page.goto(deps2.portalUrl, { timeout: 45e3 }).catch(() => null);
        state.samePageCount = 0;
        continue;
      }
      if (!deps2.goal && deps2.portalUrl && LEAD_PAGE.test(`${s2.url} ${s2.title}`) && !LEAD_PAGE.test(deps2.portalUrl) && (state.leadBacks ?? 0) < 3) {
        state.leadBacks = (state.leadBacks ?? 0) + 1;
        state.navHistory = [...state.navHistory ?? [], `left an enquiry form (${s2.title.slice(0, 40)}) for the application portal`].slice(-20);
        await page.goto(deps2.portalUrl, { timeout: 45e3 }).catch(() => null);
        state.samePageCount = 0;
        continue;
      }
      if (EMAILED_LINK.test(s2.body.slice(0, 6e3)) && !insideForm(s2) && deps2.resumeLink && (state.resumeLinkTries ?? 0) < 3 && Date.now() - (state.resumeLinkAt ?? 0) > 10 * 6e4) {
        state.resumeLinkAt = Date.now();
        state.resumeLinkTries = (state.resumeLinkTries ?? 0) + 1;
        const link = await deps2.resumeLink().catch(() => null);
        if (link) {
          await deps2.progress("opening the link the school emailed to continue the application");
          state.navHistory = [...state.navHistory ?? [], "followed the school's emailed link"].slice(-20);
          await page.goto(link, { timeout: 45e3 }).catch(() => null);
          state.samePageCount = 0;
          state.createClicks = [];
          continue;
        }
      }
      if (deps2.isDone?.(s2) && (state.submitClicked || state.reachedSubmit)) return { outcome: { kind: "submitted", note: "done: the page confirmed it" }, state, filled };
      const kind = classify(s2);
      if (kind === "confirmation") {
        if (state.submitClicked || state.reachedSubmit) return { outcome: { kind: "submitted", note: "portal showed a confirmation" }, state, filled };
      }
      if (kind === "captcha") return { outcome: { kind: "needs_you", reason: "captcha", note: "the portal is showing a bot check. open the live view and complete it; the runner continues on its own" }, state, filled };
      if (kind === "payment") {
        state.reachedSubmit = true;
        return { outcome: { kind: "needs_you", reason: "payment", note: "payment page: open the live view and pay the fee; the runner confirms the submission after" }, state, filled };
      }
      if (state.reset) {
        const r = await resetStep(page, deps2, s2, state);
        if (r === "continue") continue;
        if (r) return { outcome: r, state, filled };
      }
      if (kind === "login") {
        if (state.createNext && !state.triedCreate) {
          const create = find(s2, CREATE) ?? findCreate(s2);
          state.createNext = false;
          if (create) {
            state.triedCreate = true;
            state.accountAt = Date.now();
            await deps2.progress("creating your portal account");
            await click(page, create.id);
            continue;
          }
        }
        let login = await deps2.existingLogin();
        if (login && deps2.signInYourself?.()) return { outcome: { kind: "needs_you", reason: "login", note: "sign in to the portal yourself (your password manager can fill it in); the agents carry on once you're in" }, state, filled };
        if (!login && deps2.loginFromMail) login = await deps2.loginFromMail(Date.now() - 60 * 864e5);
        if (!login) {
          const create = find(s2, CREATE) ?? findCreate(s2);
          if (create && !state.triedCreate) {
            await deps2.progress("creating your portal account");
            state.accountAt = Date.now();
            state.triedCreate = true;
            await click(page, create.id);
            continue;
          }
          const fallback = { kind: "needs_you", reason: "login", note: "couldn't find where to create an account on this portal. Create it where the school says and add it under Portal logins; the agents sign in with it and carry on" };
          const o2 = await stuckStep(page, deps2, s2, state, "this is a sign-in page and there's no login on file yet: find how to create a new account (register, sign up, new applicant, create account, first-time user)", fallback);
          if (o2) return { outcome: o2, state, filled };
          continue;
        }
        const pw = s2.allFields.find((f) => f.type === "password");
        const user = s2.allFields.find((f) => f.type !== "password" && f.type !== "checkbox" && /(e-?mail|user|login|account)/i.test(`${f.label} ${f.autocomplete ?? ""}`)) ?? s2.allFields.find((f) => f.type === "email" || f.type === "text");
        const isIdBox = /user\s*(id|name)|login\s*(id|name)|identifiant|oprid/i.test(`${user?.label ?? ""} ${user?.name ?? ""}`) && !/e-?mail/i.test(user?.label ?? "");
        if (user) await fillText(page, user.id, !login.login_email.includes("@") || !isIdBox ? login.login_email : login.login_email.split("@")[0].replace(/[^a-z0-9._-]/gi, "").slice(0, 30));
        await fillText(page, pw.id, login.password);
        const go = find(s2, SIGNIN) ?? findBy(s2, isSignIn);
        await deps2.progress("signing in to the portal");
        if (go) await click(page, go.id);
        else await frameOf(page).press(`[data-am-id="${pw.id}"]`, "Enter").catch(() => {
        });
        const after = await snap(page);
        if (classify(after) === "login" && LOGIN_REFUSED.test(`${after.body} ${(after.errors ?? []).join(" ")}`)) {
          if (!state.triedMailLogin && deps2.loginFromMail) {
            state.triedMailLogin = true;
            const issued = await deps2.loginFromMail(Date.now() - 60 * 864e5);
            if (issued && (issued.password !== login.password || issued.login_email !== login.login_email)) {
              await deps2.progress("found the login the portal emailed you; signing in");
              continue;
            }
          }
          if (!state.signedIn && !state.triedCreate) {
            const create = find(after, CREATE) ?? findCreate(after);
            if (create) {
              state.triedCreate = true;
              state.accountAt = Date.now();
              await deps2.progress("creating your portal account");
              await click(page, create.id);
              continue;
            }
            const here2 = await page.url();
            if (/\/account\/login\b/i.test(here2) && login.status === "created" && !state.wentBackToCreate) {
              state.wentBackToCreate = true;
              state.createNext = false;
              const u = new URL(here2);
              const back = u.searchParams.get("r");
              state.navHistory = [...state.navHistory ?? [], "the saved login has never worked here: opened the portal's account registration"].slice(-12);
              await page.goto(`${u.origin}/account/register${back ? `?r=${encodeURIComponent(back)}` : ""}`, { timeout: 45e3 }).catch(() => null);
              continue;
            }
            if (deps2.portalUrl && !state.wentBackToCreate && login.status === "created" && !state.accountAt && await page.url() !== deps2.portalUrl) {
              state.createNext = true;
              state.wentBackToCreate = true;
              state.navHistory = [...state.navHistory ?? [], "the saved login has never worked here: back to the portal's front page to create the account"].slice(-12);
              await page.goto(deps2.portalUrl, { timeout: 45e3 }).catch(() => null);
              continue;
            }
          }
          const forgot = findForgot(after);
          const canReset = deps2.canReadMail && deps2.resetLink && deps2.rotatePassword && (state.reset?.tries ?? 0) < 2;
          if (forgot && canReset) {
            state.reset = { stage: "requested", at: Date.now(), tries: (state.reset?.tries ?? 0) + 1 };
            await deps2.progress("the portal rejected the saved password, so the agents are resetting it");
            await click(page, forgot.id);
            continue;
          }
          if (!forgot && canReset && !state.lookedForReset) {
            state.lookedForReset = true;
            const reset = { stage: "requested", at: Date.now(), tries: (state.reset?.tries ?? 0) + 1 };
            const o2 = await stuckStep(page, deps2, after, state, "the portal rejected the saved password. find and press the link to reset or recover the password (it may be called forgot password, reset password, need help signing in, or trouble logging in). do not type anything", { kind: "needs_you", reason: "login", note: "" });
            if (!o2) {
              state.reset = reset;
              await deps2.progress("the portal rejected the saved password, so the agents are resetting it");
              continue;
            }
          }
          if (!state.signedIn) return { outcome: { kind: "needs_you", reason: "account", note: "waiting for you to create the portal account" }, state, filled };
          return { outcome: { kind: "needs_you", reason: "login", note: deps2.canReadMail ? "the portal rejected the saved password and has no reset link the agents could use. Reset it on the portal, save the new one under Portal logins, and the agents sign in again by themselves" : "the portal rejected the saved password. Connect Gmail so the agents can reset it themselves, or reset it on the portal and save the new one under Portal logins" }, state, filled };
        }
        if (classify(after) !== "login") state.signedIn = true;
        continue;
      }
      const pwBoxes = s2.allFields.filter((f) => f.type === "password");
      const currentBox = pwBoxes.find((f) => /\b(current|old|existing|temporary|present|actuel|ancien)\b/i.test(`${f.label} ${f.name ?? ""}`)) ?? (pwBoxes.length === 3 && CHANGE_PW.test(s2.body.slice(0, 3e3)) ? pwBoxes[0] : void 0);
      if ((kind === "signup" || kind === "form") && pwBoxes.length >= 2 && currentBox && deps2.rotatePassword && (state.passwordChanges ?? 0) < 2) {
        const now2 = await deps2.existingLogin();
        if (now2) {
          state.passwordChanges = (state.passwordChanges ?? 0) + 1;
          await deps2.progress("the portal asked for a new password: setting one and saving it under Portal logins");
          const fresh = await deps2.rotatePassword();
          const userBox = s2.fields.find((f) => f.type !== "password" && /\b(user\s*(id|name)|login\s*(id|name)?|identifiant|matricule|e-?mail)\b/i.test(`${f.label} ${f.name ?? ""}`));
          if (userBox) await fillText(page, userBox.id, now2.login_email);
          await fillText(page, currentBox.id, now2.password);
          for (const p of pwBoxes) if (p.id !== currentBox.id) await fillText(page, p.id, fresh.password);
          state.navHistory = [...state.navHistory ?? [], "changed the portal password as it asked, and saved the new one"].slice(-12);
          const go = s2.buttons.find((x) => /^(change|save|submit|update|continue|confirm|ok|modifier|enregistrer|valider)( (my |the )?password)?$/i.test(clean(x.label))) ?? find(s2, CREATE_SUBMIT);
          if (go) await click(page, go.id);
          else await page.pressEnter();
          continue;
        }
      }
      if (kind === "signup") {
        const addAddr = s2.buttons.find((b) => /^(add|enter|update)( an?| your)?( home| mailing| permanent| contact)? address$/i.test(clean(b.label)));
        const addrKey = `${(s2.url.match(/^https?:\/\/[^/]+/) ?? [""])[0]}|address`;
        if (addAddr && !(state.pressedAsked ?? []).includes(addrKey)) {
          state.pressedAsked = [...state.pressedAsked ?? [], addrKey].slice(-30);
          state.navHistory = [...state.navHistory ?? [], `opened "${clean(addAddr.label)}" before creating the account`].slice(-12);
          await click(page, addAddr.id);
          continue;
        }
        const login = await deps2.existingLogin() ?? await deps2.createLogin(deps2.accountEmail);
        const said2 = (s2.errors ?? []).join(" ").trim();
        if (state.signupTries && USERNAME_TAKEN.test(said2) && (state.usernameTries ?? 0) < 3) {
          state.usernameTries = (state.usernameTries ?? 0) + 1;
          const box = usernameBox(s2);
          const now2 = box ? await valueOf(page, box.id) : "";
          if (box && now2) {
            const next2 = withNumber(now2, state.usernameTries + 1);
            await fillText(page, box.id, next2);
            state.navHistory = [...state.navHistory ?? [], `the portal said the username was taken: trying "${next2}"`].slice(-12);
          }
        } else if ((state.signupTries ?? 0) >= 3) {
          return { outcome: { kind: "needs_you", reason: "account", note: said2 ? `the portal didn't create the account. It said: "${said2.slice(0, 200)}"` : "the portal didn't create the account and showed no reason. Open the live view to see the sign-up page" }, state, filled };
        }
        state.signupTries = (state.signupTries ?? 0) + 1;
        await deps2.progress("creating your portal account");
        const others = s2.fields.filter((f) => f.type !== "password");
        for (const f of others.filter((f2) => f2.type === "email" || /e-?mail/i.test(f2.label))) await fillText(page, f.id, login.login_email);
        let rest = [...others.filter((f) => !(f.type === "email" || /e-?mail/i.test(f.label))), ...dateRedo(s2, others)];
        const sec = await securityQuestions(page, rest, login);
        filled += sec.length;
        rest = rest.filter((f) => !sec.includes(f.id));
        filled += await applyFills(page, deps2, rest, state);
        await sleep(1e3);
        await acceptTerms(page, await snap(page));
        await sleep(1500);
        const ready = await snap(page);
        for (const p of ready.allFields.filter((f) => f.type === "password")) await fillText(page, p.id, login.password);
        state.navHistory = [...state.navHistory ?? [], "filled the sign-up form"].slice(-12);
        const go = find(ready, CREATE_SUBMIT) ?? find(s2, CREATE_SUBMIT) ?? s2.buttons.find((b) => CREATE_LOOSE.test(clean(b.label)) && !/(sign ?in|log ?in|cancel|back|clear|reset|forgot)/i.test(b.label));
        if (!go) {
          const o2 = await stuckStep(page, deps2, s2, state, "the sign-up form is filled in; find and press the button that creates the account (it may be at the bottom, below the terms, or be an image or link)", { kind: "needs_you", reason: "stuck", note: "filled the sign-up form but couldn't find the button that creates the account" });
          if (o2) return { outcome: o2, state, filled };
          state.accountAt ??= Date.now();
          continue;
        }
        state.accountAt = Date.now();
        state.navHistory = [...state.navHistory ?? [], `pressed "${clean(go.label)}" to create the account`].slice(-12);
        await click(page, go.id);
        continue;
      }
      if (kind === "verify_code" || kind === "check_email") {
        const since = state.accountAt ?? Date.now() - 14 * 864e5;
        state.verifyWaitSince ??= Date.now();
        if (!deps2.canReadMail) {
          return { outcome: { kind: "needs_you", reason: "verification", note: `the portal sent a verification ${kind === "verify_code" ? "code" : "link"} to your email. open the live view and enter it (connect gmail so the agents can do this for you)` }, state, filled };
        }
        const v = await deps2.verification(since);
        if (!v || !v.code && !v.link) {
          if (Date.now() - state.verifyWaitSince > 20 * 6e4) return { outcome: { kind: "needs_you", reason: "verification", note: "the portal's verification email hasn't reached the agents after 20 minutes. Connect Gmail, or paste the email under Messages \u2192 Paste an email, and they carry on" }, state, filled };
          return { outcome: { kind: "wait", note: "waiting for the portal's verification email", seconds: 60 }, state, filled };
        }
        state.verifyWaitSince = void 0;
        if (kind === "verify_code" && v.code) {
          const box = s2.allFields.find((f) => isCodeBox(f));
          if (!box) return { outcome: { kind: "needs_you", reason: "verification", note: "the portal asked for an emailed code but the agents couldn't find where to type it; open the live view" }, state, filled };
          await fillText(page, box.id, v.code);
          const go = find(s2, VERIFY_BTN);
          if (go) await click(page, go.id);
          else await page.pressEnter();
          continue;
        }
        if (v.link) {
          await deps2.progress("confirming your email with the portal");
          await page.goto(v.link);
          continue;
        }
        return { outcome: { kind: "needs_you", reason: "verification", note: "found the verification email but couldn't use it; open the live view" }, state, filled };
      }
      if (s2.fields.length) {
        const up = await uploadByType(page, deps2, s2, state);
        if (up) {
          filled += up;
          continue;
        }
      }
      const redo = dateRedo(s2, s2.fields);
      if (s2.fields.length || redo.length) {
        await deps2.progress(`filling ${s2.fields.length + redo.length} field${s2.fields.length + redo.length > 1 ? "s" : ""}`);
        filled += await applyFills(page, deps2, [...s2.fields, ...redo], state);
        await acceptTerms(page, s2);
        await sleep(1500);
        const tried = new Set(s2.fields.map((f) => f.id));
        const fresh = (await snap(page)).fields.filter((f) => !tried.has(f.id) || (f.options?.length ?? 0) > (s2.fields.find((x) => x.id === f.id)?.options?.length ?? 0));
        if (fresh.length) filled += await applyFills(page, deps2, fresh, state);
      }
      let now = await snap(page);
      if (now.fields.some((f) => f.required)) {
        const h = await fillHard(page, deps2, state);
        filled += h.filled;
        if (h.outcome) return { outcome: h.outcome, state, filled };
        const unknown2 = h.empty.filter((f) => !deps2.hasValue?.(f.label) && !notAQuestion(state, f));
        if (unknown2.length) {
          for (const f of unknown2) ask(state, f);
          return { outcome: { kind: "needs_you", reason: "question", note: questionNote(state).slice(0, 290) }, state, filled };
        }
        now = await snap(page);
      }
      if (state.missingDocs?.length) {
        return { outcome: { kind: "needs_you", reason: "documents", note: `the portal needs what your packet doesn't have yet: ${state.missingDocs.slice(0, 6).join("; ")}. Add documents under Documents in Ivyward (or shorten the essay), then choose Try again` }, state, filled };
      }
      const submit = find(now, FINAL) ?? (deps2.finalButton ? find(now, deps2.finalButton) : void 0);
      if (submit) {
        state.reachedSubmit = true;
        const d = await deps2.canSubmit();
        if (!d.allowed) return { outcome: { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` }, state, filled };
        await deps2.progress("submitting your signed packet");
        state.submitClicked = true;
        await click(page, submit.id);
        continue;
      }
      const add = now.buttons.find((b) => ADD_ANOTHER.test(clean(b.label)));
      const addKind = add ? entryKind(clean(add.label)) : null;
      if (add && addKind && deps2.fillFromKey) {
        const done = state.entries?.[addKind] ?? 0;
        const probe = await deps2.fillFromKey({ id: "probe", label: addKind === "edu" ? "Institution" : "Employer", type: "text" }, `${addKind}${done + 2}_${addKind === "edu" ? "institution" : "employer"}`);
        const mark = `add|${addKind}|${done + 1}`;
        if (probe && probe.action === "fill" && done < 5 && !(state.pressedAsked ?? []).includes(mark)) {
          state.pressedAsked = [...state.pressedAsked ?? [], mark].slice(-30);
          state.entries = { ...state.entries ?? {}, [addKind]: done + 1 };
          await deps2.progress(`adding your ${addKind === "edu" ? "education" : "work"} entry ${done + 2}`);
          await click(page, add.id);
          continue;
        }
      }
      const haveLogin = !s2.fields.length && !!await deps2.existingLogin();
      const apply = !s2.fields.length ? bestApply(now, state.visited) : void 0;
      let next = find(now, NEXT) ?? (!s2.fields.length && haveLogin ? find(now, LOGIN_LINK) ?? findBy(now, isSignIn) : void 0) ?? (apply && (APPLY_STRONG.test(clean(apply.label)) || START.test(clean(apply.label))) ? apply : void 0) ?? find(now, START) ?? find(now, CREATE) ?? (s2.fields.length ? find(now, CREATE_SUBMIT) : void 0) ?? // a small sub-page (an address, a qualification) closes with OK / Done
      (s2.fields.length ? find(now, /^(ok|okay|done|update)$/i) : void 0) ?? apply;
      if (next && NEW_APP.test(clean(next.label)) && !markNewApp(state, clean(next.label))) {
        if (!state.newAppAllowedUsed && await deps2.allowNewApp?.()) state.newAppAllowedUsed = true;
        else {
          state.newAppBlocked = clean(next.label);
          next = void 0;
        }
      }
      if (next) {
        const formPage = now.allFields.filter((f) => f.type !== "search" && f.type !== "hidden" && !/\bsearch\b/i.test(f.label)).length >= 2;
        if (formPage && deps2.beforeNext && !await deps2.beforeNext({ label: clean(next.label), title: now.title, url: now.url })) {
          return { outcome: { kind: "needs_you", reason: "review", note: "this page is filled in: check it, then approve it in the Ivyward side panel" }, state, filled };
        }
        if (next.href && next === apply) state.visited = [...state.visited ?? [], here(next.href)].slice(-30);
        await click(page, next.id);
        continue;
      }
      if (kind === "confirmation") return { outcome: { kind: "needs_you", reason: "stuck", note: "the portal says the application is complete, but the runner didn't submit it. check it" }, state, filled };
      const o = await stuckStep(page, deps2, now, state, "none of the usual buttons (next, continue, apply, start, sign in, create account) are on this page. if this is a school or program page, find the link that leads to the online application (it may be called apply online, how to apply, start application, or sit in a menu)", { kind: "needs_you", reason: "stuck", note: "can't find the next step on this page; open the portal and move to the next section" });
      if (o) return { outcome: o, state, filled };
    }
    return { outcome: { kind: "continue", note: "continuing" }, state, filled };
  }
  var DETAIL = {
    date_of_birth: "date of birth",
    dob_month: "date of birth",
    dob_day: "date of birth",
    dob_year: "date of birth",
    phone: "phone",
    address_line1: "address",
    address_line2: "address",
    city: "city",
    state: "state/province",
    postal_code: "postal code",
    country: "country",
    gender: "gender",
    citizenship: "citizenship"
  };
  function missingNote(keys) {
    const labels = [...new Set(keys.map((k) => DETAIL[k] ?? (k.startsWith("rec") ? "recommenders" : k.startsWith("edu") ? "education history" : k.startsWith("work") ? "work history" : k.replace(/_/g, " "))))];
    return labels.length ? `add your ${labels.slice(0, 4).join(", ")} in Profile, under Details for application forms, then choose Try again` : "";
  }
  var EMAILED_LINK = /(received|sent you|we('ve| have) sent|check your) (an )?e-?mail (containing|with) a link|link to (allow you to )?(complete|continue|return to|resume|finish) (the|your) (form|application)|resume (your|the) application (from|using) the link/i;
  var insideForm = (s2) => s2.fields.filter((f) => f.type !== "search" && !/\bsearch\b/i.test(f.label)).length >= 3;
  var NAV_BUDGET = 30;
  var NEW_APP = /\b(start|create|begin) (a )?new application\b|\bnew application\b/i;
  var DANGEROUS = /\b(pay|payment|checkout|delete|remove|withdraw|cancel (my |the )?application|deactivate|unsubscribe|sign out|log ?out)\b/i;
  async function navStep(page, deps2, s2, state, why, fallback) {
    if (!deps2.navigate || (state.navCalls ?? 0) >= NAV_BUDGET) return fallback;
    state.navCalls = (state.navCalls ?? 0) + 1;
    const history = state.navHistory ?? [];
    const a = await deps2.navigate({ why, snapshot: s2, history: history.slice(-8), signedIn: !!state.signedIn, haveLogin: !!await deps2.existingLogin() }).catch(orOutage(null));
    if (!a) return fallback;
    const log = (t) => state.navHistory = [...history, t].slice(-12);
    const root2 = (u) => {
      try {
        return new URL(u).hostname.split(".").slice(-2).join(".");
      } catch {
        return "";
      }
    };
    if (a.action === "handoff") {
      log(`handoff: ${a.note}`);
      return { kind: "needs_you", reason: "stuck", note: a.note.slice(0, 280) || fallback.note };
    }
    if (a.action === "wait_email") {
      log("wait for email");
      return { kind: "wait", note: a.note || "waiting for an email from the portal", seconds: 90 };
    }
    if (a.action === "done") {
      log("done?");
      if (s2.confirmation && (state.reachedSubmit || state.submitClicked)) return { kind: "submitted", note: "portal showed a confirmation" };
      return { kind: "needs_you", reason: "stuck", note: `the agents think this application may be finished; please check the portal. ${a.note}`.slice(0, 280) };
    }
    if (a.action === "goto") {
      const onPage = s2.buttons.some((b2) => b2.href === a.url);
      const seg = (u) => {
        try {
          return new URL(u).pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
        } catch {
          return "";
        }
      };
      const seen = [s2.url, ...s2.buttons.map((b2) => b2.href ?? ""), ...state.visited ?? [], deps2.portalUrl ?? ""].filter(Boolean);
      const plausible = onPage || seen.some((u) => root2(u) === root2(a.url) && seg(u) === seg(a.url));
      if (!/^https:\/\//.test(a.url) || !onPage && root2(a.url) !== root2(s2.url) || !plausible) {
        log(`refused goto ${a.url}`);
        return null;
      }
      log(`goto ${a.url}`);
      await page.goto(a.url, { timeout: 45e3 });
      await sleep(1200);
      return null;
    }
    if (a.action === "fill") {
      const f = s2.fields.find((x) => x.id === a.target_id);
      const fill = f && deps2.fillFromKey ? await deps2.fillFromKey(f, a.sheet_key) : null;
      if (!f || !fill || NEVER_FILL.test(`${f.label} ${f.name ?? ""}`)) {
        log(`couldn't fill ${f?.label ?? a.target_id} from ${a.sheet_key}`);
        return null;
      }
      log(`fill "${f.label.slice(0, 40)}" from ${a.sheet_key}`);
      if (fill.action === "upload") {
        const file = await deps2.file(fill.file);
        await frameOf(page).setInputFiles(`[data-am-id="${f.id}"]`, file);
      } else await frameOf(page).evaluate((x) => window.__am.apply(x), fill);
      return null;
    }
    const b = s2.buttons.find((x) => x.id === a.target_id);
    if (!b) {
      log(`no such button ${a.target_id}`);
      return null;
    }
    const label = clean(b.label);
    if (DANGEROUS.test(label)) {
      log(`refused "${label}"`);
      return { kind: "needs_you", reason: /pay|checkout/i.test(label) ? "payment" : "stuck", note: /pay|checkout/i.test(label) ? "payment step: pay the application fee yourself; the agents confirm the submission after" : `the next step is "${label}", which the agents never press for you` };
    }
    if (FINAL.test(label) || /^submit\b/i.test(label)) {
      state.reachedSubmit = true;
      const d = await deps2.canSubmit();
      if (!d.allowed) return { kind: "needs_you", reason: "stuck", note: `ready to submit: ${d.reason}` };
      state.submitClicked = true;
    }
    if (NEW_APP.test(label) && !markNewApp(state, label)) {
      if (!state.newAppAllowedUsed && await deps2.allowNewApp?.()) state.newAppAllowedUsed = true;
      else {
        state.newAppBlocked = label;
        log(`didn't press "${label}": an application was started already`);
        return null;
      }
    }
    log(`click "${label}"`);
    state.navClicks = (state.navClicks ?? 0) + 1;
    await deps2.progress(a.note ? a.note.slice(0, 80) : `pressing "${label}"`);
    await click(page, b.id);
    return null;
  }
  async function stuckStep(page, deps2, s2, state, why, fallback) {
    const look = (x) => `${x.fingerprint}|${x.url}|${x.fields.length}|${x.buttons.map((b) => b.label).join("/")}`;
    const before = look(s2);
    const walled = async () => isBlockPage(await snap(page)) ? { kind: "needs_you", reason: "blocked", note: "this portal blocks the browser the agents are using" } : null;
    const o = await navStep(page, deps2, s2, state, why, fallback);
    if (!o) return await walled();
    if (o.kind === "needs_you" && o.reason === "stuck") {
      const w = await walled();
      if (w) return w;
    }
    if (o.kind !== "needs_you" || o.reason !== "stuck" && o.reason !== "login") return o;
    const v = await visionLoop(page, deps2, state, why, []);
    if (v.outcome) return await walled() ?? v.outcome;
    if (!v.acted) return o;
    return look(await snap(page)) !== before ? null : o;
  }
  async function resetStep(page, deps2, s2, state) {
    const r = state.reset;
    const login = await deps2.existingLogin();
    const pw = s2.allFields.filter((f) => f.type === "password");
    if (r.stage === "requested") {
      const box = s2.allFields.find((f) => f.type !== "password" && f.type !== "checkbox" && f.type !== "hidden" && /(e-?mail|user|login|account|id)/i.test(`${f.label} ${f.name ?? ""} ${f.autocomplete ?? ""}`)) ?? s2.allFields.find((f) => f.type === "email" || f.type === "text");
      if (!box || pw.length || !login) {
        state.reset = void 0;
        return null;
      }
      const isId = /user\s*(id|name)|login\s*(id|name)|identifiant/i.test(`${box.label} ${box.name ?? ""}`) && !/e-?mail/i.test(box.label);
      await fillText(page, box.id, isId && login.login_email.includes("@") ? login.login_email.split("@")[0] : login.login_email);
      const go2 = s2.buttons.find((b) => RESET_BTN.test(clean(b.label)) && !FORGOT.test(clean(b.label)));
      if (go2) await click(page, go2.id);
      else await frameOf(page).press(`[data-am-id="${box.id}"]`, "Enter").catch(() => {
      });
      state.reset = { ...r, stage: "sent", at: Date.now() - 3e4 };
      await deps2.progress("asked the portal for a password reset email");
      return "continue";
    }
    if (r.stage === "sent") {
      if (NO_ACCOUNT.test(s2.body.slice(0, 3e3))) {
        state.reset = void 0;
        return { kind: "needs_you", reason: "account", note: "the portal says there's no account for your email yet. Create it on the portal (or let the agents try again from Ivyward), then save the login under Portal logins" };
      }
      const link = await deps2.resetLink(r.at).catch(() => null);
      if (!link) {
        if (Date.now() - r.at > 20 * 6e4) {
          state.reset = void 0;
          return { kind: "needs_you", reason: "login", note: "the portal's password reset email hasn't arrived after 20 minutes. Reset it on the portal and save the new password under Portal logins" };
        }
        return { kind: "wait", note: "waiting for the portal's password reset email", seconds: 60 };
      }
      state.reset = { ...r, stage: "link" };
      await deps2.progress("opening the password reset link from your email");
      await page.goto(link, { timeout: 45e3 });
      return "continue";
    }
    if (!pw.length) return null;
    const fresh = await deps2.rotatePassword();
    for (const p of pw) await fillText(page, p.id, fresh.password);
    const email2 = s2.allFields.find((f) => f.type === "email" || f.type === "text" && /e-?mail/i.test(f.label));
    if (email2) await fillText(page, email2.id, fresh.login_email).catch(() => {
    });
    const go = find(s2, CREATE_SUBMIT) ?? s2.buttons.find((b) => RESET_BTN.test(clean(b.label)));
    if (go) await click(page, go.id);
    else await page.pressEnter();
    state.reset = void 0;
    state.signedIn = false;
    await deps2.progress("set a new portal password and saved it under Portal logins");
    return "continue";
  }
  async function readAriaOptions(page, fields) {
    for (const f of fields.filter((x) => x.aria && !(x.options ?? []).length).slice(0, 12)) {
      try {
        await frameOf(page).click(`[data-am-id="${f.id}"]`, { timeout: 5e3 });
        await sleep(700);
        f.options = await frameOf(page).evaluate((i) => window.__am.openOptions(i), f.id).catch(() => []);
        await page.pressKey?.("Escape").catch(() => {
        });
        await sleep(200);
      } catch {
      }
    }
  }
  async function chooseAria(page, id, option) {
    await frameOf(page).click(`[data-am-id="${id}"]`, { timeout: 8e3 });
    await sleep(700);
    const picked = await frameOf(page).evaluate((v) => window.__am.pickOption(v), option).catch(() => null);
    if (!picked) await page.pressKey?.("Escape").catch(() => {
    });
    return !!picked;
  }
  var DATE_BOX = /\b(date|birth|birthdate|dob|d\.o\.b)\b/i;
  var DATE_VALUE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|[A-Za-z]{3,9}\.? \d{1,2},? \d{4}|\d{1,2} [A-Za-z]{3,9}\.? \d{4})$/;
  async function applyFills(page, deps2, fields, state) {
    const safe = fields.filter((f) => !NEVER_FILL.test(`${f.label} ${f.name ?? ""}`));
    if (!safe.length) return 0;
    await readAriaOptions(page, safe);
    return applyList(page, deps2, safe, await deps2.map(safe), state);
  }
  async function applyList(page, deps2, safe, fills, state) {
    let n2 = 0;
    if (fills.some((f) => f.action === "fill" && f.source === "username")) {
      const hint = await frameOf(page).evaluate((n3) => (document.body?.innerText ?? "").slice(0, n3), 2e4).catch(() => "");
      if (/\bfirst(name)?\s*\.\s*last(name)?\b|first name\s*\.\s*last name|firstname\.lastname/i.test(hint)) {
        for (const f of fills) {
          const field = safe.find((x) => x.id === f.id);
          if (f.action !== "fill" || f.source !== "username" || !field) continue;
          const alt = deps2.fillFromKey ? await deps2.fillFromKey(field, "username_first_last") : null;
          if (alt && alt.action === "fill") f.value = alt.value;
        }
      }
    }
    if (fills.some((f) => f.action === "fill" && ISO_DATE.test(f.value) && safe.find((x) => x.id === f.id)?.type !== "date")) {
      const hint = await frameOf(page).evaluate((n3) => (document.body?.innerText ?? "").slice(0, n3), 2e4).catch(() => "");
      for (const f of fills) {
        const field = safe.find((x) => x.id === f.id);
        if (f.action === "fill" && ISO_DATE.test(f.value) && field?.type !== "date") f.value = dateAs(f.value, `${field?.label ?? ""} ${hint} ${await page.url()}`);
      }
    }
    for (const kind of ["edu", "work"]) {
      const done = state?.entries?.[kind] ?? 0;
      if (!done || !deps2.fillFromKey) continue;
      for (const f of fills) {
        if (f.action === "skip" || !("source" in f) || !new RegExp(`^${kind}1_`).test(f.source)) continue;
        const field = safe.find((x) => x.id === f.id);
        const next = field ? await deps2.fillFromKey(field, f.source.replace(`${kind}1_`, `${kind}${done + 1}_`)) : null;
        if (next) Object.assign(f, next);
        else Object.assign(f, { action: "skip", reason: `no ${kind} entry ${done + 1}` });
      }
    }
    for (const f of fills) {
      const field = safe.find((x) => x.id === f.id);
      if (f.action !== "fill" || !field?.maxLength || f.value.length <= field.maxLength) continue;
      if (f.source.startsWith("essay:")) {
        if (state) state.missingDocs = [.../* @__PURE__ */ new Set([...state.missingDocs ?? [], `a shorter "${cleanLabel(field.label, field.options).slice(0, 50)}" (the box takes ${field.maxLength} characters; yours has ${f.value.length})`])];
        Object.assign(f, { action: "skip", reason: "too long" });
        continue;
      }
      const cut = f.value.slice(0, field.maxLength);
      f.value = (cut.lastIndexOf(" ") > field.maxLength * 0.6 ? cut.slice(0, cut.lastIndexOf(" ")) : cut).trim();
    }
    for (const f of fills) {
      const n0 = n2;
      try {
        if (f.action === "skip") {
          const field2 = safe.find((x) => x.id === f.id);
          if (state && field2?.type === "file" && field2.required) {
            state.missingDocs = [.../* @__PURE__ */ new Set([...state.missingDocs ?? [], cleanLabel(field2.label, field2.options).slice(0, 80) || "a required document"])];
            continue;
          }
          if (state && f.reason.startsWith("missing:") && field2?.required) {
            state.missing = [.../* @__PURE__ */ new Set([...state.missing ?? [], f.reason.slice(8)])];
            ask(state, field2, f.reason.slice(8));
          }
          continue;
        }
        if (f.action === "upload") {
          const accept = await frameOf(page).evaluate((id) => String(window.__am?.byId?.(id)?.accept ?? ""), f.id).catch(() => "");
          const pdf = !!state?.pdfOnly || /pdf/i.test(accept) && !/(doc|word|officedocument|\*)/i.test(accept);
          const file = await deps2.file(f.file, { pdf });
          await frameOf(page).setInputFiles(`[data-am-id="${f.id}"]`, { ...file, name: safeFileName(file.name) });
          n2++;
          await sleep(1500);
          await settle2(page);
          continue;
        }
        const field = safe.find((x) => x.id === f.id);
        if (field?.aria && (f.action === "choose" || f.action === "fill")) {
          if (await chooseAria(page, f.id, f.action === "choose" ? f.option : f.value)) {
            n2++;
            await settle2(page);
          }
          continue;
        }
        if (field?.combo && f.action === "fill") {
          const sel = `[data-am-id="${f.id}"]`;
          await frameOf(page).fill(sel, f.value, { timeout: 8e3 });
          await sleep(900);
          const picked = await frameOf(page).evaluate((v) => window.__am.pickOption(v), f.value).catch(() => null);
          if (picked) n2++;
          continue;
        }
        const fr = frameOf(page);
        if (f.action === "fill" && fr.typeKeys && field && (field.type === "text" || field.type === "tel") && DATE_BOX.test(`${field.label} ${field.name ?? ""}`) && DATE_VALUE.test(f.value.trim())) {
          try {
            await fr.typeKeys(`[data-am-id="${f.id}"]`, f.value);
            n2++;
            await settle2(page);
            continue;
          } catch {
          }
        }
        const ok = await fr.evaluate((x) => window.__am.apply(x), f);
        if (ok) n2++;
        if (ok && f.action === "fill" && fr.typeKeys && field && ["text", "email", "tel"].includes(field.type) && !field.combo) {
          const want = f.value.toLowerCase().replace(/[^a-z0-9]/g, "");
          const got = (await valueOf(page, f.id)).toLowerCase().replace(/[^a-z0-9]/g, "");
          if (want && got && got !== want && !want.startsWith(got) && /[0-9]/.test(got) !== /[0-9]/.test(want)) {
            await fr.typeKeys(`[data-am-id="${f.id}"]`, f.value).catch(() => {
            });
          }
        }
        if (ok && (f.action === "choose" || f.action === "check")) await settle2(page);
      } catch {
      } finally {
        if (n2 > n0 && deps2.onFilled && f.action !== "skip") {
          const label = safe.find((x) => x.id === f.id)?.label ?? "";
          const value = f.action === "fill" ? f.value : f.action === "choose" ? f.option : f.action === "upload" ? f.file : "ticked";
          try {
            deps2.onFilled({ id: f.id, label, action: f.action, value, source: f.source });
          } catch {
          }
        }
      }
    }
    return n2;
  }
  async function settle2(page) {
    await sleep(300);
    await frameOf(page).evaluate(
      (max) => new Promise((done) => {
        let last = Date.now();
        const start = last;
        const mo = new MutationObserver(() => last = Date.now());
        mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
        const t = setInterval(() => {
          if (Date.now() - last > 700 || Date.now() - start > max) {
            clearInterval(t);
            mo.disconnect();
            done(true);
          }
        }, 100);
      }),
      5e3
    ).catch(() => {
    });
    await page.waitForLoadState("domcontentloaded").catch(() => {
    });
  }
  async function acceptTerms(page, s2) {
    for (const f of s2.fields.filter((x) => x.type === "checkbox" && TERMS.test(x.label))) {
      await frameOf(page).evaluate((id) => window.__am.apply({ id, action: "check" }), f.id).catch(() => {
      });
    }
  }

  // extension/src/chrome-page.ts
  var sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
  function b64(buf) {
    let s2 = "";
    for (let i = 0; i < buf.length; i += 32768) s2 += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + 32768)));
    return btoa(s2);
  }
  async function run(tabId, frameId, func, arg) {
    const res = await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, func, args: arg === void 0 ? [] : [arg] });
    const r = res?.[0];
    if (r?.error) throw new Error(String(r.error?.message ?? r.error));
    return r?.result;
  }
  function pageClick(sel) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const el = deep(sel);
    if (!el) throw new Error("element gone: " + sel);
    el.scrollIntoView({ block: "center", inline: "center" });
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    el.dispatchEvent(new PointerEvent("pointerdown", o));
    el.dispatchEvent(new MouseEvent("mousedown", o));
    el.dispatchEvent(new PointerEvent("pointerup", o));
    el.dispatchEvent(new MouseEvent("mouseup", o));
    el.click();
    return true;
  }
  function pageFill(a) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const el = deep(a.sel);
    if (!el) throw new Error("field gone: " + a.sel);
    el.focus();
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, a.value);
    else el.value = a.value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    return true;
  }
  function pageEnter(sel) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const el = sel ? deep(sel) : document.activeElement;
    if (!el) return false;
    el.focus();
    const o = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    const down = el.dispatchEvent(new KeyboardEvent("keydown", o));
    el.dispatchEvent(new KeyboardEvent("keypress", o));
    el.dispatchEvent(new KeyboardEvent("keyup", o));
    const form = el.form;
    if (down && form) {
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.submit();
    }
    return true;
  }
  function pageFiles(a) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const el = deep(a.sel);
    if (!el) throw new Error("upload box gone");
    const bin = atob(a.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], a.name, { type: a.mime }));
    el.files = dt.files;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function ptClick(a) {
    const el = document.elementFromPoint(a.x, a.y);
    if (!el) return false;
    const o = { bubbles: true, cancelable: true, composed: true, view: window, clientX: a.x, clientY: a.y, button: 0, pointerType: "mouse" };
    el.dispatchEvent(new PointerEvent("pointerover", o));
    el.dispatchEvent(new MouseEvent("mouseover", o));
    el.dispatchEvent(new PointerEvent("pointermove", o));
    el.dispatchEvent(new MouseEvent("mousemove", o));
    if (a.hover) return true;
    const times = a.double ? 2 : 1;
    for (let i = 0; i < times; i++) {
      el.dispatchEvent(new PointerEvent("pointerdown", { ...o, buttons: 1 }));
      el.dispatchEvent(new MouseEvent("mousedown", { ...o, buttons: 1, detail: i + 1 }));
      const f = el.closest("input,textarea,select,[contenteditable=''],[contenteditable=true],[tabindex],button,a");
      if (f && typeof f.focus === "function") f.focus();
      el.dispatchEvent(new PointerEvent("pointerup", o));
      el.dispatchEvent(new MouseEvent("mouseup", { ...o, detail: i + 1 }));
      el.click();
    }
    if (a.double) el.dispatchEvent(new MouseEvent("dblclick", { ...o, detail: 2 }));
    return true;
  }
  function ptType(text) {
    const el = document.activeElement;
    if (!el) return false;
    const key = (k, type) => el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }));
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      for (const ch of text) {
        key(ch, "keydown");
        key(ch, "keypress");
        const v = el.value + ch;
        if (setter) setter.call(el, v);
        else el.value = v;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, inputType: "insertText" }));
        key(ch, "keyup");
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (el.isContentEditable) {
      document.execCommand("insertText", false, text);
      return true;
    }
    return false;
  }
  function ptKey(k) {
    const el = document.activeElement ?? document.body;
    const codes = { Enter: 13, Tab: 9, Escape: 27, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Space: 32, Backspace: 8, PageDown: 34, PageUp: 33, Home: 36, End: 35 };
    const name = k === "Space" ? " " : k;
    const o = { key: name, code: k, keyCode: codes[k] ?? 0, which: codes[k] ?? 0, bubbles: true, cancelable: true };
    const go = el.dispatchEvent(new KeyboardEvent("keydown", o));
    el.dispatchEvent(new KeyboardEvent("keyup", o));
    if (!go) return true;
    if (k === "Tab") {
      const all = Array.from(document.querySelectorAll("a[href],button,input,select,textarea,[tabindex]")).filter((e) => e.tabIndex >= 0 && !e.disabled && e.offsetParent !== null);
      const i = all.indexOf(el);
      all[(i + 1) % all.length]?.focus();
    } else if (k === "Backspace" && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, el.value.slice(0, -1));
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    } else if (k === "Space" && (el instanceof HTMLButtonElement || el instanceof HTMLInputElement && /checkbox|radio/.test(el.type) || el.getAttribute("role") === "checkbox")) {
      el.click();
    } else if (k === "Enter") {
      if (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement) el.click();
      else if (el instanceof HTMLInputElement && el.form) el.form.requestSubmit ? el.form.requestSubmit() : el.form.submit();
    } else if (/^Page(Down|Up)$|^Home$|^End$/.test(k)) {
      const h = window.innerHeight * 0.85;
      if (k === "PageDown") window.scrollBy(0, h);
      else if (k === "PageUp") window.scrollBy(0, -h);
      else window.scrollTo(0, k === "Home" ? 0 : document.body.scrollHeight);
    }
    return true;
  }
  function ptScroll(a) {
    let el = a.x !== void 0 && a.y !== void 0 ? document.elementFromPoint(a.x, a.y) : null;
    while (el && el !== document.body) {
      const st = getComputedStyle(el);
      if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 2) {
        el.scrollBy(0, a.dy);
        return true;
      }
      el = el.parentElement;
    }
    window.scrollBy(0, a.dy);
    return true;
  }
  function ptUpload(a) {
    const el = document.elementFromPoint(a.x, a.y);
    const box = (el instanceof HTMLInputElement && el.type === "file" ? el : null) ?? el?.closest("label")?.querySelector('input[type="file"]') ?? el?.closest("label")?.control ?? el?.closest("div,section,form,li")?.querySelector('input[type="file"]') ?? null;
    if (!(box instanceof HTMLInputElement) || box.type !== "file") return false;
    const bin = atob(a.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], a.name, { type: a.mime }));
    box.files = dt.files;
    box.dispatchEvent(new Event("input", { bubbles: true }));
    box.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function barVisible(show) {
    const el = document.getElementById("ivyward-runner-bar");
    if (el) el.style.visibility = show ? "" : "hidden";
    return true;
  }
  async function shoot(windowId, tabId, quality) {
    await run(tabId, 0, barVisible, false).catch(() => {
    });
    try {
      return await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality });
    } finally {
      await run(tabId, 0, barVisible, true).catch(() => {
      });
    }
  }
  async function captureSmall(tabId) {
    const t = await chrome.tabs.get(tabId);
    if (!t.active) return void 0;
    const url = await shoot(t.windowId, tabId, 55);
    if (typeof OffscreenCanvas === "undefined") return url;
    const bmp = await createImageBitmap(await (await fetch(url)).blob());
    const w = Math.min(720, bmp.width);
    const h = Math.round(bmp.height * w / bmp.width);
    const c = new OffscreenCanvas(w, h);
    c.getContext("2d").drawImage(bmp, 0, 0, w, h);
    const blob = await c.convertToBlob({ type: "image/jpeg", quality: 0.55 });
    const buf = new Uint8Array(await blob.arrayBuffer());
    return "data:image/jpeg;base64," + b64(buf);
  }
  async function capture(tabId) {
    const t = await chrome.tabs.get(tabId);
    if (!t.active) await chrome.tabs.update(tabId, { active: true });
    const url = await shoot(t.windowId, tabId, 60);
    const dpr = await run(tabId, 0, (() => window.devicePixelRatio || 1)) || 1;
    const blob = await (await fetch(url)).blob();
    if (dpr === 1 || typeof OffscreenCanvas === "undefined") return new Uint8Array(await blob.arrayBuffer());
    const bmp = await createImageBitmap(blob);
    const w = Math.round(bmp.width / dpr);
    const h = Math.round(bmp.height / dpr);
    const c = new OffscreenCanvas(w, h);
    c.getContext("2d").drawImage(bmp, 0, 0, w, h);
    return new Uint8Array(await (await c.convertToBlob({ type: "image/jpeg", quality: 0.6 })).arrayBuffer());
  }
  function chromePage(tabId) {
    let mainUrl = "";
    const frame = (frameId, url) => ({
      isMain: frameId === 0,
      url: () => frameId === 0 ? mainUrl || url : url,
      helper: async () => {
        await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ["dom-helper.js"] });
      },
      evaluate: (fn, arg) => run(tabId, frameId, fn, arg),
      click: async (sel) => {
        await run(tabId, frameId, pageClick, sel);
      },
      fill: async (sel, value) => {
        await run(tabId, frameId, pageFill, { sel, value });
      },
      press: async (sel) => {
        await run(tabId, frameId, pageEnter, sel);
      },
      typeKeys: async (sel, text) => {
        await run(tabId, frameId, pageClick, sel);
        await run(tabId, frameId, pageFill, { sel, value: "" });
        await run(tabId, frameId, ptType, text);
        await run(tabId, frameId, ptKey, "Tab");
      },
      setInputFiles: async (sel, file) => {
        await run(tabId, frameId, pageFiles, { sel, b64: b64(file.buffer), name: file.name, mime: file.mime });
      }
    });
    const waitLoad = async (timeout, settle3) => {
      const end = Date.now() + timeout;
      await sleep2(250);
      while (Date.now() < end) {
        const t = await chrome.tabs.get(tabId);
        mainUrl = t.url || mainUrl;
        if (t.status === "complete") break;
        await sleep2(300);
      }
      if (settle3) await sleep2(settle3);
    };
    return {
      url: async () => {
        const t = await chrome.tabs.get(tabId);
        mainUrl = t.url || mainUrl;
        return mainUrl;
      },
      mainFrame: () => frame(0, mainUrl),
      frames: async () => {
        const all = await chrome.webNavigation.getAllFrames({ tabId }) ?? [];
        const main = all.find((f) => f.frameId === 0);
        if (main) mainUrl = main.url;
        return all.filter((f) => !f.errorOccurred).map((f) => frame(f.frameId, f.url));
      },
      goto: async (url, o) => {
        await chrome.tabs.update(tabId, { url });
        await waitLoad(o?.timeout ?? 45e3, 600);
      },
      waitForLoadState: (state, o) => waitLoad(o?.timeout ?? 15e3, state === "networkidle" ? 700 : 0),
      pressEnter: async () => {
        await run(tabId, 0, pageEnter, null);
      },
      // eyes and hands for the screenshot steps. chrome only captures the tab on screen, so it's brought to the front
      screenshot: () => capture(tabId),
      mouseClick: async (x, y) => {
        await run(tabId, 0, ptClick, { x, y });
      },
      doubleClick: async (x, y) => {
        await run(tabId, 0, ptClick, { x, y, double: true });
      },
      hover: async (x, y) => {
        await run(tabId, 0, ptClick, { x, y, hover: true });
      },
      typeText: async (text) => {
        await run(tabId, 0, ptType, text);
      },
      pressKey: async (key) => {
        await run(tabId, 0, ptKey, key);
      },
      scrollBy: async (dy, x, y) => {
        await run(tabId, 0, ptScroll, { dy, x, y });
      },
      goBack: async () => {
        await chrome.tabs.goBack(tabId).catch(() => null);
        await waitLoad(2e4, 500);
      },
      uploadAt: async (x, y, file) => run(tabId, 0, ptUpload, { x, y, b64: b64(file.buffer), name: file.name, mime: file.mime })
    };
  }

  // extension/src/pure.ts
  var DEFAULT_API = "https://tryivyward.com";
  function safeApi(u) {
    try {
      const x = new URL(u);
      const local = x.hostname === "localhost" || x.hostname === "127.0.0.1";
      if (x.protocol === "https:" && /(^|\.)tryivyward\.com$/.test(x.hostname) || local && /^https?:$/.test(x.protocol)) return x.origin;
    } catch {
    }
    return DEFAULT_API;
  }
  var root = (h) => {
    const parts = h.toLowerCase().replace(/^www\./, "").split(".");
    const two = parts.length >= 3 && parts[parts.length - 1].length === 2 && /^(ac|edu|co|com|org|gov|net|sch|or|ne|go)$/.test(parts[parts.length - 2]);
    return parts.slice(two ? -3 : -2).join(".");
  };
  var backoff = (n2) => Math.min(30, [1, 2, 5, 15][Math.min(n2, 4) - 1] ?? 30) * 6e4;

  // extension/src/background.ts
  var RUN_MS = 15 * 6e4;
  var VERSION = chrome.runtime.getManifest().version;
  var GROUP_TITLE = "Ivyward";
  var PAY_HOST = /(^|\.)(flywire\.com|paypal\.com|stripe\.com|checkout\.stripe\.com|braintreegateway\.com|cybersource\.com|authorize\.net|paymentus\.com|touchnet\.(com|net)|transact\.com|nelnet\.(com|net)|worldpay\.com|adyen\.com|paystack\.co|paystack\.com|flutterwave\.com)$/i;
  var MAX_PAGES = 15;
  var sleep3 = (ms) => new Promise((r) => setTimeout(r, ms));
  async function nap(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await sleep3(Math.min(15e3, end - Date.now()));
      await chrome.runtime.getPlatformInfo();
    }
  }
  async function cfg() {
    const c = await chrome.storage.local.get({ api: DEFAULT_API, token: "", auto: true, approval: "submit", parallel: 2, pmSignIn: false, checkins: true });
    return { ...c, api: safeApi(c.api) };
  }
  async function api(path, opts = {}) {
    const c = await cfg();
    if (!c.token) throw new Error("not connected: open Ivyward and choose Connect Chrome");
    const res = await fetch(c.api.replace(/\/$/, "") + path, {
      ...opts,
      headers: { authorization: `Bearer ${c.token}`, ...opts.body ? { "content-type": "application/json" } : {}, ...opts.headers || {} }
    });
    if (res.status === 401) throw new Error("this browser was disconnected: connect it again from Ivyward");
    return res;
  }
  async function apiJson(path, opts) {
    const res = await api(path, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `error ${res.status}`);
    return json;
  }
  var eng = (application, op, body = {}) => apiJson("/api/runner/engine", { method: "POST", body: JSON.stringify({ application, op, ...body }) });
  var panelApi = (body) => apiJson("/api/runner/panel", { method: "POST", body: JSON.stringify(body) });
  var runs = /* @__PURE__ */ new Map();
  var control = /* @__PURE__ */ new Map();
  var lastTasks = null;
  var publishTimer;
  async function publish() {
    const pending = (await chrome.storage.session.get({ pending: [] })).pending;
    await chrome.storage.session.set({ runs: [...runs.values()] });
    const waiting = (lastTasks?.tasks ?? []).filter((t) => t.runner_status === "needs_you" && t.mode === "extension").length;
    const n2 = pending.length + waiting;
    await chrome.action.setBadgeText({ text: n2 ? String(n2) : runs.size ? "\u2022" : "" }).catch(() => {
    });
    await chrome.action.setBadgeBackgroundColor({ color: n2 ? "#ea580c" : "#4f46e5" }).catch(() => {
    });
  }
  chrome.storage.session.set({ pending: [], runs: [] }).catch(() => {
  });
  async function setPhase(taskId, phase, st) {
    const r = runs.get(taskId);
    if (!r) return;
    if (phase && phase !== r.phase) r.log = [...r.log, { at: Date.now(), text: phase.slice(0, 140) }].slice(-40);
    r.phase = phase;
    if (st) r.state = st;
    await publish();
    await banner(r.tabId, r.school, phase, r.state);
  }
  async function tasks() {
    lastTasks = await apiJson("/api/runner/tasks");
    await publish();
    return lastTasks;
  }
  function notify(id, title, message) {
    chrome.notifications.create(id + ":" + Date.now(), { type: "basic", iconUrl: "icons/icon-128.png", title, message, priority: 2 });
  }
  chrome.notifications.onClicked.addListener(async (nid) => {
    const r = runs.get(nid.split(":")[0]);
    if (r) await focusTab(r.tabId);
    else await openPanel();
  });
  async function focusTab(tabId) {
    const t = await chrome.tabs.update(tabId, { active: true }).catch(() => null);
    if (t) await chrome.windows.update(t.windowId, { focused: true }).catch(() => {
    });
  }
  async function openPanel(windowId) {
    try {
      const w = windowId ?? (await chrome.windows.getLastFocused()).id;
      await chrome.sidePanel.open({ windowId: w });
    } catch {
    }
  }
  async function tabAlive(tabId) {
    return !!await chrome.tabs.get(tabId).catch(() => null);
  }
  async function intoGroup(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      const { groupId } = await chrome.storage.session.get({ groupId: -1 });
      let gid = -1;
      if (groupId >= 0) {
        const g = await chrome.tabGroups.get(groupId).catch(() => null);
        if (g && g.windowId === tab.windowId) gid = groupId;
      }
      gid = await chrome.tabs.group(gid >= 0 ? { tabIds: [tabId], groupId: gid } : { tabIds: [tabId] });
      await chrome.tabGroups.update(gid, { title: GROUP_TITLE, color: "purple" });
      await chrome.storage.session.set({ groupId: gid });
    } catch {
    }
  }
  function pageBanner(a) {
    const ID = "ivyward-runner-bar";
    let host = document.getElementById(ID);
    if (a.hide) {
      host?.remove();
      return true;
    }
    if (!host) {
      host = document.createElement("div");
      host.id = ID;
      host.setAttribute("aria-hidden", "true");
      host.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;pointer-events:none";
      const root3 = host.attachShadow({ mode: "closed" });
      host.__root = root3;
      root3.innerHTML = `<style>
      .bar{pointer-events:auto;display:flex;gap:8px;align-items:center;font:12px/1.3 system-ui,sans-serif;background:#1c1530;color:#fff;border-radius:999px;padding:6px 6px 6px 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);max-width:340px}
      .dot{width:8px;height:8px;border-radius:50%;background:#a78bfa;flex:none}
      .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      button{font:inherit;border:0;border-radius:999px;padding:4px 10px;cursor:pointer;background:#fff;color:#1c1530}
      button.ghost{background:transparent;color:#d8ccff}
    </style><div class="bar"><span class="dot"></span><span class="t"></span><button class="ghost" data-a="panel">Details</button><button data-a="pause">Pause</button></div>`;
      root3.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (b) chrome.runtime.sendMessage({ type: "banner:" + b.dataset.a });
      });
      document.documentElement.appendChild(host);
    }
    const root2 = host.__root;
    root2.querySelector(".t").textContent = a.state === "paused" || a.state === "taken_over" ? `Ivyward paused \xB7 ${a.school}` : `Ivyward is working \xB7 ${a.phase}`;
    const btn = root2.querySelector('[data-a="pause"]');
    btn.textContent = a.state === "paused" || a.state === "taken_over" ? "Resume" : "Pause";
    btn.dataset.a = a.state === "paused" || a.state === "taken_over" ? "resume" : "pause";
    return true;
  }
  async function banner(tabId, school, phase, state, hide2 = false) {
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, func: pageBanner, args: [{ school, phase: phase.slice(0, 80), state, hide: hide2 }] }).catch(() => {
    });
  }
  chrome.webNavigation.onCompleted.addListener((d) => {
    if (d.frameId !== 0) return;
    for (const r of runs.values()) if (r.tabId === d.tabId) banner(r.tabId, r.school, r.phase, r.state);
  });
  async function ask2(p, minutes) {
    const id = `${p.taskId}:${p.kind}:${Date.now()}`;
    const { pending } = await chrome.storage.session.get({ pending: [] });
    await chrome.storage.session.set({ pending: [...pending.filter((x) => !(x.taskId === p.taskId && x.kind === p.kind)), { ...p, id, at: Date.now() }] });
    await publish();
    notify(p.taskId, p.school, p.title);
    const end = Date.now() + minutes * 6e4;
    let answer = null;
    while (Date.now() < end) {
      const { answers } = await chrome.storage.session.get({ answers: {} });
      if (id in answers) {
        answer = !!answers[id];
        delete answers[id];
        await chrome.storage.session.set({ answers });
        break;
      }
      const c = control.get(p.taskId);
      if (c?.stop && c.why !== "offsite") break;
      await sleep3(1e3);
      await chrome.runtime.getPlatformInfo();
    }
    const { pending: now } = await chrome.storage.session.get({ pending: [] });
    await chrome.storage.session.set({ pending: now.filter((x) => x.id !== id) });
    await publish();
    return answer;
  }
  function closePage(r, tabUrl) {
    const last = r.pages[r.pages.length - 1];
    if (r.current && !r.current.fills.length && last && last.url === r.current.url) {
      if (r.current.shot) last.shot = r.current.shot;
    } else if (r.current && (r.current.fills.length || r.current.shot)) {
      r.pages = [...r.pages, r.current].slice(-MAX_PAGES);
    }
    r.current = tabUrl ? { title: "", url: tabUrl, fills: [] } : null;
  }
  async function finishPage(taskId) {
    const r = runs.get(taskId);
    if (!r?.current) return;
    const tab = await chrome.tabs.get(r.tabId).catch(() => null);
    if (!tab) return;
    r.current.title = tab.title || r.current.title;
    if (tab.active) r.current.shot = await captureSmall(r.tabId).catch(() => void 0);
    const page = r.current;
    if (page.fills.length) {
      panelApi({ op: "page", application: taskId, title: page.title.slice(0, 300), url: page.url.slice(0, 2e3), filled: page.fills.map((f) => f.label.slice(0, 200)).slice(0, 150), shot: page.shot?.replace(/^data:image\/jpeg;base64,/, "") }).catch(() => {
      });
    }
    closePage(r, tab.url);
    await publish();
  }
  function hostOf2(u) {
    try {
      return u ? new URL(u).hostname : "";
    } catch {
      return "";
    }
  }
  async function allowed(taskId) {
    const { allow } = await chrome.storage.local.get({ allow: {} });
    return /* @__PURE__ */ new Set([...control.get(taskId)?.allow ?? [], ...allow[taskId] ?? []]);
  }
  async function remember(taskId, host) {
    const { allow } = await chrome.storage.local.get({ allow: {} });
    const a = allow;
    a[taskId] = [.../* @__PURE__ */ new Set([...a[taskId] ?? [], root(host)])].slice(-20);
    await chrome.storage.local.set({ allow: a });
    control.get(taskId)?.allow.add(root(host));
  }
  chrome.webNavigation.onCommitted.addListener(async (d) => {
    if (d.frameId !== 0 || !/^https?:/.test(d.url)) return;
    for (const r of runs.values()) {
      if (r.tabId !== d.tabId) continue;
      const c = control.get(r.taskId);
      const h = hostOf2(d.url);
      if (!c || !h || IDP_HOST.test(h) || PAY_HOST.test(h)) return;
      if ((await allowed(r.taskId)).has(root(h))) return;
      c.stop = true;
      c.why = "offsite";
      c.offsite = h;
    }
  });
  function deps(taskId, start, tabId, s2) {
    const host = async () => new URL((await chrome.tabs.get(tabId)).url).hostname;
    let lastNote = "";
    const typed = /* @__PURE__ */ new Map();
    if (!sheets.has(taskId)) apiJson(`/api/runner/sheet?application=${taskId}`).then((d) => sheets.set(taskId, d)).catch(() => {
    });
    let checkedAt = 0;
    return {
      shouldStop: () => {
        const c = control.get(taskId);
        if (Date.now() - checkedAt > 6e3) {
          checkedAt = Date.now();
          apiJson("/api/runner/tasks").then((d) => {
            const t = d.tasks.find((x) => x.id === taskId);
            if ((!t || t.mode !== "extension") && c) {
              c.stop = true;
              c.why = "ivyward";
            }
          }).catch(() => {
          });
        }
        return !!c?.stop;
      },
      map: async (fields) => (await apiJson("/api/runner/map", { method: "POST", body: JSON.stringify({ application: taskId, host: await host().catch(() => void 0), fields: fields.slice(0, 150).map((f) => ({ id: f.id, label: f.label.slice(0, 400), type: f.type, name: f.name?.slice(0, 200), options: f.options?.slice(0, 300).map((o) => o.slice(0, 200)), required: f.required })) }) })).fills,
      file: async (key, want) => {
        if (!sheets.has(taskId)) sheets.set(taskId, await apiJson(`/api/runner/sheet?application=${taskId}`));
        const f = sheets.get(taskId).files.find((x) => x.key === key);
        if (!f) throw new Error("file not in the packet");
        const res = await api(want?.pdf && f.url.includes("document=") ? `${f.url}${f.url.includes("?") ? "&" : "?"}pdf=1` : f.url);
        if (!res.ok) throw new Error("couldn't fetch " + f.label);
        const named = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1];
        return { name: named || f.filename, mime: res.headers.get("content-type") || "application/octet-stream", buffer: new Uint8Array(await res.arrayBuffer()) };
      },
      // the server checks the packet is signed and paid for; then the applicant sees every answer and says submit.
      // nothing is submitted from this browser without that yes
      canSubmit: async () => {
        const d = await apiJson("/api/runner/check", { method: "POST", body: JSON.stringify({ application: taskId }) });
        if (!d.allowed) return d;
        const r = runs.get(taskId);
        await finishPage(taskId);
        if (r) await setPhase(taskId, "waiting for you to review and submit", "waiting");
        const yes = await ask2({ taskId, school: r?.school ?? "", kind: "submit", title: "Everything is filled in. Check your answers in the side panel, then choose Submit." }, 60);
        if (r) await setPhase(taskId, yes ? "submitting" : "waiting for your review", "working");
        return yes ? d : { allowed: false, reason: "waiting for you to review the answers and choose Submit in the Ivyward side panel" };
      },
      existingLogin: async () => (await eng(taskId, "login_get", { host: await host() })).login,
      createLogin: async (email2) => (await eng(taskId, "login_create", { host: await host(), email: email2 })).login,
      accountEmail: start.accountEmail,
      canReadMail: start.canReadMail,
      verification: async (since) => (await eng(taskId, "verification", { host: await host(), since })).found,
      navigate: async (input) => (await eng(taskId, "navigate", { host: await host(), input: { ...input, snapshot: { ...input.snapshot, body: input.snapshot.body.slice(0, 4e3) } } })).action,
      fillFromKey: async (field, key) => (await eng(taskId, "fill_key", { field: { id: field.id, label: field.label.slice(0, 400), type: field.type, name: field.name, options: field.options?.slice(0, 300), required: field.required }, key })).fill,
      loginFromMail: start.canReadMail ? async (since) => (await eng(taskId, "login_mail", { host: await host(), since })).login : void 0,
      decide: async (fields, page) => (await eng(taskId, "decide", { fields: fields.slice(0, 60).map((f) => ({ id: f.id, label: f.label.slice(0, 400), type: f.type, name: f.name?.slice(0, 200), options: f.options?.slice(0, 300).map((o) => o.slice(0, 200)), required: f.required })), page: { url: page.url.slice(0, 2e3), title: page.title.slice(0, 300), body: page.body.slice(0, 4e3), errors: (page.errors ?? []).slice(0, 20).map((e) => e.slice(0, 300)) } })).fills ?? [],
      resetLink: start.canReadMail ? async (since) => (await eng(taskId, "reset_link", { host: await host(), since })).link : void 0,
      rotatePassword: async () => (await eng(taskId, "rotate", { host: await host() })).login,
      // screenshot steps: the picture goes to Ivyward, which picks the move (and the value to type, from the fill sheet)
      see: async (v) => {
        let bin = "";
        for (let i = 0; i < v.image.length; i += 32768) bin += String.fromCharCode.apply(null, Array.from(v.image.subarray(i, i + 32768)));
        const r = await eng(taskId, "see", { host: await host(), image: btoa(bin), goal: v.goal.slice(0, 400), url: v.url.slice(0, 2e3), history: v.history.slice(-12).map((h) => h.slice(0, 200)), empty: v.empty.slice(0, 30).map((e) => e.slice(0, 200)), marks: v.marks.slice(0, 120).map((m) => ({ ...m, type: m.type.slice(0, 30), label: m.label.slice(0, 200), value: m.value.slice(0, 200) })) });
        if (r.action?.sheet_key && typeof r.value === "string") typed.set(r.action.sheet_key, r.value);
        return r.action ?? null;
      },
      sheetValue: (key) => typed.get(key) ?? null,
      files: () => sheets.get(taskId)?.files.map((f) => f.key) ?? [],
      progress: async (note) => {
        if (note === lastNote) return;
        lastNote = note;
        await setPhase(taskId, note);
        await eng(taskId, "progress", { note: note.slice(0, 300) }).catch(() => {
        });
      },
      onFilled: (f) => {
        const r = runs.get(taskId);
        if (!r) return;
        if (!r.current) r.current = { title: "", url: "", fills: [] };
        if (!r.current.fills.some((x) => x.id === f.id)) r.answered++;
        r.current.fills = [...r.current.fills.filter((x) => x.id !== f.id), { id: f.id, label: f.label.replace(/\s+/g, " ").trim().slice(0, 160), action: f.action, value: f.value.slice(0, 300) }].slice(-120);
        clearTimeout(publishTimer);
        publishTimer = setTimeout(publish, 250);
      },
      beforeNext: async (p) => {
        await finishPage(taskId);
        if (s2.approval !== "page") return true;
        const c = control.get(taskId);
        if (c?.approvedPage) {
          c.approvedPage = false;
          return true;
        }
        const r = runs.get(taskId);
        await setPhase(taskId, "waiting for you to approve this page", "waiting");
        const yes = await ask2({ taskId, school: r?.school ?? "", kind: "page", title: `Page filled in: ${p.title.slice(0, 80)}. Approve it to go on to "${p.label.slice(0, 40)}".` }, 30);
        await setPhase(taskId, yes ? `pressing "${p.label.slice(0, 40)}"` : "waiting for you", yes ? "working" : "waiting");
        return !!yes;
      },
      signInYourself: () => s2.pmSignIn,
      allowNewApp: async () => !!(await eng(taskId, "allow_new_app").catch(() => ({}))).allow
    };
  }
  var failures = /* @__PURE__ */ new Map();
  var sheets = /* @__PURE__ */ new Map();
  async function peek(tabId) {
    try {
      await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ["dom-helper.js"] });
      const [r] = await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, func: () => window.__am.snapshot() });
      return r?.result ?? null;
    } catch {
      return null;
    }
  }
  async function watch(tabId, minutes, done, taskId) {
    const end = Date.now() + minutes * 6e4;
    while (Date.now() < end) {
      await nap(4e3);
      if (!await tabAlive(tabId)) return false;
      if (taskId && control.get(taskId)?.stop && control.get(taskId)?.why !== "offsite") return false;
      const s2 = await peek(tabId);
      if (s2 && done(s2)) return true;
    }
    return false;
  }
  function readBack(ids) {
    const deep = (q) => {
      const rs = [document];
      for (let i = 0; i < rs.length && rs.length < 400; i++) {
        const hit = rs[i].querySelector(q);
        if (hit) return hit;
        for (const e of rs[i].querySelectorAll("*")) if (e.shadowRoot) rs.push(e.shadowRoot);
      }
      return null;
    };
    const out = {};
    for (const id of ids) {
      const el = deep(`[data-am-id="${id}"]`);
      if (!el) {
        out[id] = null;
        continue;
      }
      if (el instanceof HTMLSelectElement) out[id] = el.selectedIndex >= 0 ? el.options[el.selectedIndex].text.trim() : "";
      else if (el.type === "checkbox") out[id] = el.checked ? "ticked" : "";
      else if (el.type === "radio") {
        const group = el.name ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)) : [el];
        const on = group.find((g) => g.checked);
        out[id] = on ? (on.labels?.[0]?.textContent ?? on.value).trim() : "";
      } else if (el.type === "file" || el.type === "password") out[id] = null;
      else out[id] = String(el.value ?? "");
    }
    return out;
  }
  async function learnCorrections(taskId) {
    const r = runs.get(taskId);
    if (!r) return 0;
    const answers = [...r.pages.slice(-3).flatMap((p) => p.fills), ...r.current?.fills ?? []].filter((a) => a.action !== "upload");
    if (!answers.length) return 0;
    const [res] = await chrome.scripting.executeScript({ target: { tabId: r.tabId, frameIds: [0] }, func: readBack, args: [answers.map((a) => a.id)] }).catch(() => [null]);
    const now = res?.result ?? {};
    const items = answers.filter((a) => now[a.id] != null && now[a.id].trim() !== a.value.trim() && now[a.id].trim()).map((a) => ({ label: a.label, value: now[a.id].trim().slice(0, 2e3) }));
    if (!items.length) return 0;
    const tab = await chrome.tabs.get(r.tabId).catch(() => null);
    await panelApi({ op: "corrections", application: taskId, host: hostOf2(tab?.url), items: items.slice(0, 60) }).catch(() => {
    });
    return items.length;
  }
  async function runTask(task, opts = {}) {
    if (runs.has(task.id)) return;
    const s2 = await cfg();
    const c = { stop: false, why: "", allow: /* @__PURE__ */ new Set() };
    control.set(task.id, c);
    let tabId;
    try {
      const start = await eng(task.id, "start", { claim: !!opts.claim });
      if (start.stop) {
        if (opts.claim) notify(task.id, task.school, start.stop);
        return;
      }
      for (const u of [start.url, task.portal_url]) if (hostOf2(u)) c.allow.add(root(hostOf2(u)));
      const { tabs: kept } = await chrome.storage.session.get({ tabs: {} });
      const prev = kept[task.id];
      tabId = opts.tabId ?? (prev && await tabAlive(prev) ? prev : void 0);
      if (!tabId) tabId = (await chrome.tabs.create({ url: start.url, active: !!opts.focus })).id;
      else if (opts.focus) await focusTab(tabId);
      if (opts.tabId) c.allow.add(root(hostOf2((await chrome.tabs.get(tabId)).url)));
      await chrome.storage.session.set({ tabs: { ...kept, [task.id]: tabId } });
      await intoGroup(tabId);
      runs.set(task.id, { taskId: task.id, school: task.school, tabId, startedAt: Date.now(), phase: "starting", state: "working", pages: [], current: null, log: [], answered: 0 });
      await setPhase(task.id, "starting");
      const page = chromePage(tabId);
      await page.waitForLoadState("domcontentloaded", { timeout: 45e3 }).catch(() => {
      });
      let state = start.state;
      for (let round = 0; round < 20; round++) {
        let outcome;
        let filled = 0;
        try {
          const r = await runEngine(page, deps(task.id, start, tabId, s2), state, RUN_MS);
          state = r.state;
          outcome = r.outcome;
          filled = r.filled;
        } catch (e) {
          if (!await tabAlive(tabId)) outcome = { kind: "needs_you", reason: "stuck", note: "the portal tab was closed. Choose Run in my Chrome to carry on" };
          else outcome = { kind: "failed", note: `the agents hit a problem in Chrome: ${String(e?.message ?? e).slice(0, 160)}` };
        }
        if (c.stop) {
          if (c.why === "offsite") {
            const h = c.offsite ?? "";
            c.stop = false;
            c.why = "";
            await setPhase(task.id, `waiting: is ${h} part of ${task.school}'s application?`, "waiting");
            const yes = await ask2({ taskId: task.id, school: task.school, kind: "offsite", host: h, title: `The agents went to ${h}, which isn't ${task.school}'s portal. Let them work there?` }, 30);
            if (yes) {
              await remember(task.id, h);
              await setPhase(task.id, "carrying on", "working");
              continue;
            }
            await chrome.tabs.goBack(tabId).catch(() => {
            });
            outcome = { kind: "needs_you", reason: "stuck", note: `the agents were stopped from working on ${h}. Open the portal tab and take the next step yourself, then choose Run in my Chrome` };
          } else if (c.why === "pause" || c.why === "takeover") {
            await eng(task.id, "save", { state, url: (await chrome.tabs.get(tabId).catch(() => null))?.url }).catch(() => {
            });
            await setPhase(task.id, c.why === "takeover" ? "you have the wheel: hand back in the side panel when you're done" : "paused: resume from the side panel", c.why === "takeover" ? "taken_over" : "paused");
            const end = Date.now() + 2 * 36e5;
            while (c.stop && Date.now() < end && await tabAlive(tabId)) await nap(2e3);
            if (c.stop) {
              const gone = !await tabAlive(tabId);
              await eng(task.id, "finish", { state, outcome: { kind: "needs_you", reason: "stopped", note: gone ? "the portal tab was closed while it was paused. Choose Run in my Chrome to carry on" : "paused in Chrome for two hours. Choose Run in my Chrome to carry on" } }).catch(() => {
              });
              break;
            }
            await setPhase(task.id, "carrying on", "working");
            continue;
          } else {
            if (c.why === "ivyward") notify(task.id, task.school, "Paused in Ivyward. The tab stays open; nothing else happens until you resume.");
            else await eng(task.id, "finish", { state, outcome: { kind: "needs_you", reason: "stopped", note: "you stopped it in Chrome. Choose Run in my Chrome to carry on" } }).catch(() => {
            });
            break;
          }
        }
        const tab = await chrome.tabs.get(tabId).catch(() => null);
        const url = tab?.url;
        const host = hostOf2(url) || void 0;
        const fin = await eng(task.id, "finish", { state, url, filled, host, outcome }).catch(() => ({}));
        if (fin.stop) {
          notify(task.id, task.school, "Paused in Ivyward. The tab stays open; nothing else happens until you resume.");
          break;
        }
        if (outcome.kind === "continue") continue;
        if (outcome.kind === "wait") {
          await setPhase(task.id, "waiting for an email", "waiting");
          await nap(Math.min(outcome.seconds, 30 * 60) * 1e3);
          await setPhase(task.id, "carrying on", "working");
          continue;
        }
        if (outcome.kind === "submitted") {
          await finishPage(task.id);
          notify(task.id, `${task.school}: submitted`, "The application went in. Ivyward has recorded it.");
          break;
        }
        if (outcome.kind === "needs_you" && ["captcha", "blocked", "payment", "login", "review"].includes(outcome.reason)) {
          const k = outcome.reason;
          if (k === "review") {
            const yes = await ask2({ taskId: task.id, school: task.school, kind: "page", title: "This page is waiting for your approval in the side panel." }, 60);
            if (yes) {
              await setPhase(task.id, "carrying on", "working");
              state = { ...state, samePageCount: 0 };
              c.approvedPage = true;
              continue;
            }
            break;
          }
          if (k === "login" && !s2.pmSignIn) {
            notify(task.id, `${task.school}: needs you`, fin.note || outcome.note);
            break;
          }
          const what = k === "payment" ? "Pay the application fee in the portal tab. The agents confirm the submission after." : k === "login" ? "Sign in to the portal in its tab (your password manager can fill it in). The agents carry on once you're in." : "Complete the check in the portal tab. The agents carry on by themselves.";
          await setPhase(task.id, k === "payment" ? "waiting for you to pay" : k === "login" ? "waiting for you to sign in" : "waiting for you to complete a check", "waiting");
          const pend = ask2({ taskId: task.id, school: task.school, kind: k === "payment" ? "payment" : k === "login" ? "signin" : "check", title: what }, k === "payment" ? 60 : 30);
          const startUrl = url;
          const done = await watch(
            tabId,
            k === "payment" ? 60 : 30,
            (x) => k === "payment" ? x.confirmation || !x.payment && x.url !== startUrl : k === "login" ? classify(x) !== "login" : !x.captcha && !isBlockPage(x),
            task.id
          );
          const { answers } = await chrome.storage.session.get({ answers: {} });
          const { pending } = await chrome.storage.session.get({ pending: [] });
          for (const p of pending) if (p.taskId === task.id) answers[p.id] = true;
          await chrome.storage.session.set({ answers });
          await pend;
          if (done) {
            await eng(task.id, "progress", { note: "carrying on after your step" }).catch(() => {
            });
            await setPhase(task.id, "carrying on", "working");
            await nap(1500);
            continue;
          }
          break;
        }
        if (outcome.kind === "needs_you") {
          await setPhase(task.id, outcome.reason === "question" ? "waiting for your answers (side panel)" : "needs you", "waiting");
          notify(task.id, `${task.school}: needs you`, fin.note || outcome.note);
          if (outcome.reason === "question") await openPanel();
        }
        break;
      }
      failures.delete(task.id);
    } catch (e) {
      const f = failures.get(task.id) ?? { n: 0, until: 0 };
      f.n++;
      f.until = Date.now() + backoff(f.n);
      failures.set(task.id, f);
      if (f.n === 1 || opts.claim) notify(task.id, task.school, String(e?.message ?? e).slice(0, 200));
      if (f.n === 4) await eng(task.id, "finish", { state: {}, outcome: { kind: "needs_you", reason: "stuck", note: `couldn't start in Chrome after 4 tries: ${String(e?.message ?? e).slice(0, 120)}. Choose Run in my Chrome to try again` } }).catch(() => {
      });
    } finally {
      if (tabId) await banner(tabId, task.school, "", "", true);
      runs.delete(task.id);
      control.delete(task.id);
      sheets.delete(task.id);
      const { pending } = await chrome.storage.session.get({ pending: [] });
      await chrome.storage.session.set({ pending: pending.filter((p) => p.taskId !== task.id) });
      await tasks().catch(() => publish());
      setTimeout(poll, 1e3);
    }
  }
  chrome.tabs.onRemoved.addListener((tabId) => {
    for (const r of runs.values()) {
      if (r.tabId !== tabId) continue;
      const c = control.get(r.taskId);
      if (c) {
        c.stop = true;
        c.why = "closed";
      }
    }
  });
  async function poll() {
    const c = await cfg();
    if (!c.token) return;
    let data;
    try {
      data = await tasks();
    } catch {
      return;
    }
    await checkVersion().catch(() => {
    });
    if (data.paused || !c.auto) return;
    const now = Date.now();
    const room = Math.max(1, Math.min(3, c.parallel)) - runs.size;
    if (room <= 0) return;
    const next = data.tasks.filter((t) => t.mode === "extension" && ["ready", "running"].includes(t.runner_status) && !runs.has(t.id) && (!t.resume_at || t.resume_at <= now) && (failures.get(t.id)?.until ?? 0) <= now).slice(0, room);
    for (const t of next) runTask(t);
  }
  async function checkVersion() {
    const { versionAt } = await chrome.storage.local.get({ versionAt: 0 });
    if (Date.now() - versionAt < 6 * 36e5) return;
    const d = await apiJson("/api/runner/panel");
    await chrome.storage.local.set({ versionAt: Date.now(), latest: d.latest ?? VERSION });
  }
  function pageText() {
    return { title: document.title, text: (document.body?.innerText ?? "").slice(0, 3e4) };
  }
  async function checkins() {
    const c = await cfg();
    if (!c.token || !c.checkins || runs.size) return;
    const d = await apiJson("/api/runner/panel?what=checkins");
    const due = d.checkins.filter((x) => !x.last || Date.now() - x.last > 7 * 864e5).slice(0, 5);
    for (const x of due) {
      if (runs.size) return;
      const tab = await chrome.tabs.create({ url: x.url, active: false });
      try {
        await intoGroup(tab.id);
        await chromePage(tab.id).waitForLoadState("networkidle", { timeout: 45e3 }).catch(() => {
        });
        await nap(2500);
        const snap2 = await peek(tab.id);
        const t = await chrome.tabs.get(tab.id);
        if (!snap2 || classify(snap2) === "login") {
          await panelApi({ op: "checkin", application: x.id, url: t.url, title: t.title ?? "", text: "", signedOut: true }).catch(() => {
          });
          continue;
        }
        const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, func: pageText });
        const res = await panelApi({ op: "checkin", application: x.id, url: t.url, title: r.result.title, text: r.result.text }).catch(() => null);
        if (res?.changed) notify(x.id, `${x.school}: your portal changed`, res.summary ?? "Open Ivyward to see what changed.");
      } finally {
        await chrome.tabs.remove(tab.id).catch(() => {
        });
      }
    }
  }
  chrome.commands?.onCommand.addListener(async (name, tab) => {
    if (name === "open-panel") await openPanel(tab?.windowId);
    if (name === "pause-all") {
      const working = [...runs.values()].some((r) => r.state === "working");
      await handle({ type: working ? "panel:pause_all" : "panel:resume_all" }, null, true).catch(() => {
      });
      if (runs.size) notify("all", "Ivyward", working ? "Paused in this browser. Press Alt+Shift+P again to carry on." : "Carrying on.");
    }
  });
  function ensureAlarms() {
    chrome.alarms.create("poll", { periodInMinutes: 1 });
    chrome.alarms.create("checkins", { periodInMinutes: 24 * 60, delayInMinutes: 30 });
    chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false }).catch?.(() => {
    });
  }
  chrome.runtime.onInstalled.addListener(ensureAlarms);
  chrome.runtime.onStartup.addListener(ensureAlarms);
  chrome.alarms.onAlarm.addListener((a) => {
    if (a.name === "poll") poll();
    if (a.name === "checkins") checkins().catch(() => {
    });
  });
  async function handle(msg, sender, internal = false) {
    if (!internal && /^(panel|popup):/.test(String(msg?.type)) && !String(sender?.url ?? "").startsWith(chrome.runtime.getURL(""))) throw new Error("not allowed from a web page");
    if (msg.type === "bridge:hello") {
      const c = await cfg();
      const a = [...runs.values()][0];
      return { version: VERSION, paired: !!c.token, running: a ? { id: a.taskId, school: a.school, phase: a.phase } : null, runs: [...runs.values()].map((r) => ({ id: r.taskId, school: r.school, phase: r.phase })) };
    }
    if (msg.type === "bridge:pair") {
      const origin = new URL(sender.url).origin;
      if (!/^amr_[\w-]{20,}$/.test(msg.token)) throw new Error("bad key");
      await chrome.storage.local.set({ token: msg.token, api: origin, auto: true });
      ensureAlarms();
      setTimeout(poll, 500);
      return { paired: true, version: VERSION };
    }
    if (msg.type === "bridge:run" || msg.type === "popup:start") {
      const d = await tasks();
      const t = d.tasks.find((x) => x.id === msg.id);
      if (!t) throw new Error("that application isn't queued for submitting");
      if (runs.has(t.id)) return { started: true };
      const c = await cfg();
      if (runs.size >= Math.max(1, Math.min(3, c.parallel))) throw new Error(`busy with ${[...runs.values()].map((r) => r.school).join(" and ")}; this one is next`);
      failures.delete(t.id);
      runTask(t, { claim: true, focus: msg.type === "popup:start" || !!msg.focus });
      return { started: true };
    }
    if (msg.type === "bridge:kick" || msg.type === "popup:poll") {
      poll();
      return { ok: true };
    }
    if (msg.type === "popup:tasks" || msg.type === "panel:state") {
      const d = lastTasks ?? await tasks();
      const { pending } = await chrome.storage.session.get({ pending: [] });
      const { latest } = await chrome.storage.local.get({ latest: VERSION });
      return { ...d, runs: [...runs.values()], active: [...runs.values()][0] ?? null, pending, version: VERSION, latest, settings: await cfg().then(({ token: _t, ...rest }) => (void _t, rest)) };
    }
    if (msg.type === "popup:attach") {
      const d = await tasks();
      const t = d.tasks.find((x) => x.id === msg.id);
      if (!t) throw new Error("not in your queue");
      if (runs.has(t.id)) throw new Error("already running");
      runTask(t, { claim: true, tabId: msg.tabId });
      return { started: true };
    }
    if (msg.type === "popup:panel") {
      await openPanel(msg.windowId);
      return { ok: true };
    }
    if (msg.type === "panel:resolve") {
      const { answers } = await chrome.storage.session.get({ answers: {} });
      await chrome.storage.session.set({ answers: { ...answers, [msg.id]: !!msg.ok } });
      return { ok: true };
    }
    if (msg.type === "panel:pause" || msg.type === "panel:takeover") {
      const c = control.get(msg.id);
      if (!c) throw new Error("not running");
      c.stop = true;
      c.why = msg.type === "panel:takeover" ? "takeover" : "pause";
      if (msg.type === "panel:takeover") {
        const r = runs.get(msg.id);
        if (r) await focusTab(r.tabId);
      }
      await setPhase(msg.id, msg.type === "panel:takeover" ? "handing you the wheel\u2026" : "pausing after this step\u2026");
      return { ok: true };
    }
    if (msg.type === "panel:resume") {
      const c = control.get(msg.id);
      const r = runs.get(msg.id);
      if (!c || !r) throw new Error("not running");
      const learned = r.state === "taken_over" ? await learnCorrections(msg.id).catch(() => 0) : 0;
      c.stop = false;
      c.why = "";
      return { ok: true, learned };
    }
    if (msg.type === "panel:pause_all" || msg.type === "panel:resume_all") {
      let n2 = 0;
      for (const r of [...runs.values()]) {
        const held = r.state === "paused" || r.state === "taken_over";
        if (msg.type === "panel:pause_all" ? held || r.state === "waiting" : !held) continue;
        await handle({ type: msg.type === "panel:pause_all" ? "panel:pause" : "panel:resume", id: r.taskId }, sender, true).catch(() => {
        });
        n2++;
      }
      return { ok: true, n: n2 };
    }
    if (msg.type === "panel:stop") {
      const c = control.get(msg.id);
      if (c) {
        c.stop = true;
        c.why = "closed";
      }
      return { ok: true };
    }
    if (msg.type === "panel:focus") {
      const r = runs.get(msg.id);
      if (r) await focusTab(r.tabId);
      return { ok: true };
    }
    if (msg.type === "panel:questions") return apiJson(`/api/runner/panel${msg.id ? `?application=${msg.id}` : ""}`);
    if (msg.type === "panel:answer") return panelApi({ op: "answer", id: msg.id, answer: msg.answer });
    if (msg.type === "panel:settings") {
      const allowedKeys = ["approval", "parallel", "pmSignIn", "checkins", "auto"];
      const patch = Object.fromEntries(Object.entries(msg.settings ?? {}).filter(([k]) => allowedKeys.includes(k)));
      await chrome.storage.local.set(patch);
      if ("parallel" in patch) setTimeout(poll, 300);
      return { ok: true };
    }
    if (msg.type === "panel:facts") {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id || !/^https?:/.test(tab.url || "")) throw new Error("open a university page in this window first");
      const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, func: pageText });
      return panelApi({ op: "facts", url: tab.url, title: r.result.title, text: r.result.text });
    }
    if (msg.type === "panel:save_deadline") return panelApi({ op: "facts_save", application: msg.id, deadline: msg.deadline });
    if (msg.type === "panel:checkins") {
      await chrome.storage.local.set({ versionAt: 0 });
      checkins().catch(() => {
      });
      return { ok: true };
    }
    if (msg.type.startsWith("banner:")) {
      const r = [...runs.values()].find((x) => x.tabId === sender.tab?.id);
      if (msg.type === "banner:panel") await openPanel(sender.tab?.windowId);
      if (r && msg.type === "banner:pause") return handle({ type: "panel:pause", id: r.taskId }, sender, true);
      if (r && msg.type === "banner:resume") return handle({ type: "panel:resume", id: r.taskId }, sender, true);
      return { ok: true };
    }
    return null;
  }
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    handle(msg, sender).then(
      (v) => reply({ ok: true, value: v }),
      (e) => reply({ ok: false, error: String(e?.message ?? e) })
    );
    return true;
  });
})();
