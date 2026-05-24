/**
 * This is a helper module derived from the DraftJS logic for determining how to delete a word.
 */

export const punctuationRegexString =
  '[.,+*?$|#{}()\'\\^\\-\\[\\]\\\\\\/!@%"~=<>_:;' +
  '・、。〈-】〔-〟：-？！-／' +
  '［-｀｛-･⸮؟٪-٬؛،؍' +
  '﴾﴿᠁।၊။‐-‧‰-⁞]'

export const chameleonCharactersRegexString = "['‘’]"

export const whitespaceAndPunctuationRegexString =
  '\\s|(?![_])' + punctuationRegexString

export const deleteWordRegexString =
  '^' +
  '(?:' +
  whitespaceAndPunctuationRegexString +
  ')*' +
  '(?:' +
  chameleonCharactersRegexString +
  '|(?!' +
  whitespaceAndPunctuationRegexString +
  ').)*' +
  '(?:(?!' +
  whitespaceAndPunctuationRegexString +
  ').)'

export const backspaceWordRegexString =
  '(?:(?!' +
  whitespaceAndPunctuationRegexString +
  ').)' +
  '(?:' +
  chameleonCharactersRegexString +
  '|(?!' +
  whitespaceAndPunctuationRegexString +
  ').)*' +
  '(?:' +
  whitespaceAndPunctuationRegexString +
  ')*' +
  '$'

export const deleteWordRegex = new RegExp(deleteWordRegexString)
export const backspaceWordRegex = new RegExp(backspaceWordRegexString)
