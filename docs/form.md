# How to make and use forms

_This file was made with the help of Claude sonnet 4.6 based on my own written code_

[Back](./../README.md)

**Index:**

- [Zod schema](#zod-schema)
- [Form hook](#form-hook)
- [Using a form](#using-a-form)
- [Field components](#field-components)

---

## Zod schema

Schemas live in the `types/` folder alongside the TypeScript types for that resource. The schema serves two purposes: runtime validation in the form, and the TypeScript type used across the app (form values, API calls, etc.).

```ts
// types/post.ts
import z from "zod"

export const PostSchema = z.object({
  // Always write custom error messages — they're shown directly to the user
  title: z.string()
    .min(10, "Title must be at least 10 characters")
    .max(50, "Title must be at most 50 characters"),
  content: z.string()
    .min(6, "Content must be at least 6 characters")
    .max(500, "Content must be at most 500 characters"),
})

// Infer the type from the schema — don't write it by hand
export type Post = z.infer<typeof PostSchema>
```

> **Note on optional fields:** Optional fields (`.optional()`) cause type errors when used in `validators.onSubmit`. If you need optional fields, handle them after submission rather than in the schema passed to the form.

---

## Form hook

Each feature has one form hook, shared across create and edit. It lives in `features/<name>/hooks/<name>.form.ts`.

```ts
// features/post/hooks/post.form.ts
import { fieldContext, formContext } from "#/lib/form-context"
import { createFormHook } from "@tanstack/react-form"
import InputField from "#/components/form/input.field"
import TextAreaField from "#/components/form/text-area.field"

export const { useAppForm: usePostForm, withForm: withPostForm } =
  createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
      InputField,
      TextAreaField,
    },
    formComponents: {},
  })
```

`fieldComponents` lists every field type the form can use. If you need a field type that isn't listed here, add the component here first (see [Field components](#field-components)).

---

## Using a form

The hook is shared between create and edit. The only difference between them is the `defaultValues` and what the `onSubmit` calls.

```tsx
import { usePostForm } from "#/features/post/hooks/post.form"
import { PostSchema } from "#/types/post"

// In a create route:
const form = usePostForm({
  defaultValues: {
    title: "",
    content: "",
  },
  validators: {
    onSubmit: PostSchema,
  },
  onSubmit: ({ value }) => {
    createPost.mutate(value, { /* ... */ })
  },
})

// In an edit route — same hook, pre-filled values:
const form = usePostForm({
  defaultValues: {
    title: post.title,
    content: post.content,
  },
  validators: {
    onSubmit: PostSchema,
  },
  onSubmit: ({ value }) => {
    updatePost.mutate(value, { /* ... */ })
  },
})
```

### Rendering the form

```tsx
return (
  <form
    onSubmit={(e) => {
      e.preventDefault()
      form.handleSubmit()
    }}
  >
    <FieldGroup>
      <form.AppField
        name="title"  {/* must match the schema key */}
        children={(field) => (
          <field.InputField
            label="Title"
            placeholder="Title"
          />
        )}
      />

      <form.AppField
        name="content"
        children={(field) => (
          <field.TextAreaField
            label="Content"
            placeholder="Content"
            {/* Pull maxLength directly from the schema — no magic numbers */}
            maxCharacters={`${PostSchema.shape.content.maxLength}`}
            rows={8}
          />
        )}
      />

      {/* Use isPending from the mutation for the loading state */}
      <Button type="submit" disabled={createPost.isPending}>
        {createPost.isPending && <Spinner />}
        {createPost.isPending ? "Creating..." : "Create Post"}
      </Button>
    </FieldGroup>
  </form>
)
```

The `name` prop on `form.AppField` must match a key in the schema exactly. TypeScript will error if it doesn't.

---

## Field components

Field components live in `components/form/`. They use `useFieldContext` to read and update their value — you don't pass `value` or `onChange` props manually.

```tsx
// components/form/input.field.tsx
import { useFieldContext } from "#/lib/form-context"
import { Field, FieldError, FieldLabel } from "#/components/ui/field"
import { Input } from "#/components/ui/input"

type InputFieldProps = {
  label: string
  placeholder?: string
}

function InputField({ label, placeholder }: InputFieldProps) {
  const field = useFieldContext<string | undefined>()
  // Only show validation errors after the user has interacted with the field
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value ?? ""}
        placeholder={placeholder}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
```

### Adding a new field type

If you need a field type that doesn't exist yet (e.g. a select or checkbox):

1. Create the component in `components/form/` following the pattern above — use `useFieldContext` with the appropriate value type.
2. Register it in the relevant form hook's `fieldComponents`.
3. It will then be available as `field.YourNewField` inside `form.AppField`.
