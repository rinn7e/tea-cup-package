import { o as Forms, M as Model, y as TextPillMsg, z as TextPillType, r as Msg, m as FormType, c as CheckboxChoice, E as TextType, b as CalendarTypeUiArg, C as CalendarType, g as CheckboxesTypeUiArg, e as CheckboxType, i as DropdownTypeUiArg, D as DropdownType, l as FileTypeUiArg, j as FileType, R as RadioChoice, w as RadiosTypeUiArg, u as RadioType, B as TextPillTypeUiArg, H as TextTypeUiArg } from './type-BYLMnnzL.js';
export { a as CalendarTypeEq, d as CheckboxChoiceEq, f as CheckboxTypeEq, h as DropdownTypeEq, F as FileEq, k as FileTypeEq, n as FormTypeEq, p as FormsEq, q as ModelEq, P as PropEq, s as Props, t as RadioChoiceEq, v as RadioTypeEq, T as TextInputVariant, x as TextInputVariantEq, A as TextPillTypeEq, G as TextTypeEq, I as autocompleteToString, J as textInputVariantToString } from './type-BYLMnnzL.js';
import * as O from 'fp-ts/lib/Option';
import { Option } from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';
import { Either } from 'fp-ts/lib/Either';
import { JSX } from 'react';
import { Dispatcher } from 'tea-cup-fp';
import 'fp-ts/lib/Eq';

declare const init: (initialForms: Forms) => Model;
declare const textPillMsgHandler: (msg: TextPillMsg, form: TextPillType) => TextPillType;
declare const update: (msg: Msg) => (model: Model) => Model;

/**
 * Lookup `FormType` from a forms, throw error if it doesn't exist.
 */
declare const lookupForm: (key: string, formEls: Forms) => FormType;
declare const lookupFormSafe: (key: string, formEls: Forms) => O.Option<FormType>;
/**
 * Update the value of `TextType`,  throw error if it is not.
 */
declare const updateValueTextType: (value: string, formType: FormType) => FormType;
/**
 * Update the value of `TextPillType`,  throw error if it is not.
 */
declare const updateTextPillValue: (value: string, formType: FormType) => FormType;
/**
 * Extract the current value from a `TextType`, throw error if it is not.
 */
declare const valueTextType: (formType: FormType) => string;
/**
 * Extract the current pills from a `TextPillType`, throw error if it is not.
 */
declare const valuePillTextType: (formType: FormType) => string[];
/**
 * Extract the current value from a `CalendarType`, throw error if it is not.
 */
declare const valueCalendarType: (formType: FormType) => Date | null;
/**
 * Extract the current value from a `DropdownType`, throw error if it is not.
 */
declare const valueDropdownType: (formType: FormType) => string | null;
/**
 * Extract the current value from a `FileType`, throw error if it is not.
 */
declare const valueFileType: (formType: FormType) => File[];
/**
 * Extract the current value from a `CheckboxType`, throw error if it is not.
 */
declare const valueCheckboxType: (formType: FormType) => [string, boolean][];
/**
 * Extract the current value from a `RadioType`, throw error if it is not.
 */
declare const valueRadioType: (formType: FormType) => O.Option<string>;
/**
 * Modify the current value of a form type using `string`. Should be used for testing only.
 */
declare const unsafeModifyFormValue: (key: string, newVal: string) => (formEls: Forms) => Map<string, FormType>;
/**
 * Set `showValidation` to `true` for all form types that support it.
 */
declare const showAllValidation: (forms: Forms) => Forms;

declare const nonEmptyValidator: (input: string, fieldName: string) => Either<string, string>;
declare const notNullValidator: <A>(input: A | null) => Either<string, A | null>;
declare const notNoneValidator: <A>(input: Option<A>) => Either<string, Option<A>>;
declare const emailValidator: (input: string) => Either<string, string>;
declare const numberValidator: (input: string) => Either<string, string>;
declare const minLengthValidator: (label: string, minLength: number) => (input: string) => Either<string, string>;
declare const maxLengthValidator: (label: string, maxLength: number) => (input: string) => Either<string, string>;
declare const allSelectRequired: (inputs: [string, boolean][]) => Either<string, [string, boolean][]>;
declare const atLeastOneSelected: (inputs: [string, boolean][]) => Either<string, [string, boolean][]>;
declare const exactLengthFileValidator: (exactLength: number) => (inputs: File[]) => Either<string, File[]>;
declare const phoneValidator: (input: string) => Either<string, string>;
declare const idValidator: (input: string) => Either<string, string>;
declare const fromMB: (mb: number) => number;
declare const maxSizeFileValidator: (maxSizeInByte: number) => (inputs: File[]) => Either<string, File[]>;
declare const imageFileValidator: (inputs: File[]) => Either<string, File[]>;
declare const uniqueFileValidator: (inputs: File[]) => Either<string, File[]>;
declare const noExtraValidation: (forms: Forms) => Either<never, Forms>;
declare const notTheSameExtraValidation: (initialForms: Forms) => (forms: Forms) => E.Left<string> | E.Right<Forms>;
declare const runValidationForAll: (forms: Forms, extraValidation: (forms: Forms) => Either<string, Forms>) => Either<string, Forms>;
declare const runValidationAndLink: (formType: TextType, forms: Forms) => Either<string, string>;
declare const runValidation: (formType: FormType) => E.Left<string> | E.Right<string[]> | E.Right<Date | null> | E.Right<string | null> | E.Right<CheckboxChoice[]> | E.Right<File[]> | E.Right<Option<string>>;

declare const defaultTextType: (inputUi?: (props: TextTypeUiArg) => JSX.Element) => TextType;
declare const defaultCheckboxType: (currentValues: CheckboxChoice[], inputUi?: (arg: CheckboxesTypeUiArg) => JSX.Element) => CheckboxType;
declare const defaultRadioType: (choices: RadioChoice[], currentValue: Option<string>, inputUi?: (arg: RadiosTypeUiArg) => JSX.Element) => RadioType;
declare const defaultDropdownType: (inputUi?: (arg: DropdownTypeUiArg) => JSX.Element) => DropdownType;
declare const defaultCalendarType: (inputUi?: (arg: CalendarTypeUiArg) => JSX.Element) => CalendarType;
declare const defaultFileType: (inputUi?: (arg: FileTypeUiArg) => JSX.Element) => FileType;
declare const defaultTextPillType: (inputUi?: (props: TextPillTypeUiArg) => JSX.Element) => TextPillType;

declare const formView: (key: string, val: FormType, dispatch: Dispatcher<Msg>, model: Model) => JSX.Element;
declare const addFiles: (msg: {
    key: string;
}, model: Model, files: FileList | null | undefined) => Model;

export { CalendarType, CalendarTypeUiArg, CheckboxChoice, CheckboxType, CheckboxesTypeUiArg, DropdownType, DropdownTypeUiArg, FileType, FileTypeUiArg, FormType, Forms, Model, Msg, RadioChoice, RadioType, RadiosTypeUiArg, TextPillMsg, TextPillType, TextPillTypeUiArg, TextType, TextTypeUiArg, addFiles, allSelectRequired, atLeastOneSelected, defaultCalendarType, defaultCheckboxType, defaultDropdownType, defaultFileType, defaultRadioType, defaultTextPillType, defaultTextType, emailValidator, exactLengthFileValidator, formView, fromMB, idValidator, imageFileValidator, init, lookupForm, lookupFormSafe, maxLengthValidator, maxSizeFileValidator, minLengthValidator, noExtraValidation, nonEmptyValidator, notNoneValidator, notNullValidator, notTheSameExtraValidation, numberValidator, phoneValidator, runValidation, runValidationAndLink, runValidationForAll, showAllValidation, textPillMsgHandler, uniqueFileValidator, unsafeModifyFormValue, update, updateTextPillValue, updateValueTextType, valueCalendarType, valueCheckboxType, valueDropdownType, valueFileType, valuePillTextType, valueRadioType, valueTextType };
