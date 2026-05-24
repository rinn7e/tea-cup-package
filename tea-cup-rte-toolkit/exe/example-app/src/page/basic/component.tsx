import React from "react";
import { type Dispatcher } from "tea-cup-fp";
import { markdown } from "@rinn7e/tea-cup-rte-toolkit";

import { examplesPage } from "@/common/type/route";
import { Link } from "@/component/link";
import { EditorComponent } from "@/editor/component";
import type { Model, Msg } from "./type";

interface Props {
  model: Model;
  dispatch: Dispatcher<Msg>;
}

export const BasicPage: React.FC<Props> = ({ model, dispatch }) => {
  return (
    <div>
      <Link route={{ page: examplesPage() }} className="back-link">
        ← Back to Examples
      </Link>

      <h1 className="page-title">Basic Example ✍️</h1>
      <p className="page-description">
        You can use this package to create all sorts of editors. Trying to write
        one from scratch can be a little overwhelming though, so the package
        provides a default spec and default commands as a jumping off point for
        your own editor. In this example, we use the default spec to create an
        editor which supports things like headers, lists, as well as links and
        images.
      </p>

      <EditorComponent
        model={model.editor}
        spec={markdown}
        dispatch={(msg) => dispatch({ _tag: "EditorMsg", subMsg: msg })}
      />
    </div>
  );
};

export const BasicPageMemo = React.memo(BasicPage);
