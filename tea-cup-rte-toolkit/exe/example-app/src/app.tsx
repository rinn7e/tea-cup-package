import React from "react";
import { type Dispatcher } from "tea-cup-fp";

import {
  type AppRoute,
  examplesPage,
  homePage,
  toUrlString,
} from "./common/type/route";
import { BasicPageMemo } from "./page/basic/component";
import { ExamplesPageMemo } from "./page/examples/component";
import { HomePageMemo } from "./page/home/component";
import { MarkdownPageMemo } from "./page/markdown/component";
import { SpecExtensionPageMemo } from "./page/spec-extension/component";
import { SpecFromScratchPageMemo } from "./page/spec-from-scratch/component";
import type { Model, Msg } from "./type";

import { SetGlobalMsgContext } from "./common/global-context";

interface Props {
  model: Model;
  dispatch: Dispatcher<Msg>;
}

export const App: React.FC<Props> = ({ model, dispatch }) => {
  const currentTag = model.route.page._tag;

  const navigateTo = (route: AppRoute, e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({ _tag: "ChangeRoute", route });
  };

  return (
    <SetGlobalMsgContext value={dispatch}>
      <div className="app-container">
        <header className="header">
          <a
            href={toUrlString({ page: homePage() })}
            className="logo-section"
            onClick={(e) => navigateTo({ page: homePage() }, e)}
          >
            <img
              src="https://raw.githubusercontent.com/elm-explorations/rte-toolkit/master/logo.png"
              alt="Logo"
              className="logo-icon"
            />
            <span className="logo-text">Tea Cup RTE</span>
          </a>
          <nav>
            <ul className="nav-links">
              <li>
                <a
                  href={toUrlString({ page: homePage() })}
                  className={`nav-link ${currentTag === "HomePage" ? "active" : ""}`}
                  onClick={(e) => navigateTo({ page: homePage() }, e)}
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href={toUrlString({ page: examplesPage() })}
                  className={`nav-link ${
                    currentTag !== "HomePage" ? "active" : ""
                  }`}
                  onClick={(e) => navigateTo({ page: examplesPage() }, e)}
                >
                  Examples
                </a>
              </li>
            </ul>
          </nav>
        </header>

        <main className="main-content">{renderPage(model, dispatch)}</main>

        <footer className="footer">
          <p>
            💞 Devotedly built for Master using{" "}
            <a
              href="https://github.com/rinn7e/tea-cup-package"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)", textDecoration: "none" }}
            >
              Tea-Cup
            </a>{" "}
            • Inspired by elm-rte-toolkit 🌸
          </p>
        </footer>
      </div>
    </SetGlobalMsgContext>
  );
};

const renderPage = (model: Model, dispatch: Dispatcher<Msg>) => {
  switch (model.pageModel._tag) {
    case "HomePageModel":
      return (
        <HomePageMemo
          model={model.pageModel.model}
          dispatch={(msg) => dispatch({ _tag: "HomePageMsg", subMsg: msg })}
        />
      );
    case "ExamplesPageModel":
      return <ExamplesPageMemo />;
    case "BasicPageModel":
      return (
        <BasicPageMemo
          model={model.pageModel.model}
          dispatch={(msg) => dispatch({ _tag: "BasicPageMsg", subMsg: msg })}
        />
      );
    case "MarkdownPageModel":
      return (
        <MarkdownPageMemo
          model={model.pageModel.model}
          dispatch={(msg) => dispatch({ _tag: "MarkdownPageMsg", subMsg: msg })}
        />
      );
    case "SpecExtensionPageModel":
      return (
        <SpecExtensionPageMemo
          model={model.pageModel.model}
          dispatch={(msg) =>
            dispatch({ _tag: "SpecExtensionPageMsg", subMsg: msg })
          }
        />
      );
    case "SpecFromScratchPageModel":
      return (
        <SpecFromScratchPageMemo
          model={model.pageModel.model}
          dispatch={(msg) =>
            dispatch({ _tag: "SpecFromScratchPageMsg", subMsg: msg })
          }
        />
      );
  }
};
