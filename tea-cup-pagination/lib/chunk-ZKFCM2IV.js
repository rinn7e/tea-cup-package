// src/type.ts
import * as RD from "@devexperts/remote-data-ts";
import { EqAlways } from "@rinn7e/tea-cup-prelude";
import * as A from "fp-ts/lib/Array";
import * as EqClass from "fp-ts/lib/Eq";
import * as N from "fp-ts/lib/number";
var mkModelEq = (itemEq, errEq) => EqClass.struct({
  items: RD.getEq(errEq, A.getEq(itemEq)),
  page: N.Eq,
  pageAmount: N.Eq
});
var mkPropsEq = (itemEq, errEq) => EqClass.struct({
  model: mkModelEq(itemEq, errEq),
  dispatch: EqAlways,
  config: EqAlways,
  itemEq: EqAlways,
  errEq: EqAlways
});

export {
  mkModelEq,
  mkPropsEq
};
