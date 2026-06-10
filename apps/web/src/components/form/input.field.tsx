import { useFieldContext } from "#/lib/form-context"
import { Field, FieldError, FieldLabel } from "#/components/ui/field"
import { Input } from "#/components/ui/input"

type InputFieldProps = {
  label: string
  placeholder?: string
  autocomplete?: string
  type?: string
}

function InputField({
  label,
  placeholder,
  autocomplete = "off",
  type = "text",
}: InputFieldProps) {
  const field = useFieldContext<string | undefined>()
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        placeholder={placeholder}
        autoComplete={autocomplete}
        type={type}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}

export default InputField
