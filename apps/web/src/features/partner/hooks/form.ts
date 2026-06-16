import { fieldContext, formContext } from "#/lib/form-context"
import { createFormHook } from "@tanstack/react-form"
import InputField from "#/components/form/input.field"
import TextAreaField from "#/components/form/text-area.field"
import PartnershipSelectField from "#/features/partner/components/partnership-select.field"

export const { useAppForm: usePartnerForm, withForm: withPartnerForm } =
  createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
      InputField,
      TextAreaField,
      PartnershipSelectField,
    },
    formComponents: {},
  })
