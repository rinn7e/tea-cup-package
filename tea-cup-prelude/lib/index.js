var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/common.ts
import * as RD from "@devexperts/remote-data-ts";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as Set from "fp-ts/lib/Set";
import { pipe } from "fp-ts/lib/function";
import * as S from "fp-ts/lib/string";
import * as t from "io-ts";
import * as tt from "io-ts-types";
import { PathReporter } from "io-ts/PathReporter";
var and = A.matchLeft(
  () => true,
  (x, xs) => x && and(xs)
);
var or = A.matchLeft(
  () => false,
  (x, xs) => x || or(xs)
);
var unsafeFromNullable = (a) => {
  if (a) return a;
  throw new Error("unsafeFromNullable: Cannot convert null value.");
};
var exec = (f) => f();
var limitDecimal2Digit = (value) => {
  const result = (Math.round(value * 100) / 100).toFixed(2);
  return result;
};
var delay = (ms) => new Promise((res) => setTimeout(res, ms));
var appRouteReload = (r) => {
  window.location.replace(r);
};
var words = (r) => {
  const result = r.split(/\s+/);
  return result ? result : [r];
};
var unwords = (r) => {
  const result = r.join(" ");
  return result;
};
var lines = (r) => {
  const result = r.split(/\r?\n/);
  return result ? result : [r];
};
var unlines = (r) => {
  const result = r.join("\n");
  return result;
};
var hasChildOverflow = (ref) => {
  if (ref.current)
    return ref.current.scrollHeight > ref.current.clientHeight || ref.current.scrollWidth > ref.current.clientWidth;
  return false;
};
var capFirst = (string2) => {
  return string2.charAt(0).toUpperCase() + string2.slice(1);
};
var runIO = (io) => {
  return io();
};
var throttle = (func, waitFor) => {
  const now = () => (/* @__PURE__ */ new Date()).getTime();
  const resetStartTime = () => startTime = now();
  let timeout;
  let startTime = now() - waitFor;
  return (...args) => new Promise((resolve) => {
    const timeLeft = startTime + waitFor - now();
    if (timeout) {
      clearTimeout(timeout);
    }
    if (startTime + waitFor <= now()) {
      resetStartTime();
      resolve(func(...args));
    } else {
      timeout = setTimeout(() => {
        resetStartTime();
        resolve(func(...args));
      }, timeLeft);
    }
  });
};
var mkDate = (dateString) => new Date(dateString);
var NullableEq = (aEq) => ({
  equals: (first, second) => {
    if (first && second) return aEq.equals(first, second);
    else if (first) return false;
    else if (second) return false;
    else return true;
  }
});
var EqAlways = { equals: () => true };
var nullEq = EqAlways;
var UndefinableEq = (aEq) => ({
  equals: (first, second) => {
    if (first && second) return aEq.equals(first, second);
    else if (first) return false;
    else if (second) return false;
    else return true;
  }
});
var filterUnique = (equal, arrayToBeFiltered, arrayToBeCheckedWith) => {
  const result = pipe(
    arrayToBeFiltered,
    A.reduce(
      [],
      (acc, filterEl) => arrayToBeCheckedWith.findIndex((checkEl) => equal(checkEl, filterEl)) < 0 ? acc.concat(filterEl) : acc
    )
  );
  return result;
};
var concatOverwriteDup = (equal, currentData, incomingData) => {
  const uniqueCurrentData = filterUnique(equal, currentData, incomingData);
  return uniqueCurrentData.concat(incomingData);
};
var booleanFromString = (v) => {
  if (v === "true") return true;
  if (v === "false") return false;
  console.warn("booleanFromString: invalid input", v);
  return null;
};
var booleanFromUndefinedWithDefault = (v, de) => {
  if (v === "true") return true;
  if (v === "false") return false;
  return de;
};
var nonEmptyStr = (s) => s.length > 0;
var error = (err) => {
  return () => {
    throw new Error(err);
  };
};
var RemoteProgressJson = t.type({
  loaded: t.number,
  total: tt.option(t.number)
});
var RemoteDataJson = (aJson) => t.union([
  t.type({
    _tag: t.keyof({ RemoteInitial: null })
  }),
  t.type({
    _tag: t.keyof({ RemotePending: null }),
    progress: tt.option(RemoteProgressJson)
  }),
  t.type({
    _tag: t.keyof({ RemoteFailure: null }),
    error: t.string
  }),
  t.type({ _tag: t.keyof({ RemoteSuccess: null }), value: aJson })
]);
var rdConvertNullSuccessToInitial = (input) => {
  if (input._tag === "RemoteSuccess") {
    if (input.value) return RD.success(input.value);
    else return RD.initial;
  } else return input;
};
var diffIdList = (eq) => (idListB) => (idListA) => {
  return pipe(
    idListA,
    A.filter((a) => !A.elem(eq)(a)(idListB))
  );
};
var jsonParse = (input) => {
  try {
    const result = JSON.parse(input);
    return E.right(result);
  } catch (err) {
    return E.left("jsonParse error: " + err.toString());
  }
};
var decodeWithReport = (jsonDecoder, input) => {
  const decoded = jsonDecoder.decode(input);
  if (decoded._tag === "Right") return E.right(decoded.right);
  else
    return E.left(
      "decodeWithReport error: " + A.intercalate(S.Monoid)("\n")(PathReporter.report(decoded))
    );
};
var errorToString = (err) => {
  if (err instanceof Error) {
    return err.stack || err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};
var sortAndRemoveDup = (eq, ord) => (arr) => {
  return pipe(
    arr,
    A.sort(ord),
    // have to sort first such that, remove dup would remove the oldest
    Set.fromArray(eq),
    // remove duplication
    Set.toArray(ord)
    // convert back to array
  );
};
var concatIfNotExist = (E2) => (value) => (array) => A.elem(E2)(value)(array) ? array : A.concat([value])(array);
var getFirstLine = (text) => {
  return text.split(/\r?\n/, 1)[0];
};
var truncateHtml = (input, limit) => {
  if (input.length <= limit) return input;
  const div = document.createElement("div");
  div.innerHTML = input;
  let count = 0;
  let passedLimit = false;
  const traverse = (node) => {
    if (passedLimit) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (count + text.length > limit) {
        node.textContent = text.slice(0, limit - count) + "...";
        count = limit;
        passedLimit = true;
      } else {
        count += text.length;
      }
    } else {
      const children2 = Array.from(node.childNodes);
      for (const child of children2) {
        if (passedLimit) {
          if (child.parentNode) {
            child.parentNode.removeChild(child);
          }
        } else {
          traverse(child);
        }
      }
    }
  };
  const children = Array.from(div.childNodes);
  for (const child of children) {
    if (passedLimit) {
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
    } else {
      traverse(child);
    }
  }
  return div.innerHTML;
};
var truncateText = (input, limit) => {
  if (input.length <= limit) return input;
  return input.slice(0, limit) + "...";
};
var brandedString = (name) => new t.Type(
  name,
  (u) => typeof u === "string",
  (u, c) => typeof u === "string" ? t.success(u) : t.failure(u, c),
  t.identity
);
var brandedNumber = (name) => new t.Type(
  name,
  (u) => typeof u === "number",
  (u, c) => typeof u === "number" ? t.success(u) : t.failure(u, c),
  t.identity
);

// src/tea.ts
import * as RD2 from "@devexperts/remote-data-ts";
import * as TE from "fp-ts/lib/TaskEither";
import { identity as identity2 } from "fp-ts/lib/function";
import { Cmd, Task } from "tea-cup-fp";
var resultToRd = (r) => r.tag === "Ok" ? RD2.success(r.value) : RD2.failure(r.err);
var resultToNoAction = (noAction) => (r) => {
  if (r.tag === "Err") {
    console.warn("resultToNoAction error:", r.err.toString());
  }
  return noAction;
};
var cmdFromPromise = (promiseSupplier, f) => Task.attempt(Task.fromPromise(promiseSupplier), f);
var doNothing = (model) => {
  return [model, Cmd.none()];
};
var delayCmd = (ms, msg) => cmdFromPromise(
  async () => {
    await delay(ms);
  },
  () => msg
);
var msgCmd = (msg) => Task.perform(Task.succeed(msg), identity2);
var noMsg = () => ({ _tag: "NoOp" });
var cmdSucceed = (effectSupplier) => Task.perform(Task.succeedLazy(effectSupplier), noMsg);
var cmdSucceedWithMsg = (effectSupplier, f) => Task.perform(Task.succeedLazy(effectSupplier), f);
var batchCmd = (newCmd) => ([model, cmd]) => {
  return [model, Cmd.batch([cmd, newCmd])];
};
var extraCmd = (mkNewCmd) => ([model, cmd]) => {
  return [model, Cmd.batch([cmd, mkNewCmd(model)])];
};
var updateAndCmd = (func) => ([model, cmd]) => {
  const [newModel, newCmd] = func(model);
  return [newModel, Cmd.batch([cmd, newCmd])];
};
var updateAndCmdExtra = (func) => ([model, cmd]) => {
  const [newModel, newCmd, a] = func(model);
  return [newModel, Cmd.batch([cmd, newCmd]), a];
};
var taskToTE = (task) => TE.tryCatch(
  () => new Promise((resolve, reject) => {
    task.execute((result) => {
      if (result.tag === "Ok") {
        resolve(result.value);
      } else {
        reject(result.err);
      }
    });
  }),
  (err) => err
);
var taskFromTE = (te) => {
  return Task.fromPromise(te).andThen((res) => {
    if (res._tag === "Right") {
      return Task.succeed(res.right);
    } else {
      return Task.fail(res.left);
    }
  });
};
var taskFromT = (t3) => {
  return Task.fromPromise(t3);
};
var taskFromIO = (io) => {
  return Task.succeedLazy(io);
};
var attemptTE = (te, toMsg) => Task.attempt(taskFromTE(te), toMsg);
var performIO = (io, toMsg) => Task.perform(taskFromIO(io), toMsg);
var performIO_ = (io) => Task.perform(taskFromIO(io), noMsg);

// src/cn.ts
import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
var customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "12-cf",
            "14-cf",
            "16-cf",
            "18-cf",
            "20-cf",
            "24-cf",
            "30-cf",
            "38-cf",
            "46-cf",
            "56-cf"
          ]
        }
      ],
      "text-color": [
        {
          text: [
            (value) => /^((jj|sk)-(blue|gray|green|volcan|volcano|red|yellow|gold|purple|cyan|dark|light|accent|primary)(-\d+)?|(blue|gray|green|volcan|volcano|red|yellow|gold|purple|cyan)(-\d+)?-cf)$/.test(
              value
            )
          ]
        }
      ]
    }
  }
});
function cn(...args) {
  return customTwMerge(clsx(args));
}

// src/io-ts.ts
import * as t2 from "io-ts";
function withDefault(type2, defaultValue) {
  return new t2.Type(
    `withDefault(${type2.name})`,
    type2.is,
    (u, c) => u == null ? t2.success(defaultValue) : type2.validate(u, c),
    type2.encode
  );
}

// src/custom-dev-tool.ts
import { DevTools } from "react-tea-cup";
var CustomDevTools = class extends DevTools {
  onEvent(e) {
    if (e.tag === "init") {
      console.log("\u{1F375}", e.count, e.tag, e.mac[0], e.mac[1]);
    } else if (e.tag === "update") {
      const msg = this.getLastSubMsg(e.msg);
      console.log("\u{1F375}", e.count, e.tag, msg, e.mac[0], e.mac[1]);
    }
    super.onEvent(e);
  }
  // Helper to recursively get the last subMsg
  getLastSubMsg(msg) {
    if (msg && typeof msg === "object" && "subMsg" in msg) {
      return this.getLastSubMsg(msg.subMsg);
    }
    return msg;
  }
};
var devTools = () => (
  // new DevTools<Model, Msg>().setVerbose(true).asGlobal()
  new CustomDevTools().setVerbose(false).asGlobal()
);

// src/array.ts
var array_exports = {};
__export(array_exports, {
  arrayFormatter: () => arrayFormatter,
  modifyAtIfExist: () => modifyAtIfExist
});
import * as A2 from "fp-ts/lib/Array";
import { pipe as pipe2 } from "fp-ts/lib/function";
var modifyAtIfExist = (i, f) => (as) => {
  const result = pipe2(as, A2.modifyAt(i, f));
  switch (result._tag) {
    case "Some":
      return result.value;
    case "None":
      return as;
  }
};
var arrayFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction"
});

// src/map.ts
var map_exports = {};
__export(map_exports, {
  lookupWithDefault: () => lookupWithDefault,
  modifyAtIfExist: () => modifyAtIfExist2
});
import * as M from "fp-ts/lib/Map";
import { pipe as pipe3 } from "fp-ts/lib/function";
var modifyAtIfExist2 = (E2) => {
  return (k, f) => (m) => {
    const result = pipe3(m, M.modifyAt(E2)(k, f));
    switch (result._tag) {
      case "Some":
        return result.value;
      case "None":
        return m;
    }
  };
};
var lookupWithDefault = (E2) => {
  return (k) => (a) => (m) => {
    const result = pipe3(m, M.lookup(E2)(k));
    switch (result._tag) {
      case "Some":
        return result.value;
      default:
        return a;
    }
  };
};
export {
  array_exports as ArrayExtra,
  EqAlways,
  map_exports as MapExtra,
  NullableEq,
  RemoteDataJson,
  RemoteProgressJson,
  UndefinableEq,
  and,
  appRouteReload,
  attemptTE,
  batchCmd,
  booleanFromString,
  booleanFromUndefinedWithDefault,
  brandedNumber,
  brandedString,
  capFirst,
  cmdFromPromise,
  cmdSucceed,
  cmdSucceedWithMsg,
  cn,
  concatIfNotExist,
  concatOverwriteDup,
  decodeWithReport,
  delay,
  delayCmd,
  devTools,
  diffIdList,
  doNothing,
  error,
  errorToString,
  exec,
  extraCmd,
  filterUnique,
  getFirstLine,
  hasChildOverflow,
  jsonParse,
  limitDecimal2Digit,
  lines,
  mkDate,
  msgCmd,
  noMsg,
  nonEmptyStr,
  nullEq,
  or,
  performIO,
  performIO_,
  rdConvertNullSuccessToInitial,
  resultToNoAction,
  resultToRd,
  runIO,
  sortAndRemoveDup,
  taskFromIO,
  taskFromT,
  taskFromTE,
  taskToTE,
  throttle,
  truncateHtml,
  truncateText,
  unlines,
  unsafeFromNullable,
  unwords,
  updateAndCmd,
  updateAndCmdExtra,
  withDefault,
  words
};
