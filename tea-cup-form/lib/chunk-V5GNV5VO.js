// src/type.ts
import * as A2 from "fp-ts/lib/Array";
import * as D from "fp-ts/lib/Date";
import * as EqClass from "fp-ts/lib/Eq";
import * as Map from "fp-ts/lib/Map";
import * as O from "fp-ts/lib/Option";
import * as B from "fp-ts/lib/boolean";
import * as S from "fp-ts/lib/string";

// src/util/common.ts
import * as A from "fp-ts/lib/Array";
import * as M from "fp-ts/lib/Map";
import { pipe } from "fp-ts/lib/function";
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
var modifyAtIfExist = (E3) => {
  return (k, f) => (m) => {
    const result = pipe(m, M.modifyAt(E3)(k, f));
    switch (result._tag) {
      case "Some":
        return result.value;
      case "None":
        return m;
    }
  };
};
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

// src/util/util.ts
import * as M2 from "fp-ts/lib/Map";
import { pipe as pipe2 } from "fp-ts/lib/function";
import * as S2 from "fp-ts/lib/string";
var lookupForm = (key, formEls) => {
  const result = M2.lookup(S2.Ord)(key)(formEls);
  switch (result._tag) {
    case "Some":
      return result.value;
    default:
      throw new Error(`lookupForm: Unable to find key ${key}`);
  }
};
var lookupFormSafe = (key, formEls) => {
  return M2.lookup(S2.Ord)(key)(formEls);
};
var updateValueTextType = (value, formType) => {
  switch (formType._tag) {
    case "TextType":
      return { ...formType, currentValue: value };
    default:
      throw new Error(`updateValueTextType: not a TextType`);
  }
};
var updateTextPillValue = (value, formType) => {
  switch (formType._tag) {
    case "TextPillType":
      return { ...formType, currentValue: value };
    default:
      throw new Error(`updateTextPillValue: not a TextPillType`);
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
var valuePillTextType = (formType) => {
  switch (formType._tag) {
    case "TextPillType":
      return formType.allValues;
    default:
      throw new Error(
        `valuePillTextType: Expect TextPillType but got ${formType._tag} instead.`
      );
  }
};
var valueCalendarType = (formType) => {
  switch (formType._tag) {
    case "CalendarType":
      return formType.currentValue;
    default:
      throw new Error(
        `valueCalendarType: Expect CalendarType but got ${formType._tag} instead.`
      );
  }
};
var valueDropdownType = (formType) => {
  switch (formType._tag) {
    case "DropdownType":
      return formType.currentValue;
    default:
      throw new Error(
        `valueDropdownType: Expect DropdownType but got ${formType._tag} instead.`
      );
  }
};
var valueFileType = (formType) => {
  switch (formType._tag) {
    case "FileType":
      return formType.currentValues;
    default:
      throw new Error(
        `valueFileType: Expect FileType but got ${formType._tag} instead.`
      );
  }
};
var valueCheckboxType = (formType) => {
  switch (formType._tag) {
    case "CheckboxType":
      return formType.currentValues;
    default:
      throw new Error(
        `valueCheckboxType: Expect CheckboxType but got ${formType._tag} instead.`
      );
  }
};
var valueRadioType = (formType) => {
  switch (formType._tag) {
    case "RadioType":
      return formType.currentValue;
    default:
      throw new Error(
        `valueRadioType: Expect RadioType but got ${formType._tag} instead.`
      );
  }
};
var unsafeModifyFormValue = (key, newVal) => (formEls) => {
  return pipe2(
    formEls,
    modifyAtIfExist(S2.Eq)(key, (val) => {
      switch (val._tag) {
        case "TextType":
        case "TextPillType":
          return { ...val, currentValue: newVal };
        case "DropdownType":
          return { ...val, currentValue: newVal };
        case "CalendarType":
          return { ...val, currentValue: new Date(newVal) };
        default:
          throw new Error(`unsafeModifyFormValue: formType not supported`);
      }
    })
  );
};
var showAllValidation = (forms) => {
  return pipe2(
    forms,
    M2.map((val) => {
      switch (val._tag) {
        case "TextType":
        case "TextPillType":
        case "CalendarType":
        case "DropdownType":
        case "FileType":
          return { ...val, showValidation: true };
        default:
          return val;
      }
    })
  );
};

// src/validation.ts
import * as A3 from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as M3 from "fp-ts/lib/Map";
import { pipe as pipe3 } from "fp-ts/lib/function";
import * as S3 from "fp-ts/lib/string";
var nonEmptyValidator = (input, fieldName) => {
  if (input.trim() === "") return E.left(`${fieldName} is required`);
  else return E.right(input);
};
var notNullValidator = (input) => {
  if (!input) return E.left("Required");
  else return E.right(input);
};
var notNoneValidator = (input) => {
  if (input._tag === "None") return E.left("Required");
  else return E.right(input);
};
var emailValidator = (input) => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  if (emailRegex.test(input)) {
    return E.right(input);
  } else {
    return E.left("The email is not a valid email");
  }
};
var numberValidator = (input) => {
  const num = Number(input);
  return isNaN(num) ? E.left("Input should be a number") : E.right(input);
};
var minLengthValidator = (label, minLength) => (input) => {
  if (input.length < minLength)
    return E.left(`${label} should be at least ${minLength} characters long`);
  else return E.right(input);
};
var maxLengthValidator = (label, maxLength) => (input) => {
  if (input.length > maxLength)
    return E.left(`${label} should be at most ${maxLength} characters long`);
  else return E.right(input);
};
var allSelectRequired = (inputs) => {
  const isAllChecked = pipe3(
    inputs,
    A3.map(([_, bool]) => bool),
    and
  );
  if (isAllChecked) return E.right(inputs);
  else return E.left("You must checked this.");
};
var atLeastOneSelected = (inputs) => {
  const isOneSelected = pipe3(
    inputs,
    A3.map(([_, bool]) => bool),
    or
  );
  if (isOneSelected) return E.right(inputs);
  else return E.left("You must at least check one value");
};
var exactLengthFileValidator = (exactLength) => (inputs) => {
  if (inputs.length === exactLength) return E.right(inputs);
  else {
    const plural = exactLength > 1 ? "s" : "";
    return E.left(`Please upload exactly ${exactLength} file${plural}.`);
  }
};
var phoneValidator = (input) => {
  const phoneRegex = /^[\d\s+()]+$/;
  if (phoneRegex.test(input)) {
    return E.right(input);
  } else {
    return E.left("Only 0-9, (, ), + and spaces are allowed");
  }
};
var idValidator = (input) => {
  const idRegex = /^[A-Za-z0-9 .-]+$/;
  if (idRegex.test(input)) {
    return E.right(input);
  } else {
    return E.left("Only a-z, A-Z, 0-9, -, . and spaces are allowed");
  }
};
var fromMB = (mb) => mb * 1e3 * 1e3;
var maxSizeFileValidator = (maxSizeInByte) => (inputs) => {
  return pipe3(
    inputs,
    A3.map((file) => file.size > maxSizeInByte),
    or,
    (isBigFileExist) => {
      if (isBigFileExist)
        return E.left(
          `Each files is limited to ${maxSizeInByte / (1e3 * 1e3)} MB.`
        );
      else return E.right(inputs);
    }
  );
};
var hasDuplicates = (array) => {
  return new Set(array).size !== array.length;
};
var imageFileValidator = (inputs) => {
  return pipe3(
    inputs,
    A3.map((file) => file.type.split("/")[0] !== "image"),
    or,
    (isNotImageFileExist) => {
      if (isNotImageFileExist)
        return E.left(`All the files should be image files.`);
      else return E.right(inputs);
    }
  );
};
var uniqueFileValidator = (inputs) => {
  return pipe3(
    inputs,
    A3.map((file) => file.name),
    (files) => {
      if (hasDuplicates(files)) return E.left(`Cannot upload the same files.`);
      else return E.right(inputs);
    }
  );
};
var noExtraValidation = (forms) => E.right(forms);
var notTheSameExtraValidation = (initialForms) => (forms) => {
  const extractValue = (form) => pipe3(
    form,
    M3.mapWithIndex((_, val) => {
      switch (val._tag) {
        case "TextType":
          return val.currentValue;
        case "TextPillType":
          return JSON.stringify(val.allValues);
        case "CalendarType":
          return JSON.stringify(val.currentValue);
        case "DropdownType":
          return JSON.stringify(val.currentValue);
        case "CheckboxType":
          return JSON.stringify(val.currentValues);
        case "RadioType":
          return JSON.stringify(val.currentValue);
        case "FileType":
          throw new Error(
            "FileType not support `notTheSameExtraValidation`."
          );
      }
    })
  );
  const isTheSame = M3.getEq(S3.Eq, S3.Eq).equals(
    extractValue(initialForms),
    extractValue(forms)
  );
  if (isTheSame) return E.left("The form values have not been changed.");
  else return E.right(forms);
};
var runValidationForAll = (forms, extraValidation) => {
  const isAllFieldValid = pipe3(
    forms,
    M3.mapWithIndex((_, val) => {
      switch (val._tag) {
        case "TextType": {
          return runValidationAndLink(val, forms)._tag === "Right";
        }
        case "TextPillType": {
          return val.validation(val.allValues)._tag === "Right";
        }
        case "CalendarType": {
          return val.validation(val.currentValue)._tag === "Right";
        }
        case "DropdownType": {
          return val.validation(val.currentValue)._tag === "Right";
        }
        case "CheckboxType": {
          return val.validation(val.currentValues)._tag === "Right";
        }
        case "RadioType": {
          return true;
        }
        case "FileType": {
          return val.validation(val.currentValues)._tag === "Right";
        }
        default:
          return true;
      }
    }),
    M3.toArray(S3.Ord),
    A3.map(([_, val]) => val),
    and
  );
  return isAllFieldValid ? extraValidation(forms) : E.left("Some fields are invalid.");
};
var runValidationAndLink = (formType, forms) => {
  const validationResult = formType.validation(formType.currentValue);
  if (validationResult._tag === "Right") {
    const validationResultArray = pipe3(
      formType.linkValidations,
      A3.map((linkValidation) => {
        const linkValue = pipe3(
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
    return pipe3(
      validationResultArray,
      A3.reduce(validationResult, (b, a) => {
        if (a._tag === "Left") return a;
        else return b;
      })
    );
  } else return validationResult;
};
var runValidation = (formType) => {
  switch (formType._tag) {
    case "TextType":
      return formType.validation(formType.currentValue);
    case "TextPillType":
      return formType.validation(formType.allValues);
    case "CalendarType":
      return formType.validation(formType.currentValue);
    case "DropdownType":
      return formType.validation(formType.currentValue);
    case "CheckboxType":
      return formType.validation(formType.currentValues);
    case "RadioType":
      return E.right(formType.currentValue);
    case "FileType":
      return formType.validation(formType.currentValues);
  }
};

// src/util/default-config.tsx
import * as E2 from "fp-ts/lib/Either";
var defaultTextType = (inputUi) => ({
  _tag: "TextType",
  placeholder: "Username",
  label: "Username",
  currentValue: "",
  validation: (val) => E2.right(val),
  linkValidations: [],
  showValidation: false,
  isTextarea: false,
  isFocus: false,
  variant: { _tag: "Text" },
  autocomplete: false,
  ui: inputUi ? inputUi : void 0
});
var defaultCheckboxType = (currentValues, inputUi) => {
  return {
    _tag: "CheckboxType",
    label: "Checkbox",
    currentValues,
    validation: (inputs) => E2.right(inputs),
    isMarkdown: false,
    ui: inputUi ? inputUi : void 0
  };
};
var defaultRadioType = (choices, currentValue, inputUi) => {
  return {
    _tag: "RadioType",
    label: "Radio",
    choices,
    currentValue,
    isMarkdown: true,
    ui: inputUi ? inputUi : void 0
  };
};
var defaultDropdownType = (inputUi) => ({
  _tag: "DropdownType",
  label: "Country",
  choices: ["Cambodia", "Russia"],
  currentValue: null,
  validation: (val) => E2.right(val),
  showValidation: false,
  isFocus: false,
  placeholder: "Select a value",
  ui: inputUi
});
var defaultCalendarType = (inputUi) => ({
  _tag: "CalendarType",
  label: "Birthday",
  placeholder: "Select date",
  currentValue: null,
  validation: (val) => E2.right(val),
  showValidation: false,
  isFocus: false,
  ui: inputUi ? inputUi : void 0
});
var defaultFileType = (inputUi) => ({
  _tag: "FileType",
  label: "Files",
  currentValues: [],
  isMultiple: false,
  showValidation: false,
  validation: (val) => E2.right(val),
  ui: inputUi ? inputUi : void 0
});
var defaultTextPillType = (inputUi) => ({
  _tag: "TextPillType",
  placeholder: "Tags",
  label: "Tags",
  allValues: [],
  currentValue: "",
  validation: (val) => E2.right(val),
  showValidation: false,
  isTextarea: false,
  isFocus: false,
  autocomplete: false,
  ui: inputUi ? inputUi : void 0
});

// src/view.tsx
import * as A5 from "fp-ts/lib/Array";
import * as O3 from "fp-ts/lib/Option";
import { pipe as pipe5 } from "fp-ts/lib/function";
import * as S5 from "fp-ts/lib/string";

// src/error-tooltip/helper.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var arrowTop = () => /* @__PURE__ */ jsx("div", { className: "relative", children: /* @__PURE__ */ jsx(
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
var arrowDown = () => /* @__PURE__ */ jsx("div", { className: "relative", children: /* @__PURE__ */ jsx(
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
  return /* @__PURE__ */ jsx("div", { className: "relative w-full", children: /* @__PURE__ */ jsx("div", { className: `pointer-events-none absolute z-100 w-full ${position}`, children: /* @__PURE__ */ jsx("div", { className: "flex w-full flex-col items-center", children: errorText._tag === "Some" ? errorPopup(errorText.value, direction, onClick) : null }) }) });
};
var errorPopup = (errorText, direction, onClick) => {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "pointer-events-auto flex cursor-pointer flex-col items-center",
      onClick,
      children: [
        direction === "bottom" ? arrowTop() : null,
        /* @__PURE__ */ jsx("div", { className: "z-10 rounded bg-red-500 px-[8px] py-[5px] text-white drop-shadow-lg", children: /* @__PURE__ */ jsx("p", { className: "text-center text-[14px] leading-[20px] whitespace-pre-line", children: errorText }) }),
        direction === "top" ? arrowDown() : null
      ]
    }
  );
};

// src/view/default-view.tsx
import * as A4 from "fp-ts/lib/Array";
import * as M4 from "fp-ts/lib/Map";
import * as O2 from "fp-ts/lib/Option";
import { pipe as pipe4 } from "fp-ts/lib/function";
import * as S4 from "fp-ts/lib/string";
import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// src/view/common.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var emptyEl = () => /* @__PURE__ */ jsx2("div", {});

// src/view/default-view.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var CalendarInput = React.forwardRef((props, ref) => /* @__PURE__ */ jsx3(
  "input",
  {
    ...props,
    ref,
    className: "w-full bg-transparent px-4 py-3 font-medium text-slate-800 outline-none"
  }
));
var IconChevronDown = () => /* @__PURE__ */ jsx3(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-5 w-5",
    children: /* @__PURE__ */ jsx3("polyline", { points: "6 9 12 15 18 9" })
  }
);
var IconCalendar = () => /* @__PURE__ */ jsxs2(
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
      /* @__PURE__ */ jsx3("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
      /* @__PURE__ */ jsx3("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
      /* @__PURE__ */ jsx3("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
      /* @__PURE__ */ jsx3("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
    ]
  }
);
var IconUpload = () => /* @__PURE__ */ jsxs2(
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
      /* @__PURE__ */ jsx3("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
      /* @__PURE__ */ jsx3("polyline", { points: "17 8 12 3 7 8" }),
      /* @__PURE__ */ jsx3("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
    ]
  }
);
var IconEye = () => /* @__PURE__ */ jsxs2(
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
      /* @__PURE__ */ jsx3("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }),
      /* @__PURE__ */ jsx3("circle", { cx: "12", cy: "12", r: "3" })
    ]
  }
);
var IconEyeOff = () => /* @__PURE__ */ jsxs2(
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
      /* @__PURE__ */ jsx3("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }),
      /* @__PURE__ */ jsx3("line", { x1: "1", y1: "1", x2: "23", y2: "23" })
    ]
  }
);
var IconCheck = () => /* @__PURE__ */ jsx3(
  "svg",
  {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-3 w-3",
    children: /* @__PURE__ */ jsx3("polyline", { points: "20 6 9 17 4 12" })
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
  return /* @__PURE__ */ jsxs2("div", { className: "group flex w-full flex-col gap-1", children: [
    errorTooltipContainer(
      errorMsg,
      "top",
      () => dispatch({ _tag: "HideValidation", key })
    ),
    label !== "" && /* @__PURE__ */ jsx3("label", { className: getLabelClasses(isError, isFocus), children: label }),
    /* @__PURE__ */ jsx3("div", { className: getContainerClasses(isError, isFocus), children: /* @__PURE__ */ jsxs2("div", { className: "flex flex-row items-center", children: [
      /* @__PURE__ */ jsx3(
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
          return /* @__PURE__ */ jsx3(
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
              children: variant.reveal ? /* @__PURE__ */ jsx3(IconEyeOff, {}) : /* @__PURE__ */ jsx3(IconEye, {})
            }
          );
        } else return emptyEl();
      })
    ] }) })
  ] }, key);
};
var radioView = (isSelected, onClick) => {
  return /* @__PURE__ */ jsx3(
    "div",
    {
      className: [
        "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-200",
        isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white group-hover:border-blue-400 hover:border-blue-400"
      ].join(" "),
      onClick: () => onClick(isSelected),
      children: /* @__PURE__ */ jsx3(
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
  return /* @__PURE__ */ jsxs2(
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
        /* @__PURE__ */ jsx3(
          "div",
          {
            className: [
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border shadow-xs transition-all duration-200",
              val ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white group-hover:border-blue-400"
            ].join(" "),
            children: /* @__PURE__ */ jsx3(
              "div",
              {
                className: [
                  "transform transition-all duration-200",
                  val ? "scale-100 opacity-100" : "scale-75 opacity-0"
                ].join(" "),
                children: /* @__PURE__ */ jsx3(IconCheck, {})
              }
            )
          }
        ),
        /* @__PURE__ */ jsx3("span", { className: "text-[15px] font-medium text-slate-700 transition-colors select-none group-hover:text-slate-900", children: key })
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
}) => /* @__PURE__ */ jsxs2("div", { id: "CheckboxType", className: "flex flex-col gap-1", children: [
  label !== "" && /* @__PURE__ */ jsx3("label", { className: "mb-1 px-1 text-sm font-bold tracking-tight text-slate-600", children: label }),
  /* @__PURE__ */ jsx3("div", { className: "flex flex-col gap-1", children: pipe4(
    currentValues,
    A4.map(
      (checkboxChoice) => defaultCheckboxView({ dispatch, fieldKey, checkboxChoice, isMarkdown })
    )
  ) })
] });
var defaultRadioView = (arg) => {
  return /* @__PURE__ */ jsxs2(
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
        /* @__PURE__ */ jsxs2("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsx3("span", { className: "text-[15px] font-medium text-slate-700 transition-colors select-none group-hover:text-slate-900", children: arg.radioChoice.label }),
          arg.radioChoice.desc && /* @__PURE__ */ jsx3("span", { className: "text-xs text-slate-400", children: arg.radioChoice.desc })
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
}) => /* @__PURE__ */ jsxs2("div", { id: "RadioType", className: "flex flex-col gap-1", children: [
  label !== "" && /* @__PURE__ */ jsx3("label", { className: "mb-1 px-1 text-sm font-bold tracking-tight text-slate-600", children: label }),
  /* @__PURE__ */ jsx3("div", { className: "flex flex-col gap-1", children: pipe4(
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
  return /* @__PURE__ */ jsxs2("div", { className: "group flex w-full flex-col gap-1", children: [
    errorTooltipContainer(
      errorMsg,
      "top",
      () => dispatch({ _tag: "HideValidation", key: fieldKey })
    ),
    label !== "" && /* @__PURE__ */ jsx3("label", { className: getLabelClasses(isError, isFocus), children: label }),
    /* @__PURE__ */ jsx3("div", { className: getContainerClasses(isError, isFocus), children: /* @__PURE__ */ jsxs2("div", { className: "flex flex-row items-center", children: [
      /* @__PURE__ */ jsx3(
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
      /* @__PURE__ */ jsx3("div", { className: "pointer-events-none pr-3 text-slate-400 transition-colors group-hover:text-slate-600", children: /* @__PURE__ */ jsx3(IconChevronDown, {}) })
    ] }) }),
    isFocus && /* @__PURE__ */ jsx3("div", { className: "relative", children: /* @__PURE__ */ jsx3(
      "div",
      {
        className: "animate-in fade-in zoom-in-95 absolute top-2 z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl duration-200",
        style: { maxHeight: "350px" },
        children: /* @__PURE__ */ jsx3("div", { className: "scrollbar-hide overflow-y-auto py-1.5", children: pipe4(
          choices,
          A4.map((choice) => /* @__PURE__ */ jsx3(
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
  return /* @__PURE__ */ jsxs2("div", { className: "group flex w-full flex-col gap-1", children: [
    errorTooltipContainer(
      errorMsg,
      "top",
      () => dispatch({ _tag: "HideValidation", key: fieldKey })
    ),
    label !== "" && /* @__PURE__ */ jsx3("label", { className: getLabelClasses(isError, isFocus), children: label }),
    /* @__PURE__ */ jsx3("div", { className: getContainerClasses(isError, isFocus), children: /* @__PURE__ */ jsxs2("div", { className: "flex flex-row items-center", children: [
      /* @__PURE__ */ jsx3("div", { className: "w-full", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsx3(
        DatePicker,
        {
          className: "z-[100]",
          showYearDropdown: true,
          scrollableYearDropdown: true,
          yearDropdownItemNumber: 100,
          selected: currentValue,
          placeholderText: placeholder,
          dateFormat: "dd.MM.yyyy",
          customInput: /* @__PURE__ */ jsx3(CalendarInput, {}),
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
      /* @__PURE__ */ jsx3("div", { className: "pointer-events-none pr-3 text-slate-400 transition-colors group-hover:text-slate-600", children: /* @__PURE__ */ jsx3(IconCalendar, {}) })
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
  return /* @__PURE__ */ jsxs2("div", { className: "flex w-full flex-col gap-1", children: [
    label !== "" && /* @__PURE__ */ jsx3("label", { className: getLabelClasses(isError, false), children: label }),
    /* @__PURE__ */ jsxs2(
      "div",
      {
        className: [
          "relative flex min-h-[160px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300",
          isDrag ? "border-blue-500 bg-blue-50 ring-4 ring-blue-50" : isError ? "border-red-300 bg-red-50 hover:border-red-400" : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
        ].join(" "),
        children: [
          /* @__PURE__ */ jsx3(
            "input",
            {
              type: "file",
              multiple: isMultiple,
              className: "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0",
              onInput: (event) => dispatch({ _tag: "AddFile", key: fieldKey, event })
            }
          ),
          /* @__PURE__ */ jsxs2("div", { className: "flex flex-col items-center gap-4 px-6 text-center", children: [
            /* @__PURE__ */ jsx3(
              "div",
              {
                className: [
                  "rounded-2xl p-3 transition-colors duration-200",
                  isDrag ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-400 shadow-sm"
                ].join(" "),
                children: /* @__PURE__ */ jsx3(IconUpload, {})
              }
            ),
            /* @__PURE__ */ jsxs2("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsx3("p", { className: "text-[15px] font-bold text-slate-700", children: isDrag ? "Drop to upload" : "Click or drop files here" }),
              /* @__PURE__ */ jsxs2("p", { className: "max-w-[240px] text-xs leading-relaxed font-medium text-slate-400", children: [
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
  return /* @__PURE__ */ jsxs2("div", { className: "group flex w-full flex-col gap-1", children: [
    errorTooltipContainer(
      errorMsg,
      "top",
      () => dispatch({ _tag: "HideValidation", key })
    ),
    label !== "" && /* @__PURE__ */ jsx3("label", { className: getLabelClasses(isError, isFocus), children: label }),
    /* @__PURE__ */ jsx3("div", { className: getContainerClasses(isError, isFocus), children: /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-center gap-2 px-3 py-2", children: [
      pipe4(
        allValues,
        A4.mapWithIndex((index, val) => /* @__PURE__ */ jsxs2(
          "div",
          {
            className: "flex items-center gap-2 rounded-lg bg-slate-100 py-1 pr-1.5 pl-3 text-[13px] font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-200 hover:text-slate-900",
            children: [
              /* @__PURE__ */ jsx3("span", { children: val }),
              /* @__PURE__ */ jsx3(
                "button",
                {
                  type: "button",
                  className: "flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-red-500",
                  onClick: () => dispatch({
                    _tag: "TextPillMsg",
                    key,
                    subMsg: { _tag: "RemovePill", index }
                  }),
                  children: /* @__PURE__ */ jsxs2(
                    "svg",
                    {
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "3",
                      className: "h-3 w-3",
                      children: [
                        /* @__PURE__ */ jsx3("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                        /* @__PURE__ */ jsx3("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
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
      /* @__PURE__ */ jsx3(
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

// src/view.tsx
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var IconFile = () => /* @__PURE__ */ jsxs3(
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
      /* @__PURE__ */ jsx4("path", { d: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" }),
      /* @__PURE__ */ jsx4("polyline", { points: "13 2 13 9 20 9" })
    ]
  }
);
var IconX = () => /* @__PURE__ */ jsxs3(
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
      /* @__PURE__ */ jsx4("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
      /* @__PURE__ */ jsx4("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
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
          const results = pipe5(
            val.currentValues,
            A5.mapWithIndex((i, file) => {
              return /* @__PURE__ */ jsxs3("div", { className: "flex gap-4", children: [
                /* @__PURE__ */ jsx4("div", { className: "flex h-[42px] w-[60px] items-center justify-center rounded bg-slate-50", children: file.type.startsWith("image/") ? /* @__PURE__ */ jsx4(
                  "img",
                  {
                    className: "h-full w-full object-contain",
                    src: URL.createObjectURL(file)
                  }
                ) : /* @__PURE__ */ jsx4(IconFile, {}) }),
                /* @__PURE__ */ jsxs3("div", { className: "grow", style: { maxWidth: "257px" }, children: [
                  /* @__PURE__ */ jsx4("p", { className: "truncate text-[13px] font-semibold text-slate-700", children: file.name }),
                  /* @__PURE__ */ jsxs3("div", { className: "flex text-xs text-slate-400", children: [
                    /* @__PURE__ */ jsxs3("p", { children: [
                      limitDecimal2Digit(file.size / 1e3),
                      " KB"
                    ] }),
                    /* @__PURE__ */ jsx4("p", { className: "px-2 font-semibold", children: "\u22C5" }),
                    /* @__PURE__ */ jsx4("p", { className: "uppercase", children: file.type.split("/")[1] || file.type })
                  ] })
                ] }),
                /* @__PURE__ */ jsx4(
                  "button",
                  {
                    type: "button",
                    className: "flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500",
                    onClick: () => dispatch({ _tag: "RemoveFile", key, index: i }),
                    children: /* @__PURE__ */ jsx4(IconX, {})
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
      return /* @__PURE__ */ jsxs3("div", { className: "flex flex-col", children: [
        /* @__PURE__ */ jsxs3("div", { className: "flex flex-col items-center justify-stretch gap-6", children: [
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
      return /* @__PURE__ */ jsx4("div", { children: "Internal error: form item not found" });
  }
};
var addFiles = (msg, model, files) => {
  const newForm = exec(() => {
    if (files) {
      return pipe5(
        model.forms,
        modifyAtIfExist(S5.Eq)(msg.key, (form) => {
          if (form._tag === "FileType")
            return {
              ...form,
              currentValues: form.currentValues.concat(toFileArray(files)),
              showValidation: true
            };
          else {
            console.log("FileType: Try to update a field that is not FileType");
            return form;
          }
        })
      );
    } else return model.forms;
  });
  return { ...model, forms: newForm };
};
var toFileArray = (files) => {
  const a = [];
  for (let i = 0; i < files.length; i++) {
    a[i] = files[i];
  }
  return a;
};

export {
  modifyAtIfExist,
  TextInputVariantEq,
  textInputVariantToString,
  TextPillTypeEq,
  TextTypeEq,
  autocompleteToString,
  CheckboxChoiceEq,
  CheckboxTypeEq,
  RadioChoiceEq,
  RadioTypeEq,
  DropdownTypeEq,
  CalendarTypeEq,
  FileEq,
  FileTypeEq,
  FormTypeEq,
  FormsEq,
  ModelEq,
  PropEq,
  lookupForm,
  lookupFormSafe,
  updateValueTextType,
  updateTextPillValue,
  valueTextType,
  valuePillTextType,
  valueCalendarType,
  valueDropdownType,
  valueFileType,
  valueCheckboxType,
  valueRadioType,
  unsafeModifyFormValue,
  showAllValidation,
  nonEmptyValidator,
  notNullValidator,
  notNoneValidator,
  emailValidator,
  numberValidator,
  minLengthValidator,
  maxLengthValidator,
  allSelectRequired,
  atLeastOneSelected,
  exactLengthFileValidator,
  phoneValidator,
  idValidator,
  fromMB,
  maxSizeFileValidator,
  imageFileValidator,
  uniqueFileValidator,
  noExtraValidation,
  notTheSameExtraValidation,
  runValidationForAll,
  runValidationAndLink,
  runValidation,
  defaultTextType,
  defaultCheckboxType,
  defaultRadioType,
  defaultDropdownType,
  defaultCalendarType,
  defaultFileType,
  defaultTextPillType,
  formView,
  addFiles
};
