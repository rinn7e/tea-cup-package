"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/component.tsx
var component_exports = {};
__export(component_exports, {
  FormItemMemo: () => FormItemMemo
});
module.exports = __toCommonJS(component_exports);
var M5 = __toESM(require("fp-ts/lib/Map"), 1);
var S6 = __toESM(require("fp-ts/lib/string"), 1);
var import_react2 = require("react");

// src/type.ts
var A2 = __toESM(require("fp-ts/lib/Array"), 1);
var D = __toESM(require("fp-ts/lib/Date"), 1);
var EqClass = __toESM(require("fp-ts/lib/Eq"), 1);
var Map = __toESM(require("fp-ts/lib/Map"), 1);
var O = __toESM(require("fp-ts/lib/Option"), 1);
var B = __toESM(require("fp-ts/lib/boolean"), 1);
var S = __toESM(require("fp-ts/lib/string"), 1);

// src/util/common.ts
var A = __toESM(require("fp-ts/lib/Array"), 1);
var M = __toESM(require("fp-ts/lib/Map"), 1);
var import_function = require("fp-ts/lib/function");
var and = A.matchLeft(
  () => true,
  (x, xs) => x && and(xs)
);
var or = A.matchLeft(
  () => false,
  (x, xs) => x || or(xs)
);
var NullableEq = (aEq) => ({
  equals: (first, second) => {
    if (first && second) return aEq.equals(first, second);
    else if (first) return false;
    else if (second) return false;
    else return true;
  }
});
var mkIdFromString = (text) => {
  const amountOfWords = 6;
  return text.split(" ").splice(0, amountOfWords).join("_");
};
var exec = (f) => f();
var limitDecimal2Digit = (value) => {
  const result = (Math.round(value * 100) / 100).toFixed(2);
  return result;
};

// src/type.ts
var TextInputVariantEq = {
  equals: (x, y) => {
    if (x._tag === "Text" && y._tag === "Text") return true;
    else if (x._tag === "Email" && y._tag === "Email") return true;
    else if (x._tag === "Password" && y._tag === "Password")
      return EqClass.struct({
        _tag: S.Eq,
        reveal: B.Eq
      }).equals(x, y);
    else return false;
  }
};
var textInputVariantToString = (variant) => {
  switch (variant._tag) {
    case "Text":
      return "text";
    case "Email":
      return "email";
    case "Password": {
      if (variant.reveal) return "text";
      else return "password";
    }
  }
};
var TextPillTypeEq = EqClass.struct({
  _tag: S.Eq,
  placeholder: S.Eq,
  label: S.Eq,
  allValues: A2.getEq(S.Eq),
  currentValue: S.Eq,
  validation: { equals: () => true },
  showValidation: B.Eq,
  isTextarea: B.Eq,
  autocomplete: B.Eq,
  isFocus: B.Eq,
  ui: { equals: () => true }
});
var TextTypeEq = EqClass.struct({
  _tag: S.Eq,
  placeholder: S.Eq,
  label: S.Eq,
  currentValue: S.Eq,
  validation: { equals: () => true },
  linkValidations: { equals: () => true },
  showValidation: B.Eq,
  isTextarea: B.Eq,
  variant: TextInputVariantEq,
  autocomplete: B.Eq,
  isFocus: B.Eq,
  onKeyDown: { equals: () => true },
  ui: { equals: () => true }
});
var autocompleteToString = (val) => {
  if (!val) return "new-password";
  else return "on";
};
var CheckboxChoiceEq = EqClass.tuple(S.Eq, B.Eq);
var CheckboxTypeEq = EqClass.struct({
  _tag: S.Eq,
  label: S.Eq,
  currentValues: A2.getEq(CheckboxChoiceEq),
  validation: { equals: () => true },
  isMarkdown: { equals: () => true },
  ui: { equals: () => true }
});
var RadioChoiceEq = EqClass.struct({
  key: S.Eq,
  label: S.Eq,
  desc: S.Eq
});
var RadioTypeEq = EqClass.struct({
  _tag: S.Eq,
  label: S.Eq,
  choices: A2.getEq(RadioChoiceEq),
  currentValue: O.getEq(S.Eq),
  isMarkdown: { equals: () => true },
  ui: { equals: () => true }
});
var DropdownTypeEq = EqClass.struct({
  _tag: S.Eq,
  label: { equals: () => true },
  placeholder: { equals: () => true },
  choices: A2.getEq(S.Eq),
  currentValue: NullableEq(S.Eq),
  validation: { equals: () => true },
  showValidation: { equals: () => true },
  isFocus: B.Eq,
  ui: { equals: () => true }
});
var CalendarTypeEq = EqClass.struct({
  _tag: S.Eq,
  label: S.Eq,
  placeholder: S.Eq,
  currentValue: NullableEq(D.Eq),
  validation: { equals: () => true },
  showValidation: { equals: () => true },
  isFocus: B.Eq,
  ui: { equals: () => true }
});
var FileEq = { equals: (a, b) => a.name === b.name };
var FileTypeEq = EqClass.struct({
  _tag: S.Eq,
  label: S.Eq,
  currentValues: A2.getEq(FileEq),
  isMultiple: { equals: () => true },
  showValidation: B.Eq,
  validation: { equals: () => true },
  ui: { equals: () => true }
});
var FormTypeEq = {
  equals: (x, y) => {
    if (x._tag === "TextType" && y._tag === "TextType")
      return TextTypeEq.equals(x, y);
    else if (x._tag === "TextPillType" && y._tag === "TextPillType")
      return TextPillTypeEq.equals(x, y);
    else if (x._tag === "CheckboxType" && y._tag === "CheckboxType")
      return CheckboxTypeEq.equals(x, y);
    else if (x._tag === "RadioType" && y._tag === "RadioType")
      return RadioTypeEq.equals(x, y);
    else if (x._tag === "DropdownType" && y._tag === "DropdownType")
      return DropdownTypeEq.equals(x, y);
    else if (x._tag === "CalendarType" && y._tag === "CalendarType")
      return CalendarTypeEq.equals(x, y);
    else if (x._tag === "FileType" && y._tag === "FileType")
      return FileTypeEq.equals(x, y);
    else return false;
  }
};
var FormsEq = Map.getEq(S.Eq, FormTypeEq);
var ModelEq = EqClass.struct({
  forms: FormsEq,
  isDrag: B.Eq
});
var PropEq = EqClass.struct({
  field: S.Eq,
  dispatch: { equals: () => true },
  model: ModelEq
});

// src/view.tsx
var A5 = __toESM(require("fp-ts/lib/Array"), 1);
var O3 = __toESM(require("fp-ts/lib/Option"), 1);
var import_function5 = require("fp-ts/lib/function");
var S5 = __toESM(require("fp-ts/lib/string"), 1);

// src/error-tooltip/helper.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var arrowTop = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "relative", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
  "div",
  {
    className: "absolute z-20",
    style: {
      borderLeft: "6px solid transparent",
      borderRight: "6px solid transparent",
      borderBottom: "6px solid #ef4444",
      top: "-6px"
    }
  }
) });
var arrowDown = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "relative", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
  "div",
  {
    className: "absolute z-20",
    style: {
      borderLeft: "6px solid transparent",
      borderRight: "6px solid transparent",
      borderTop: "6px solid #ef4444"
    }
  }
) });
var errorTooltipContainer = (errorText, direction, onClick) => {
  const position = direction === "bottom" ? "top-[10px]" : "bottom-[-20px]";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "relative w-full", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `pointer-events-none absolute z-100 w-full ${position}`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex w-full flex-col items-center", children: errorText._tag === "Some" ? errorPopup(errorText.value, direction, onClick) : null }) }) });
};
var errorPopup = (errorText, direction, onClick) => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "pointer-events-auto flex cursor-pointer flex-col items-center",
      onClick,
      children: [
        direction === "bottom" ? arrowTop() : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "z-10 rounded bg-red-500 px-[8px] py-[5px] text-white drop-shadow-lg", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-center text-[14px] leading-[20px] whitespace-pre-line", children: errorText }) }),
        direction === "top" ? arrowDown() : null
      ]
    }
  );
};

// src/validation.ts
var A3 = __toESM(require("fp-ts/lib/Array"), 1);
var E = __toESM(require("fp-ts/lib/Either"), 1);
var M3 = __toESM(require("fp-ts/lib/Map"), 1);
var import_function3 = require("fp-ts/lib/function");
var S3 = __toESM(require("fp-ts/lib/string"), 1);

// src/util/util.ts
var M2 = __toESM(require("fp-ts/lib/Map"), 1);
var import_function2 = require("fp-ts/lib/function");
var S2 = __toESM(require("fp-ts/lib/string"), 1);
var lookupForm = (key, formEls) => {
  const result = M2.lookup(S2.Ord)(key)(formEls);
  switch (result._tag) {
    case "Some":
      return result.value;
    default:
      throw new Error(`lookupForm: Unable to find key ${key}`);
  }
};
var valueTextType = (formType) => {
  switch (formType._tag) {
    case "TextType":
      return formType.currentValue;
    default:
      throw new Error(
        `valueTextType: Expect TextType but got ${formType._tag} instead.`
      );
  }
};

// src/validation.ts
var runValidationAndLink = (formType, forms) => {
  const validationResult = formType.validation(formType.currentValue);
  if (validationResult._tag === "Right") {
    const validationResultArray = (0, import_function3.pipe)(
      formType.linkValidations,
      A3.map((linkValidation) => {
        const linkValue = (0, import_function3.pipe)(
          lookupForm(linkValidation.linkKey, forms),
          valueTextType
        );
        const linkValidationResult = linkValidation.validation(
          validationResult.right,
          linkValue
        );
        return linkValidationResult;
      })
    );
    return (0, import_function3.pipe)(
      validationResultArray,
      A3.reduce(validationResult, (b, a) => {
        if (a._tag === "Left") return a;
        else return b;
      })
    );
  } else return validationResult;
};

// src/view/default-view.tsx
var A4 = __toESM(require("fp-ts/lib/Array"), 1);
var M4 = __toESM(require("fp-ts/lib/Map"), 1);
var O2 = __toESM(require("fp-ts/lib/Option"), 1);
var import_function4 = require("fp-ts/lib/function");
var S4 = __toESM(require("fp-ts/lib/string"), 1);
var import_react = __toESM(require("react"), 1);
var import_react_datepicker = __toESM(require("react-datepicker"), 1);
var import_react_datepicker2 = require("react-datepicker/dist/react-datepicker.css");

// src/view/common.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var emptyEl = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", {});

// src/view/default-view.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var CalendarInput = import_react.default.forwardRef((props, ref) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
  "input",
  {
    ...props,
    ref,
    className: "w-full bg-transparent px-4 py-3 font-medium text-slate-800 outline-none"
  }
));
var IconChevronDown = () => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-5 w-5",
    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("polyline", { points: "6 9 12 15 18 9" })
  }
);
var IconCalendar = () => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-5 w-5",
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
    ]
  }
);
var IconUpload = () => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-8 w-8",
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("polyline", { points: "17 8 12 3 7 8" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
    ]
  }
);
var IconEye = () => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-5 w-5",
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "12", cy: "12", r: "3" })
    ]
  }
);
var IconEyeOff = () => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-5 w-5",
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "1", y1: "1", x2: "23", y2: "23" })
    ]
  }
);
var IconCheck = () => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-3 w-3",
    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("polyline", { points: "20 6 9 17 4 12" })
  }
);
var getContainerClasses = (isError, isFocus) => [
  "flex flex-col rounded-xl border transition-all duration-200 relative",
  isError ? "border-red-300 bg-red-50/30" : isFocus ? "border-blue-500 ring-[3px] ring-blue-100 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-white shadow-xs"
].join(" ");
var getLabelClasses = (isError, isFocus) => [
  "text-sm font-bold tracking-tight mb-1 px-1",
  isError ? "text-red-500" : isFocus ? "text-blue-500" : "text-slate-600"
].join(" ");
var defaultTextView = ({
  dispatch,
  variant,
  key,
  currentValue,
  label,
  showValidation,
  isFocus,
  validationResult,
  placeholder,
  autocomplete,
  onKeyDown
}) => {
  const isError = validationResult._tag === "Left" && showValidation;
  const errorMsg = isError ? O2.some(validationResult.left) : O2.none;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "group flex w-full flex-col gap-1", children: [
    errorTooltipContainer(
      errorMsg,
      "top",
      () => dispatch({ _tag: "HideValidation", key })
    ),
    label !== "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: getLabelClasses(isError, isFocus), children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: getContainerClasses(isError, isFocus), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-row items-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "input",
        {
          type: textInputVariantToString(variant),
          className: "w-full bg-transparent px-4 py-3 font-medium text-slate-800 outline-none placeholder:text-slate-300",
          placeholder,
          value: currentValue,
          onInput: (event) => dispatch({ _tag: "UpdateForm", key, event }),
          onFocus: (_) => dispatch({ _tag: "HandleFocus", key, isFocus: true }),
          onBlur: (_) => dispatch({ _tag: "HandleFocus", key, isFocus: false }),
          onKeyDown,
          name: label,
          autoComplete: autocompleteToString(autocomplete)
        }
      ),
      exec(() => {
        if (variant._tag === "Password") {
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "mr-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none",
              onClick: (event) => dispatch({
                _tag: "SetRevealPassword",
                key,
                reveal: !variant.reveal,
                event
              }),
              children: variant.reveal ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(IconEyeOff, {}) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(IconEye, {})
            }
          );
        } else return emptyEl();
      })
    ] }) })
  ] }, key);
};
var radioView = (isSelected, onClick) => {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "div",
    {
      className: [
        "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-200",
        isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white group-hover:border-blue-400 hover:border-blue-400"
      ].join(" "),
      onClick: () => onClick(isSelected),
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "div",
        {
          className: [
            "h-2 w-2 rounded-full bg-white transition-transform duration-200",
            isSelected ? "scale-100" : "scale-0"
          ].join(" ")
        }
      )
    }
  );
};
var defaultCheckboxView = (arg) => {
  const [key, val] = arg.checkboxChoice;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "div",
    {
      id: mkIdFromString(key),
      className: "group flex cursor-pointer flex-row items-center gap-3 py-1.5",
      onClick: (_) => arg.dispatch({
        _tag: "ToggleCheckbox",
        key: arg.fieldKey,
        checkbox_key: key,
        value: !val
      }),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "div",
          {
            className: [
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border shadow-xs transition-all duration-200",
              val ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white group-hover:border-blue-400"
            ].join(" "),
            children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "div",
              {
                className: [
                  "transform transition-all duration-200",
                  val ? "scale-100 opacity-100" : "scale-75 opacity-0"
                ].join(" "),
                children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(IconCheck, {})
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[15px] font-medium text-slate-700 transition-colors select-none group-hover:text-slate-900", children: key })
      ]
    },
    key
  );
};
var defaultCheckboxesView = ({
  dispatch,
  fieldKey,
  label,
  currentValues,
  isMarkdown
}) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { id: "CheckboxType", className: "flex flex-col gap-1", children: [
  label !== "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "mb-1 px-1 text-sm font-bold tracking-tight text-slate-600", children: label }),
  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex flex-col gap-1", children: (0, import_function4.pipe)(
    currentValues,
    A4.map(
      (checkboxChoice) => defaultCheckboxView({ dispatch, fieldKey, checkboxChoice, isMarkdown })
    )
  ) })
] });
var defaultRadioView = (arg) => {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "div",
    {
      id: mkIdFromString(arg.radioChoice.key),
      className: "group flex cursor-pointer flex-row items-center gap-3 py-1.5",
      onClick: (_) => arg.dispatch({
        _tag: "UpdateRadio",
        key: arg.fieldKey,
        radio_key: arg.radioChoice.key,
        allowUnselected: false
      }),
      children: [
        radioView(arg.isActive, () => null),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-[15px] font-medium text-slate-700 transition-colors select-none group-hover:text-slate-900", children: arg.radioChoice.label }),
          arg.radioChoice.desc && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-xs text-slate-400", children: arg.radioChoice.desc })
        ] })
      ]
    },
    arg.radioChoice.key
  );
};
var defaultRadiosView = ({
  dispatch,
  fieldKey,
  label,
  choices,
  currentValue,
  isMarkdown
}) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { id: "RadioType", className: "flex flex-col gap-1", children: [
  label !== "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "mb-1 px-1 text-sm font-bold tracking-tight text-slate-600", children: label }),
  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "flex flex-col gap-1", children: (0, import_function4.pipe)(
    choices,
    A4.map((radioChoice) => {
      const isActive = currentValue._tag === "Some" && currentValue.value === radioChoice.key;
      return defaultRadioView({ dispatch, fieldKey, radioChoice, isActive });
    })
  ) })
] });
var defaultDropdownView = ({
  dispatch,
  label,
  currentValue,
  fieldKey,
  isFocus,
  choices,
  placeholder,
  validationResult,
  showValidation
}) => {
  const isError = validationResult._tag === "Left" && showValidation;
  const isFloating = isFocus || currentValue !== null && currentValue !== "";
  const errorMsg = isError ? O2.some(validationResult.left) : O2.none;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "group flex w-full flex-col gap-1", children: [
    errorTooltipContainer(
      errorMsg,
      "top",
      () => dispatch({ _tag: "HideValidation", key: fieldKey })
    ),
    label !== "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: getLabelClasses(isError, isFocus), children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: getContainerClasses(isError, isFocus), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-row items-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "input",
        {
          id: mkIdFromString(label),
          className: "w-full cursor-pointer bg-transparent px-4 py-3 font-medium text-slate-800 outline-none placeholder:text-slate-300",
          placeholder,
          value: currentValue ? currentValue : "",
          readOnly: true,
          onKeyDown: (event) => event.preventDefault(),
          onClick: (_) => dispatch({ _tag: "HandleFocus", key: fieldKey, isFocus: true }),
          onFocus: (_) => dispatch({ _tag: "HandleFocus", key: fieldKey, isFocus: true }),
          onBlur: (_) => dispatch({ _tag: "HandleFocus", key: fieldKey, isFocus: false })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "pointer-events-none pr-3 text-slate-400 transition-colors group-hover:text-slate-600", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(IconChevronDown, {}) })
    ] }) }),
    isFocus && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "relative", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        className: "animate-in fade-in zoom-in-95 absolute top-2 z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl duration-200",
        style: { maxHeight: "350px" },
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "scrollbar-hide overflow-y-auto py-1.5", children: (0, import_function4.pipe)(
          choices,
          A4.map((choice) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "div",
            {
              id: mkIdFromString(choice),
              className: [
                "mx-1.5 cursor-pointer rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                currentValue === choice ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              ].join(" "),
              onMouseDown: (event) => dispatch({
                _tag: "UpdateDropdownType",
                key: fieldKey,
                value: choice,
                event
              }),
              children: choice
            },
            choice
          ))
        ) })
      }
    ) })
  ] }, fieldKey);
};
var defaultCalendarView = ({
  dispatch,
  fieldKey,
  label,
  placeholder,
  currentValue,
  isFocus,
  validationResult,
  showValidation
}) => {
  const isError = validationResult._tag === "Left" && showValidation;
  const errorMsg = isError ? O2.some(validationResult.left) : O2.none;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "group flex w-full flex-col gap-1", children: [
    errorTooltipContainer(
      errorMsg,
      "top",
      () => dispatch({ _tag: "HideValidation", key: fieldKey })
    ),
    label !== "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: getLabelClasses(isError, isFocus), children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: getContainerClasses(isError, isFocus), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-row items-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "w-full", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        import_react_datepicker.default,
        {
          className: "z-[100]",
          showYearDropdown: true,
          scrollableYearDropdown: true,
          yearDropdownItemNumber: 100,
          selected: currentValue,
          placeholderText: placeholder,
          dateFormat: "dd.MM.yyyy",
          customInput: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(CalendarInput, {}),
          onCalendarOpen: () => dispatch(
            { _tag: "HandleFocus", key: fieldKey, isFocus: true },
            false
          ),
          onCalendarClose: () => dispatch(
            { _tag: "HandleFocus", key: fieldKey, isFocus: false },
            false
          ),
          onChange: (date) => dispatch(
            { _tag: "UpdateCalendar", key: fieldKey, value: date },
            false
          )
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "pointer-events-none pr-3 text-slate-400 transition-colors group-hover:text-slate-600", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(IconCalendar, {}) })
    ] }) })
  ] }, fieldKey);
};
var defaultFileView = ({
  dispatch,
  fieldKey,
  label,
  validationResult,
  isMultiple,
  isDrag,
  showValidation
}) => {
  const isError = validationResult._tag === "Left" && showValidation;
  const isFocus = isDrag;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex w-full flex-col gap-1", children: [
    label !== "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: getLabelClasses(isError, false), children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "div",
      {
        className: [
          "relative flex min-h-[160px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300",
          isDrag ? "border-blue-500 bg-blue-50 ring-4 ring-blue-50" : isError ? "border-red-300 bg-red-50 hover:border-red-400" : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
        ].join(" "),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "input",
            {
              type: "file",
              multiple: isMultiple,
              className: "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0",
              onInput: (event) => dispatch({ _tag: "AddFile", key: fieldKey, event })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col items-center gap-4 px-6 text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "div",
              {
                className: [
                  "rounded-2xl p-3 transition-colors duration-200",
                  isDrag ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-400 shadow-sm"
                ].join(" "),
                children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(IconUpload, {})
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-[15px] font-bold text-slate-700", children: isDrag ? "Drop to upload" : "Click or drop files here" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "max-w-[240px] text-xs leading-relaxed font-medium text-slate-400", children: [
                "Support for ",
                isMultiple ? "multiple files" : "single file",
                ". Max size 10MB per file."
              ] })
            ] })
          ] })
        ]
      }
    )
  ] });
};
var defaultTextPillView = ({
  dispatch,
  key,
  currentValue,
  label,
  showValidation,
  isFocus,
  validationResult,
  placeholder,
  autocomplete,
  allValues
}) => {
  const isError = validationResult._tag === "Left" && showValidation;
  const isFloating = isFocus || allValues.length > 0 || currentValue !== "";
  const errorMsg = isError ? O2.some(validationResult.left) : O2.none;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "group flex w-full flex-col gap-1", children: [
    errorTooltipContainer(
      errorMsg,
      "top",
      () => dispatch({ _tag: "HideValidation", key })
    ),
    label !== "" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: getLabelClasses(isError, isFocus), children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: getContainerClasses(isError, isFocus), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-wrap items-center gap-2 px-3 py-2", children: [
      (0, import_function4.pipe)(
        allValues,
        A4.mapWithIndex((index, val) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
          "div",
          {
            className: "flex items-center gap-2 rounded-lg bg-slate-100 py-1 pr-1.5 pl-3 text-[13px] font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-200 hover:text-slate-900",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: val }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: "flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-red-500",
                  onClick: () => dispatch({
                    _tag: "TextPillMsg",
                    key,
                    subMsg: { _tag: "RemovePill", index }
                  }),
                  children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                    "svg",
                    {
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "3",
                      className: "h-3 w-3",
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
                      ]
                    }
                  )
                }
              )
            ]
          },
          index
        ))
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "input",
        {
          className: "min-w-[140px] grow bg-transparent px-1 py-1.5 font-medium text-slate-800 outline-none placeholder:text-slate-300",
          value: currentValue,
          onInput: (event) => dispatch({
            _tag: "TextPillMsg",
            key,
            subMsg: { _tag: "UpdateTextPill", event }
          }),
          onKeyDown: (event) => {
            if (event.key === "Enter" && currentValue.trim() !== "") {
              event.preventDefault();
              dispatch({
                _tag: "TextPillMsg",
                key,
                subMsg: { _tag: "AddPill", value: currentValue }
              });
            }
          },
          onFocus: (_) => dispatch({ _tag: "HandleFocus", key, isFocus: true }),
          onBlur: (_) => dispatch({ _tag: "HandleFocus", key, isFocus: false }),
          placeholder,
          autoComplete: autocompleteToString(autocomplete)
        }
      )
    ] }) })
  ] }, key);
};

// src/util/default-config.tsx
var E2 = __toESM(require("fp-ts/lib/Either"), 1);

// src/view.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var IconFile = () => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-8 w-8 text-slate-400",
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { d: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("polyline", { points: "13 2 13 9 20 9" })
    ]
  }
);
var IconX = () => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-4 w-4",
    children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
    ]
  }
);
var formView = (key, val, dispatch, model) => {
  switch (val._tag) {
    case "TextType": {
      const validationResult = runValidationAndLink(val, model.forms);
      const view = val.ui ? val.ui : defaultTextView;
      return view({
        key,
        dispatch,
        label: val.label,
        validationResult,
        isFocus: val.isFocus,
        placeholder: val.placeholder,
        validation: val.validation,
        currentValue: val.currentValue,
        showValidation: val.showValidation,
        variant: val.variant,
        autocomplete: val.autocomplete,
        isTextarea: val.isTextarea,
        onKeyDown: val.onKeyDown
      });
    }
    case "TextPillType": {
      const validationResult = val.validation(val.allValues);
      const view = val.ui ? val.ui : defaultTextPillView;
      return view({
        key,
        dispatch,
        label: val.label,
        validationResult,
        isFocus: val.isFocus,
        placeholder: val.placeholder,
        validation: val.validation,
        allValues: val.allValues,
        currentValue: val.currentValue,
        showValidation: val.showValidation,
        autocomplete: val.autocomplete,
        isTextarea: val.isTextarea
      });
    }
    case "CalendarType": {
      const validationResult = val.validation(val.currentValue);
      const view = val.ui ? val.ui : defaultCalendarView;
      return view({
        dispatch,
        fieldKey: key,
        label: val.label,
        placeholder: val.placeholder,
        currentValue: val.currentValue,
        isFocus: val.isFocus,
        validationResult,
        validation: val.validation,
        showValidation: val.showValidation
      });
    }
    case "DropdownType": {
      const validationResult = val.validation(val.currentValue);
      const view = val.ui ? val.ui : defaultDropdownView;
      return view({
        fieldKey: key,
        dispatch,
        label: val.label,
        choices: val.choices,
        validationResult,
        isFocus: val.isFocus,
        placeholder: val.placeholder,
        validation: val.validation,
        currentValue: val.currentValue,
        showValidation: val.showValidation
      });
    }
    case "CheckboxType": {
      const view = val.ui ? val.ui : defaultCheckboxesView;
      return view({
        dispatch,
        fieldKey: key,
        label: val.label,
        currentValues: val.currentValues,
        isMarkdown: val.isMarkdown
      });
    }
    case "RadioType": {
      const view = val.ui ? val.ui : defaultRadiosView;
      return view({
        dispatch,
        fieldKey: key,
        label: val.label,
        choices: val.choices,
        currentValue: val.currentValue,
        isMarkdown: val.isMarkdown
      });
    }
    case "FileType": {
      const currentFilesView = () => {
        if (val.currentValues.length) {
          const results = (0, import_function5.pipe)(
            val.currentValues,
            A5.mapWithIndex((i, file) => {
              return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex gap-4", children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex h-[42px] w-[60px] items-center justify-center rounded bg-slate-50", children: file.type.startsWith("image/") ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  "img",
                  {
                    className: "h-full w-full object-contain",
                    src: URL.createObjectURL(file)
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconFile, {}) }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "grow", style: { maxWidth: "257px" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "truncate text-[13px] font-semibold text-slate-700", children: file.name }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex text-xs text-slate-400", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { children: [
                      limitDecimal2Digit(file.size / 1e3),
                      " KB"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "px-2 font-semibold", children: "\u22C5" }),
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "uppercase", children: file.type.split("/")[1] || file.type })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500",
                    onClick: () => dispatch({ _tag: "RemoveFile", key, index: i }),
                    children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconX, {})
                  }
                )
              ] }, i);
            })
          );
          return results;
        } else return [];
      };
      const validationResult = val.validation(val.currentValues);
      const view = val.ui ? val.ui : defaultFileView;
      const dropZoneView = view({
        dispatch,
        fieldKey: key,
        label: val.label,
        validationResult,
        isMultiple: val.isMultiple,
        isDrag: model.isDrag,
        showValidation: val.showValidation
      });
      const showValidation = validationResult._tag == "Left" && val.showValidation ? O3.some(validationResult.left) : O3.none;
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col items-center justify-stretch gap-6", children: [
          dropZoneView,
          currentFilesView()
        ] }),
        errorTooltipContainer(
          showValidation,
          "bottom",
          () => dispatch({ _tag: "HideValidation", key })
        )
      ] });
    }
    default:
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { children: "Internal error: form item not found" });
  }
};

// src/component.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var FormItem = ({ field, dispatch, model }) => {
  const result = M5.lookup(S6.Ord)(field)(model.forms);
  switch (result._tag) {
    case "Some":
      return formView(field, result.value, dispatch, model);
    default:
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { children: "Internal error" });
  }
};
var FormItemMemo = (0, import_react2.memo)(FormItem, PropEq.equals);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FormItemMemo
});
