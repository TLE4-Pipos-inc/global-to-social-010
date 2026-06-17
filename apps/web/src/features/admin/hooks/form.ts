import { fieldContext, formContext } from "#/lib/form-context"
import { createFormHook } from "@tanstack/react-form"
import InputField from "#/components/form/input.field"
import TextAreaField from "#/components/form/text-area.field"
import VenueSelectField from "#/features/venue/components/venue-select.field"

export const { useAppForm: useAdminForm, withForm: withAdminForm } =
  createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
      InputField,
      TextAreaField,
      VenueSelectField,
    },
    formComponents: {},
  })
