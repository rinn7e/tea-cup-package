import {
  Formatter,
  Match,
  Parser,
  Route,
  end,
  format,
  lit,
  parse,
  zero,
} from "@rinn7e/fp-ts-routing";
import * as O from "fp-ts/lib/Option";

import { BASE_URL } from "@/common/env";

import {
  type AppPage,
  type AppRoute,
  basicPage,
  examplesPage,
  homePage,
  markdownPage,
  specExtensionPage,
  specFromScratchPage,
} from "./type";

export const removeBaseUrl = (href: string): string => {
  const url = new URL(href);
  let pathname = url.pathname;
  const base = BASE_URL.replace(/\/$/, "");
  if (base !== "" && pathname.startsWith(base)) {
    pathname = pathname.slice(base.length);
  }
  return (pathname || "/") + url.search;
};

export const addBaseUrl = (path: string): string => {
  const base = BASE_URL.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  return base + "/" + cleanPath;
};

// Matchers
const homeMatch = end;
const examplesMatch = lit("examples").and(end);
const basicMatch = lit("examples").and(lit("basic")).and(end);
const markdownMatch = lit("examples").and(lit("markdown")).and(end);
const specExtensionMatch = lit("examples").and(lit("spec-extension")).and(end);
const specFromScratchMatch = lit("examples")
  .and(lit("spec-from-scratch"))
  .and(end);

const anyStrings = new Match<object>(
  new Parser((r) => O.some([{}, new Route([], r.query)])),
  new Formatter((r) => r),
);

// App Router
const appRouter: Parser<AppPage> = zero<AppPage>()
  .alt(homeMatch.parser.map(() => homePage()))
  .alt(examplesMatch.parser.map(() => examplesPage()))
  .alt(basicMatch.parser.map(() => basicPage()))
  .alt(markdownMatch.parser.map(() => markdownPage()))
  .alt(specExtensionMatch.parser.map(() => specExtensionPage()))
  .alt(specFromScratchMatch.parser.map(() => specFromScratchPage()))
  .alt(anyStrings.parser.map(() => homePage())); // default to home page on mismatch

export const parseAppRoute = (_mainUrl: string, href: string): AppRoute => {
  const pathname = removeBaseUrl(href);
  const page = parse(appRouter, Route.parse(pathname), homePage());
  return { page };
};

// Formatter
export const toUrlString = (r: AppRoute): string => {
  const page = r.page;
  const getPath = () => {
    switch (page._tag) {
      case "HomePage":
        return format(homeMatch.formatter, {});
      case "ExamplesPage":
        return format(examplesMatch.formatter, {});
      case "BasicPage":
        return format(basicMatch.formatter, {});
      case "MarkdownPage":
        return format(markdownMatch.formatter, {});
      case "SpecExtensionPage":
        return format(specExtensionMatch.formatter, {});
      case "SpecFromScratchPage":
        return format(specFromScratchMatch.formatter, {});
    }
  };

  const path = getPath();
  return addBaseUrl(path);
};
