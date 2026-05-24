import { newUrl } from "react-tea-cup";
import { Cmd, Task } from "tea-cup-fp";

import {
  type AppRoute,
  AppRouteEq,
  parseAppRoute,
  toUrlString,
} from "@/common/type/route";
import * as Basic from "@/page/basic/update";
import * as Examples from "@/page/examples/update";
import * as Home from "@/page/home/update";
import * as Markdown from "@/page/markdown/update";
import * as SpecExtension from "@/page/spec-extension/update";
import * as SpecFromScratch from "@/page/spec-from-scratch/update";
import type { Model, Msg } from "@/type";

export const preInit = (location: Location): [Model | null, Cmd<Msg>] => {
  return [
    null,
    Task.perform(
      Task.succeed({
        _tag: "UrlChange" as const,
        location,
      }),
      (msg) => msg,
    ),
  ];
};

export const preUpdate = (
  msg: Msg,
  model: Model | null,
): [Model | null, Cmd<Msg>] => {
  if (model === null) {
    if (msg._tag === "UrlChange") {
      return init(msg.location);
    }
    return [null, Cmd.none()];
  }
  return update(msg, model);
};

export const init = (location: Location): [Model, Cmd<Msg>] => {
  const route = parseAppRoute("", location.href);
  const model: Model = {
    route,
    pageModel: { _tag: "HomePageModel", model: Home.init()[0] },
    isInternal: false,
  };
  return navigate(route, false)(model);
};

export const initPageModel =
  (newRoute: AppRoute) =>
  (model: Model): [Model, Cmd<Msg>] => {
    switch (newRoute.page._tag) {
      case "HomePage": {
        const [homeModel, homeCmd] = Home.init();
        return [
          {
            ...model,
            route: newRoute,
            pageModel: { _tag: "HomePageModel", model: homeModel },
          },
          homeCmd.map((msg) => ({ _tag: "HomePageMsg", subMsg: msg })),
        ];
      }
      case "ExamplesPage": {
        const [examplesModel, examplesCmd] = Examples.init();
        return [
          {
            ...model,
            route: newRoute,
            pageModel: { _tag: "ExamplesPageModel", model: examplesModel },
          },
          examplesCmd.map((msg) => ({ _tag: "ExamplesPageMsg", subMsg: msg })),
        ];
      }
      case "BasicPage": {
        const [basicModel, basicCmd] = Basic.init();
        return [
          {
            ...model,
            route: newRoute,
            pageModel: { _tag: "BasicPageModel", model: basicModel },
          },
          basicCmd.map((msg) => ({ _tag: "BasicPageMsg", subMsg: msg })),
        ];
      }
      case "MarkdownPage": {
        const [mdModel, mdCmd] = Markdown.init();
        return [
          {
            ...model,
            route: newRoute,
            pageModel: { _tag: "MarkdownPageModel", model: mdModel },
          },
          mdCmd.map((msg) => ({ _tag: "MarkdownPageMsg", subMsg: msg })),
        ];
      }
      case "SpecExtensionPage": {
        const [seModel, seCmd] = SpecExtension.init();
        return [
          {
            ...model,
            route: newRoute,
            pageModel: { _tag: "SpecExtensionPageModel", model: seModel },
          },
          seCmd.map((msg) => ({ _tag: "SpecExtensionPageMsg", subMsg: msg })),
        ];
      }
      case "SpecFromScratchPage": {
        const [sfsModel, sfsCmd] = SpecFromScratch.init();
        return [
          {
            ...model,
            route: newRoute,
            pageModel: { _tag: "SpecFromScratchPageModel", model: sfsModel },
          },
          sfsCmd.map((msg) => ({
            _tag: "SpecFromScratchPageMsg",
            subMsg: msg,
          })),
        ];
      }
    }
  };

const navigate =
  (newRoute: AppRoute, isInternal: boolean) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [updatedModel, updatedCmd] = initPageModel(newRoute)(model);

    const urlCmd = isInternal
      ? Task.perform(
          newUrl(toUrlString(newRoute)),
          (): Msg => ({ _tag: "UrlChange", location: window.location }),
        )
      : Cmd.none<Msg>();

    return [
      {
        ...updatedModel,
        isInternal,
      },
      Cmd.batch([urlCmd, updatedCmd]),
    ];
  };

const execChangeRoute =
  (newRoute: AppRoute, isInternal: boolean) =>
  (model: Model): [Model, Cmd<Msg>] => {
    if (!AppRouteEq.equals(model.route, newRoute)) {
      return navigate(newRoute, isInternal)(model);
    } else {
      return [model, Cmd.none()];
    }
  };

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case "UrlChange": {
      if (model.isInternal) {
        return [
          {
            ...model,
            isInternal: false,
          },
          Cmd.none(),
        ];
      } else {
        const route = parseAppRoute("", msg.location.href);
        return execChangeRoute(route, false)(model);
      }
    }
    case "ChangeRoute": {
      return execChangeRoute(msg.route, true)(model);
    }

    case "HomePageMsg": {
      if (model.pageModel._tag === "HomePageModel") {
        const [homeModel, homeCmd] = Home.update(
          msg.subMsg,
          model.pageModel.model,
        );
        return [
          {
            ...model,
            pageModel: { _tag: "HomePageModel", model: homeModel },
          },
          homeCmd.map((subMsg) => ({ _tag: "HomePageMsg", subMsg })),
        ];
      }
      return [model, Cmd.none()];
    }

    case "ExamplesPageMsg": {
      if (model.pageModel._tag === "ExamplesPageModel") {
        const [examplesModel, examplesCmd] = Examples.update(
          msg.subMsg,
          model.pageModel.model,
        );
        return [
          {
            ...model,
            pageModel: { _tag: "ExamplesPageModel", model: examplesModel },
          },
          examplesCmd.map((subMsg) => ({ _tag: "ExamplesPageMsg", subMsg })),
        ];
      }
      return [model, Cmd.none()];
    }

    case "BasicPageMsg": {
      if (model.pageModel._tag === "BasicPageModel") {
        const [basicModel, basicCmd] = Basic.update(
          msg.subMsg,
          model.pageModel.model,
        );
        return [
          {
            ...model,
            pageModel: { _tag: "BasicPageModel", model: basicModel },
          },
          basicCmd.map((subMsg) => ({ _tag: "BasicPageMsg", subMsg })),
        ];
      }
      return [model, Cmd.none()];
    }

    case "MarkdownPageMsg": {
      if (model.pageModel._tag === "MarkdownPageModel") {
        const [mdModel, mdCmd] = Markdown.update(
          msg.subMsg,
          model.pageModel.model,
        );
        return [
          {
            ...model,
            pageModel: { _tag: "MarkdownPageModel", model: mdModel },
          },
          mdCmd.map((subMsg) => ({ _tag: "MarkdownPageMsg", subMsg })),
        ];
      }
      return [model, Cmd.none()];
    }

    case "SpecExtensionPageMsg": {
      if (model.pageModel._tag === "SpecExtensionPageModel") {
        const [seModel, seCmd] = SpecExtension.update(
          msg.subMsg,
          model.pageModel.model,
        );
        return [
          {
            ...model,
            pageModel: { _tag: "SpecExtensionPageModel", model: seModel },
          },
          seCmd.map((subMsg) => ({ _tag: "SpecExtensionPageMsg", subMsg })),
        ];
      }
      return [model, Cmd.none()];
    }

    case "SpecFromScratchPageMsg": {
      if (model.pageModel._tag === "SpecFromScratchPageModel") {
        const [sfsModel, sfsCmd] = SpecFromScratch.update(
          msg.subMsg,
          model.pageModel.model,
        );
        return [
          {
            ...model,
            pageModel: { _tag: "SpecFromScratchPageModel", model: sfsModel },
          },
          sfsCmd.map((subMsg) => ({ _tag: "SpecFromScratchPageMsg", subMsg })),
        ];
      }
      return [model, Cmd.none()];
    }
  }
};
