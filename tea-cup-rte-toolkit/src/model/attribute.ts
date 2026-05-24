import { Option, none, some } from 'fp-ts/lib/Option';

export type Attribute =
  | { readonly _tag: 'StringAttribute'; readonly key: string; readonly value: string }
  | { readonly _tag: 'IntegerAttribute'; readonly key: string; readonly value: number }
  | { readonly _tag: 'BoolAttribute'; readonly key: string; readonly value: boolean }
  | { readonly _tag: 'FloatAttribute'; readonly key: string; readonly value: number };

export const StringAttribute = (key: string, value: string): Attribute => ({
  _tag: 'StringAttribute',
  key,
  value,
});

export const IntegerAttribute = (key: string, value: number): Attribute => ({
  _tag: 'IntegerAttribute',
  key,
  value,
});

export const BoolAttribute = (key: string, value: boolean): Attribute => ({
  _tag: 'BoolAttribute',
  key,
  value,
});

export const FloatAttribute = (key: string, value: number): Attribute => ({
  _tag: 'FloatAttribute',
  key,
  value,
});

export function findBoolAttribute(name: string, attributes: Array<Attribute>): Option<boolean> {
  for (const attr of attributes) {
    if (attr._tag === 'BoolAttribute' && attr.key === name) {
      return some(attr.value);
    }
  }
  return none;
}

export function findFloatAttribute(name: string, attributes: Array<Attribute>): Option<number> {
  for (const attr of attributes) {
    if (attr._tag === 'FloatAttribute' && attr.key === name) {
      return some(attr.value);
    }
  }
  return none;
}

export function findStringAttribute(name: string, attributes: Array<Attribute>): Option<string> {
  for (const attr of attributes) {
    if (attr._tag === 'StringAttribute' && attr.key === name) {
      return some(attr.value);
    }
  }
  return none;
}

export function findIntegerAttribute(name: string, attributes: Array<Attribute>): Option<number> {
  for (const attr of attributes) {
    if (attr._tag === 'IntegerAttribute' && attr.key === name) {
      return some(attr.value);
    }
  }
  return none;
}

export function replaceOrAddBoolAttribute(name: string, value: boolean, attributes: Array<Attribute>): Array<Attribute> {
  const found = findStringAttribute(name, attributes);
  if (found._tag === 'None') {
    return [BoolAttribute(name, value), ...attributes];
  } else {
    return attributes.map(x => {
      if (x._tag === 'BoolAttribute' && x.key === name) {
        return BoolAttribute(name, value);
      }
      return x;
    });
  }
}

export function replaceOrAddStringAttribute(name: string, value: string, attributes: Array<Attribute>): Array<Attribute> {
  const found = findStringAttribute(name, attributes);
  if (found._tag === 'None') {
    return [StringAttribute(name, value), ...attributes];
  } else {
    return attributes.map(x => {
      if (x._tag === 'StringAttribute' && x.key === name) {
        return StringAttribute(name, value);
      }
      return x;
    });
  }
}

export function replaceOrAddIntegerAttribute(name: string, value: number, attributes: Array<Attribute>): Array<Attribute> {
  const found = findStringAttribute(name, attributes);
  if (found._tag === 'None') {
    return [IntegerAttribute(name, value), ...attributes];
  } else {
    return attributes.map(x => {
      if (x._tag === 'IntegerAttribute' && x.key === name) {
        return IntegerAttribute(name, value);
      }
      return x;
    });
  }
}

export function replaceOrAddFloatAttribute(name: string, value: number, attributes: Array<Attribute>): Array<Attribute> {
  const found = findStringAttribute(name, attributes);
  if (found._tag === 'None') {
    return [FloatAttribute(name, value), ...attributes];
  } else {
    return attributes.map(x => {
      if (x._tag === 'FloatAttribute' && x.key === name) {
        return FloatAttribute(name, value);
      }
      return x;
    });
  }
}
