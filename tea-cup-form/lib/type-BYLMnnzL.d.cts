import { Either } from 'fp-ts/lib/Either';
import * as EqClass from 'fp-ts/lib/Eq';
import { Option } from 'fp-ts/lib/Option';
import { FormEvent, MouseEvent, KeyboardEvent, JSX } from 'react';
import { Dispatcher } from 'tea-cup-fp';

type TextInputVariant = {
    _tag: 'Text';
} | {
    _tag: 'Email';
} | {
    _tag: 'Password';
    reveal: boolean;
};
declare const TextInputVariantEq: EqClass.Eq<TextInputVariant>;
declare const textInputVariantToString: (variant: TextInputVariant) => "text" | "email" | "password";
type TextType = {
    _tag: 'TextType';
    placeholder: string;
    label: string;
    currentValue: string;
    validation: (input: string) => Either<string, string>;
    linkValidations: {
        linkKey: string;
        validation: (currentInput: string, linkInput: string) => Either<string, string>;
    }[];
    showValidation: boolean;
    isTextarea: boolean;
    variant: TextInputVariant;
    autocomplete: boolean;
    isFocus: boolean;
    onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    ui?: (props: TextTypeUiArg) => JSX.Element;
};
type TextTypeUiArg = {
    key: string;
    label: string;
    isFocus: boolean;
    placeholder?: string;
    currentValue: string;
    showValidation: boolean;
    dispatch: Dispatcher<Msg>;
    validationResult: Either<string, string>;
    validation: (input: string) => Either<string, string>;
    variant: TextInputVariant;
    autocomplete: boolean;
    isTextarea: boolean;
    onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};
type TextPillType = {
    _tag: 'TextPillType';
    placeholder: string;
    label: string;
    allValues: string[];
    currentValue: string;
    validation: (input: string[]) => Either<string, string[]>;
    showValidation: boolean;
    isTextarea: boolean;
    autocomplete: boolean;
    isFocus: boolean;
    ui?: (props: TextPillTypeUiArg) => JSX.Element;
};
declare const TextPillTypeEq: EqClass.Eq<{
    readonly _tag: "TextPillType";
    readonly placeholder: string;
    readonly label: string;
    readonly allValues: string[];
    readonly currentValue: string;
    readonly validation: (input: string[]) => Either<string, string[]>;
    readonly showValidation: boolean;
    readonly isTextarea: boolean;
    readonly autocomplete: boolean;
    readonly isFocus: boolean;
    readonly ui?: ((props: TextPillTypeUiArg) => JSX.Element) | undefined;
}>;
type TextPillTypeUiArg = {
    key: string;
    label: string;
    isFocus: boolean;
    placeholder?: string;
    allValues: string[];
    currentValue: string;
    showValidation: boolean;
    dispatch: Dispatcher<Msg>;
    validationResult: Either<string, string[]>;
    validation: (input: string[]) => Either<string, string[]>;
    autocomplete: boolean;
    isTextarea: boolean;
};
declare const TextTypeEq: EqClass.Eq<{
    readonly _tag: "TextType";
    readonly placeholder: string;
    readonly label: string;
    readonly currentValue: string;
    readonly validation: (input: string) => Either<string, string>;
    readonly linkValidations: {
        linkKey: string;
        validation: (currentInput: string, linkInput: string) => Either<string, string>;
    }[];
    readonly showValidation: boolean;
    readonly isTextarea: boolean;
    readonly variant: TextInputVariant;
    readonly autocomplete: boolean;
    readonly isFocus: boolean;
    readonly onKeyDown?: ((event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | undefined;
    readonly ui?: ((props: TextTypeUiArg) => JSX.Element) | undefined;
}>;
declare const autocompleteToString: (val: boolean) => "new-password" | "on";
type CheckboxChoice = [string, boolean];
declare const CheckboxChoiceEq: EqClass.Eq<readonly [string, boolean]>;
type CheckboxesTypeUiArg = {
    dispatch: Dispatcher<Msg>;
    fieldKey: string;
    label: string;
    currentValues: CheckboxChoice[];
    isMarkdown: boolean;
};
type CheckboxType = {
    _tag: 'CheckboxType';
    label: string;
    currentValues: CheckboxChoice[];
    validation: (input: CheckboxChoice[]) => Either<string, CheckboxChoice[]>;
    isMarkdown: boolean;
    ui?: (arg: CheckboxesTypeUiArg) => JSX.Element;
};
declare const CheckboxTypeEq: EqClass.Eq<{
    readonly _tag: "CheckboxType";
    readonly label: string;
    readonly currentValues: CheckboxChoice[];
    readonly validation: (input: CheckboxChoice[]) => Either<string, CheckboxChoice[]>;
    readonly isMarkdown: boolean;
    readonly ui?: ((arg: CheckboxesTypeUiArg) => JSX.Element) | undefined;
}>;
type RadioChoice = {
    key: string;
    label: string;
    desc: string;
};
declare const RadioChoiceEq: EqClass.Eq<{
    readonly key: string;
    readonly label: string;
    readonly desc: string;
}>;
type RadiosTypeUiArg = {
    dispatch: Dispatcher<Msg>;
    fieldKey: string;
    label: string;
    choices: RadioChoice[];
    currentValue: Option<string>;
    isMarkdown: boolean;
};
type RadioType = {
    _tag: 'RadioType';
    label: string;
    choices: RadioChoice[];
    currentValue: Option<string>;
    isMarkdown: boolean;
    ui?: (arg: RadiosTypeUiArg) => JSX.Element;
};
declare const RadioTypeEq: EqClass.Eq<{
    readonly _tag: "RadioType";
    readonly label: string;
    readonly choices: RadioChoice[];
    readonly currentValue: Option<string>;
    readonly isMarkdown: boolean;
    readonly ui?: ((arg: RadiosTypeUiArg) => JSX.Element) | undefined;
}>;
type DropdownTypeUiArg = {
    dispatch: Dispatcher<Msg>;
    label: string;
    currentValue: string | null;
    placeholder: string;
    fieldKey: string;
    isFocus: boolean;
    choices: string[];
    validationResult: Either<string, string | null>;
    validation: (input: string | null) => Either<string, string | null>;
    showValidation: boolean;
};
type DropdownType = {
    _tag: 'DropdownType';
    label: string;
    placeholder: string;
    choices: string[];
    currentValue: string | null;
    validation: (input: string | null) => Either<string, string | null>;
    showValidation: boolean;
    isFocus: boolean;
    ui?: (arg: DropdownTypeUiArg) => JSX.Element;
};
declare const DropdownTypeEq: EqClass.Eq<{
    readonly _tag: "DropdownType";
    readonly label: string;
    readonly placeholder: string;
    readonly choices: string[];
    readonly currentValue: string | null;
    readonly validation: (input: string | null) => Either<string, string | null>;
    readonly showValidation: boolean;
    readonly isFocus: boolean;
    readonly ui?: ((arg: DropdownTypeUiArg) => JSX.Element) | undefined;
}>;
type CalendarTypeUiArg = {
    dispatch: Dispatcher<Msg>;
    fieldKey: string;
    label: string;
    placeholder: string;
    currentValue: Date | null;
    isFocus: boolean;
    validationResult: Either<string, Date | null>;
    validation: (input: Date | null) => Either<string, Date | null>;
    showValidation: boolean;
};
type CalendarType = {
    _tag: 'CalendarType';
    label: string;
    placeholder: string;
    currentValue: Date | null;
    validation: (input: Date | null) => Either<string, Date | null>;
    showValidation: boolean;
    isFocus: boolean;
    ui?: (arg: CalendarTypeUiArg) => JSX.Element;
};
declare const CalendarTypeEq: EqClass.Eq<{
    readonly _tag: "CalendarType";
    readonly label: string;
    readonly placeholder: string;
    readonly currentValue: Date | null;
    readonly validation: (input: Date | null) => Either<string, Date | null>;
    readonly showValidation: boolean;
    readonly isFocus: boolean;
    readonly ui?: ((arg: CalendarTypeUiArg) => JSX.Element) | undefined;
}>;
type FileTypeUiArg = {
    dispatch: Dispatcher<Msg>;
    fieldKey: string;
    label: string;
    validationResult: Either<string, File[]>;
    isMultiple: boolean;
    isDrag: boolean;
    showValidation: boolean;
};
type FileType = {
    _tag: 'FileType';
    label: string;
    currentValues: File[];
    isMultiple: boolean;
    showValidation: boolean;
    validation: (input: File[]) => Either<string, File[]>;
    ui?: (arg: FileTypeUiArg) => JSX.Element;
};
declare const FileEq: EqClass.Eq<File>;
declare const FileTypeEq: EqClass.Eq<{
    readonly _tag: "FileType";
    readonly label: string;
    readonly currentValues: File[];
    readonly isMultiple: boolean;
    readonly showValidation: boolean;
    readonly validation: (input: File[]) => Either<string, File[]>;
    readonly ui?: ((arg: FileTypeUiArg) => JSX.Element) | undefined;
}>;
type FormType = TextType | TextPillType | CheckboxType | RadioType | DropdownType | CalendarType | FileType;
declare const FormTypeEq: EqClass.Eq<FormType>;
type Forms = Map<string, FormType>;
declare const FormsEq: EqClass.Eq<Map<string, FormType>>;
type Model = {
    forms: Forms;
    isDrag: boolean;
};
declare const ModelEq: EqClass.Eq<{
    readonly forms: Forms;
    readonly isDrag: boolean;
}>;
type Props = {
    field: string;
    dispatch: Dispatcher<Msg>;
    model: Model;
};
declare const PropEq: EqClass.Eq<{
    readonly field: string;
    readonly dispatch: Dispatcher<Msg>;
    readonly model: Model;
}>;
type TextPillMsg = {
    _tag: 'UpdateTextPill';
    event: FormEvent<HTMLInputElement | HTMLTextAreaElement>;
} | {
    _tag: 'AddPill';
    value: string;
} | {
    _tag: 'RemovePill';
    index: number;
};
type Msg = {
    _tag: 'UpdateForm';
    key: string;
    event: FormEvent<HTMLInputElement>;
} | {
    _tag: 'UpdateFormManual';
    key: string;
    value: string;
} | {
    _tag: 'UpdateCalendar';
    key: string;
    value: Date | null;
} | {
    _tag: 'UpdateDropdownType';
    key: string;
    value: string;
    event?: MouseEvent<HTMLDivElement>;
} | {
    _tag: 'ToggleCheckbox';
    key: string;
    checkbox_key: string;
    value: boolean;
} | {
    _tag: 'UpdateRadio';
    key: string;
    radio_key: string;
    allowUnselected: boolean;
} | {
    _tag: 'AddFile';
    key: string;
    event: FormEvent<HTMLInputElement>;
} | {
    _tag: 'RemoveFile';
    key: string;
    index: number;
} | {
    _tag: 'HandleFocus';
    key: string;
    isFocus: boolean;
} | {
    _tag: 'SetRevealPassword';
    key: string;
    reveal: boolean;
    event: MouseEvent<HTMLElement>;
} | {
    _tag: 'HideValidation';
    key: string;
} | {
    _tag: 'SetIsDrag';
    status: boolean;
} | {
    _tag: 'ResetForm';
    value: Forms;
} | {
    _tag: 'AddFormItem';
    value: [string, FormType];
} | {
    _tag: 'RemoveFormItem';
    value: string;
} | {
    _tag: 'TextPillMsg';
    key: string;
    subMsg: TextPillMsg;
};

export { TextPillTypeEq as A, type TextPillTypeUiArg as B, type CalendarType as C, type DropdownType as D, type TextType as E, FileEq as F, TextTypeEq as G, type TextTypeUiArg as H, autocompleteToString as I, textInputVariantToString as J, type Model as M, PropEq as P, type RadioChoice as R, type TextInputVariant as T, CalendarTypeEq as a, type CalendarTypeUiArg as b, type CheckboxChoice as c, CheckboxChoiceEq as d, type CheckboxType as e, CheckboxTypeEq as f, type CheckboxesTypeUiArg as g, DropdownTypeEq as h, type DropdownTypeUiArg as i, type FileType as j, FileTypeEq as k, type FileTypeUiArg as l, type FormType as m, FormTypeEq as n, type Forms as o, FormsEq as p, ModelEq as q, type Msg as r, type Props as s, RadioChoiceEq as t, type RadioType as u, RadioTypeEq as v, type RadiosTypeUiArg as w, TextInputVariantEq as x, type TextPillMsg as y, type TextPillType as z };
