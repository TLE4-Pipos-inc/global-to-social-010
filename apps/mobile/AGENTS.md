# Mobile App — Agent Guide

This document describes the conventions agents must follow when working in `apps/mobile/`. Read it before writing any code.

---

## Theme & Base Components

### Theme Constants — `src/constants/theme.js`

All colors and fonts come from this file. Never hardcode color hex values or font names inline.

```js
import { Colors, Fonts } from '@/constants/theme'
```

**Colors** covers: `text`, `background`, `tint`, `icon`, `tabIconDefault`, `tabIconSelected`, `greenColor`, `lightGreenColor`, `yellowColor`, `orangeColor`, `darkGreenColor`.

**Fonts** exposes one key: `bold` — the string `"Montserrat_700Bold"`. This font is loaded in the root layout via `expo-google-fonts`. Apply it via `fontFamily` in StyleSheet:

```js
{ fontFamily: Fonts.bold }
```

---

### ThemedText — `src/components/themed-text.jsx`

Wraps React Native `Text`. Always use this instead of raw `<Text>`.

```jsx
import ThemedText from '@/components/themed-text'

<ThemedText type="title">Hello</ThemedText>
```

Available `type` values: `default`, `title`, `defaultSemiBold`, `subtitle`, `text`, `link`.

---

### ThemedView — `src/components/themed-view.jsx`

Wraps React Native `View` and applies `Colors.background`. Use it as the root container for screens and sections.

---

### Buttons — `src/components/buttons.jsx`

Four variants, all accepting a `title` prop and any `Pressable` prop:

| Component | When to use |
|---|---|
| `PrimaryLightButton` | Primary action on a light background |
| `PrimaryLightOutlineButton` | Secondary action on a light background |
| `PrimaryDarkButton` | Primary action on a dark background |
| `PrimaryDarkOutlineButton` | Secondary action on a dark background |

```jsx
import { PrimaryLightButton } from '@/components/buttons'

<PrimaryLightButton title="Log in" onPress={handleSubmit} />
```

Never build a custom `Pressable` for a standard call-to-action — use one of these variants.

---

## Feature Folders

Features live in `src/features/<feature-name>/`.

```
src/features/
└── auth/
    ├── hooks/
    │   ├── query.js   ← data fetching (React Query)
    │   └── form.js    ← form setup (TanStack Form)
    └── index.js       ← barrel export (re-export public API here)
```

When adding a new feature (e.g. `venues`), create this same structure:

```
src/features/venues/
├── hooks/
│   ├── query.js
│   └── form.js        ← only if the feature has forms
└── index.js
```

Screens in `src/app/` import from the feature barrel (`@/features/auth`), never from deep internal paths.

---

## Query Hooks — `hooks/query.js`

Every feature's `query.js` follows a three-layer pattern. Keep these three layers in this exact order and never collapse them.

### Layer 1 — Fetch function (plain async)

A plain `async` function that calls the API. It should throw on error and return parsed JSON on success. Uses `fetchWithAuth` from `@/lib/api` for authenticated requests.

```js
import { fetchWithAuth } from '@/lib/api'

async function fetchVenues() {
  const res = await fetchWithAuth('/api/venues')
  if (!res.ok) throw new Error('Failed to fetch venues')
  return res.json()
}
```

### Layer 2 — Query options (reusable config)

Created with `queryOptions()` from `@tanstack/react-query`. Exporting this object (not just the hook) allows other code to prefetch or invalidate with the same key.

```js
import { queryOptions } from '@tanstack/react-query'

export const venuesQueryOptions = queryOptions({
  queryKey: ['venues'],
  queryFn: fetchVenues,
})
```

### Layer 3 — Hook (consumer-facing)

A named hook that wraps `useSuspenseQuery` with the options from layer 2.

```js
import { useSuspenseQuery } from '@tanstack/react-query'

export function useVenuesQuery() {
  return useSuspenseQuery(venuesQueryOptions)
}
```

Screens import only the hook. Other hooks or loaders that need the key import the options object.

---

## Form Hooks — `hooks/form.js`

Every feature that has forms gets its own form hook, created with `createFormHook` from `@tanstack/react-form`. This ties the feature's form to the shared field/form contexts and pre-registers the field components.

```js
import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from '@/lib/form-context'
import InputField from '@/components/form/input.field'
import DropdownField from '@/components/form/dropdown.field'

export const { useAppForm: useVenueForm, withForm: withVenueForm } =
  createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
      InputField,
      DropdownField,
    },
    formComponents: {},
  })
```

Screens call the feature's `useAppForm` alias (e.g. `useVenueForm`) — never the generic `useAppForm` from the library directly. This keeps validation schemas and field registration co-located with the feature.

### Form field components

Field components (`InputField`, `DropdownField`) consume the shared field context via `useFieldContext()`. They must not receive value/onChange as props — the context handles that. To use a field inside a form:

```jsx
<form.Field name="email">
  {(field) => <field.components.InputField placeholder="Email" />}
</form.Field>
```

---

## Validation Checklist

After making any changes, run ESLint before considering the task done:

```sh
pnpm --filter mobile lint
```

The build must produce **zero new errors and zero new warnings**. Fix all issues before finishing — do not suppress rules with `eslint-disable` comments unless the suppression was already present in the file before your changes.
