import { fieldContext, formContext } from '../../../lib/form-context'
import { createFormHook } from '@tanstack/react-form'
import InputField from '../../../components/form/input.field'
import DropdownField from '../../../components/form/dropdown.field'

export const { useAppForm: useAccountForm, withForm: withAccountForm } =
  createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
      InputField,
      DropdownField,
    },
    formComponents: {},
  })
