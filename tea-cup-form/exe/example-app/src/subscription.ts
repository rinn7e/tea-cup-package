import * as Form from '@rinn7e/tea-cup-form'
import { Sub } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const subscriptions = (model: Model): Sub<Msg> =>
  Form.subscriptions(model.form).map(
    (subMsg: Form.Msg): Msg => ({
      _tag: 'FormMsg',
      subMsg,
    }),
  )
