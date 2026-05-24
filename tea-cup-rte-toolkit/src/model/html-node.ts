export type HtmlAttribute = [string, string];

export type HtmlNode =
  | {
      readonly _tag: 'ElementNode';
      readonly name: string;
      readonly attributes: Array<HtmlAttribute>;
      readonly children: Array<HtmlNode>;
    }
  | {
      readonly _tag: 'TextNode';
      readonly text: string;
    };

export const ElementNode = (
  name: string,
  attributes: Array<HtmlAttribute>,
  children: Array<HtmlNode>
): HtmlNode => ({
  _tag: 'ElementNode',
  name,
  attributes,
  children,
});

export const TextNode = (text: string): HtmlNode => ({
  _tag: 'TextNode',
  text,
});
