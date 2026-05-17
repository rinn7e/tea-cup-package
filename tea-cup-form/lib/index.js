import {
  CalendarTypeEq,
  CheckboxChoiceEq,
  CheckboxTypeEq,
  DropdownTypeEq,
  FileEq,
  FileTypeEq,
  FormTypeEq,
  FormsEq,
  ModelEq,
  PropEq,
  RadioChoiceEq,
  RadioTypeEq,
  TextInputVariantEq,
  TextPillTypeEq,
  TextTypeEq,
  addFiles,
  allSelectRequired,
  atLeastOneSelected,
  autocompleteToString,
  defaultCalendarType,
  defaultCheckboxType,
  defaultDropdownType,
  defaultFileType,
  defaultRadioType,
  defaultTextPillType,
  defaultTextType,
  emailValidator,
  exactLengthFileValidator,
  formView,
  fromMB,
  idValidator,
  imageFileValidator,
  lookupForm,
  lookupFormSafe,
  maxLengthValidator,
  maxSizeFileValidator,
  minLengthValidator,
  modifyAtIfExist,
  noExtraValidation,
  nonEmptyValidator,
  notNoneValidator,
  notNullValidator,
  notTheSameExtraValidation,
  numberValidator,
  phoneValidator,
  runValidation,
  runValidationAndLink,
  runValidationForAll,
  showAllValidation,
  textInputVariantToString,
  uniqueFileValidator,
  unsafeModifyFormValue,
  updateTextPillValue,
  updateValueTextType,
  valueCalendarType,
  valueCheckboxType,
  valueDropdownType,
  valueFileType,
  valuePillTextType,
  valueRadioType,
  valueTextType
} from "./chunk-V5GNV5VO.js";

// src/update.ts
import * as A from "fp-ts/lib/Array";
import * as M from "fp-ts/lib/Map";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";
import * as S from "fp-ts/lib/string";
var init = (initialForms) => ({
  forms: initialForms,
  isDrag: false
});
var textPillMsgHandler = (msg, form) => {
  switch (msg._tag) {
    case "UpdateTextPill":
      return updateTextPillValue(
        msg.event.target.value,
        form
      );
    case "AddPill":
      return {
        ...form,
        allValues: form.allValues.concat(msg.value),
        currentValue: ""
      };
    case "RemovePill":
      return {
        ...form,
        allValues: pipe(
          form.allValues,
          A.deleteAt(msg.index),
          (res) => res._tag === "Some" ? res.value : form.allValues
        )
      };
  }
};
var update = (msg) => (model) => {
  switch (msg._tag) {
    case "UpdateForm": {
      if (msg.event && msg.event.target) {
        const newForm = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form) => {
            if (form._tag === "TextType") {
              return updateValueTextType(
                msg.event.target.value,
                form
              );
            } else return form;
          })
        );
        return { ...model, forms: newForm };
      } else return model;
    }
    case "UpdateFormManual": {
      const newForm = pipe(
        model.forms,
        modifyAtIfExist(S.Eq)(msg.key, (form) => {
          if (form._tag === "TextType") {
            return updateValueTextType(msg.value, form);
          } else return form;
        })
      );
      return { ...model, forms: newForm };
    }
    case "TextPillMsg": {
      const newForm = pipe(
        model.forms,
        modifyAtIfExist(S.Eq)(msg.key, (form) => {
          if (form._tag === "TextPillType") {
            return textPillMsgHandler(msg.subMsg, form);
          } else return form;
        })
      );
      return { ...model, forms: newForm };
    }
    case "UpdateCalendar": {
      if (msg.value) {
        const newForms = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form) => {
            if (form._tag === "CalendarType")
              return { ...form, currentValue: msg.value };
            else {
              console.log(
                "UpdateCalendar: Try to update a field that is not calendar"
              );
              return form;
            }
          })
        );
        return { ...model, forms: newForms };
      } else return model;
    }
    case "UpdateDropdownType": {
      msg.event?.preventDefault();
      if (msg.value) {
        const newForms = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form) => {
            if (form._tag === "DropdownType")
              return {
                ...form,
                currentValue: msg.value,
                isFocus: false
              };
            else {
              console.log(
                "UpdateDropdownType: Try to update a field that is not Dropdown"
              );
              return form;
            }
          })
        );
        return { ...model, forms: newForms };
      } else return model;
    }
    case "ToggleCheckbox": {
      const newForms = pipe(
        model.forms,
        modifyAtIfExist(S.Eq)(msg.key, (form) => {
          if (form._tag === "CheckboxType")
            return {
              ...form,
              currentValues: pipe(
                form.currentValues,
                A.map(([key, value]) => [
                  key,
                  key === msg.checkbox_key ? msg.value : value
                ])
              )
            };
          else {
            console.log(
              "ToggleCheckbox: Try to update a field that is not CheckboxType"
            );
            return form;
          }
        })
      );
      return { ...model, forms: newForms };
    }
    case "UpdateRadio": {
      const newForms = pipe(
        model.forms,
        modifyAtIfExist(S.Eq)(msg.key, (form) => {
          if (form._tag === "RadioType") {
            if (msg.allowUnselected) {
              if (form.currentValue._tag === "Some" && form.currentValue.value === msg.radio_key)
                return {
                  ...form,
                  currentValue: O.none
                };
              else
                return {
                  ...form,
                  currentValue: O.some(msg.radio_key)
                };
            } else
              return {
                ...form,
                currentValue: O.some(msg.radio_key)
              };
          } else {
            console.log(
              "UpdateRadio: Try to update a field that is not RadioType"
            );
            return form;
          }
        })
      );
      return { ...model, forms: newForms };
    }
    case "AddFile": {
      msg.event.preventDefault();
      const files = msg.event.target.files;
      return addFiles(msg, model, files);
    }
    case "RemoveFile": {
      const newForms = pipe(
        model.forms,
        modifyAtIfExist(S.Eq)(msg.key, (form) => {
          if (form._tag === "FileType") {
            const result = pipe(form.currentValues, A.deleteAt(msg.index));
            return {
              ...form,
              currentValues: result._tag === "Some" ? result.value : form.currentValues,
              showValidation: true
            };
          } else {
            console.log(
              "FileType: Try to update a field that is not FileType"
            );
            return form;
          }
        })
      );
      return { ...model, forms: newForms };
    }
    case "HandleFocus": {
      const newForms = pipe(
        model.forms,
        modifyAtIfExist(S.Eq)(msg.key, (formType) => {
          if (formType._tag === "TextType" || formType._tag === "TextPillType" || formType._tag === "CalendarType" || formType._tag === "DropdownType") {
            return {
              ...formType,
              isFocus: msg.isFocus,
              showValidation: !msg.isFocus ? true : formType.showValidation
            };
          } else return formType;
        })
      );
      return { ...model, forms: newForms };
    }
    case "SetRevealPassword": {
      msg.event.preventDefault();
      const newForms = pipe(
        model.forms,
        modifyAtIfExist(S.Eq)(msg.key, (formType) => {
          switch (formType._tag) {
            case "TextType":
              return {
                ...formType,
                variant: formType.variant._tag === "Password" ? {
                  _tag: "Password",
                  reveal: msg.reveal
                } : formType.variant
              };
            default:
              return formType;
          }
        })
      );
      return { ...model, forms: newForms };
    }
    case "HideValidation": {
      const newForms = pipe(
        model.forms,
        modifyAtIfExist(S.Eq)(msg.key, (formType) => {
          switch (formType._tag) {
            case "TextType":
            case "TextPillType":
              return { ...formType, showValidation: false };
            case "FileType":
              return { ...formType, showValidation: false };
            default:
              return formType;
          }
        })
      );
      return { ...model, forms: newForms };
    }
    case "SetIsDrag": {
      return { forms: model.forms, isDrag: msg.status };
    }
    case "ResetForm": {
      return { forms: msg.value, isDrag: false };
    }
    case "AddFormItem": {
      const [key, formItem] = msg.value;
      const newForms = pipe(model.forms, M.upsertAt(S.Eq)(key, formItem));
      return { ...model, forms: newForms };
    }
    case "RemoveFormItem": {
      const newForms = pipe(model.forms, M.deleteAt(S.Eq)(msg.value));
      return { ...model, forms: newForms };
    }
  }
};
export {
  CalendarTypeEq,
  CheckboxChoiceEq,
  CheckboxTypeEq,
  DropdownTypeEq,
  FileEq,
  FileTypeEq,
  FormTypeEq,
  FormsEq,
  ModelEq,
  PropEq,
  RadioChoiceEq,
  RadioTypeEq,
  TextInputVariantEq,
  TextPillTypeEq,
  TextTypeEq,
  addFiles,
  allSelectRequired,
  atLeastOneSelected,
  autocompleteToString,
  defaultCalendarType,
  defaultCheckboxType,
  defaultDropdownType,
  defaultFileType,
  defaultRadioType,
  defaultTextPillType,
  defaultTextType,
  emailValidator,
  exactLengthFileValidator,
  formView,
  fromMB,
  idValidator,
  imageFileValidator,
  init,
  lookupForm,
  lookupFormSafe,
  maxLengthValidator,
  maxSizeFileValidator,
  minLengthValidator,
  noExtraValidation,
  nonEmptyValidator,
  notNoneValidator,
  notNullValidator,
  notTheSameExtraValidation,
  numberValidator,
  phoneValidator,
  runValidation,
  runValidationAndLink,
  runValidationForAll,
  showAllValidation,
  textInputVariantToString,
  textPillMsgHandler,
  uniqueFileValidator,
  unsafeModifyFormValue,
  update,
  updateTextPillValue,
  updateValueTextType,
  valueCalendarType,
  valueCheckboxType,
  valueDropdownType,
  valueFileType,
  valuePillTextType,
  valueRadioType,
  valueTextType
};
