import { fieldContext, formContext } from "#/lib/form-context"
import { createFormHook } from "@tanstack/react-form"
import InputField from "#/components/form/input.field"
import TextAreaField from "#/components/form/text-area.field"
import TriggerMinuteField from "#/components/form/trigger-minute.field"
import InterestSelectField from "#/components/form/interest-select.field"

export const {
  useAppForm: useConversationStarterForm,
  withForm: withConversationStarterForm,
} = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    InputField,
    TextAreaField,
    TriggerMinuteField,
    InterestSelectField,
  },
  formComponents: {},
})
