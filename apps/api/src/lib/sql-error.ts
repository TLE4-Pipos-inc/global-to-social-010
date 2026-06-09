
export function isUniqueEmailError(error: unknown): boolean {
  const e = error as Record<string, unknown> | null | undefined
  return (
    e?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    (e?.code === "SQLITE_CONSTRAINT" &&
      String(e?.message ?? "").includes("users.email"))
  )
}

export function isForeignKeyError(error: unknown): boolean {
  const e = error as Record<string, unknown> | null | undefined
  return (
    e?.code === "SQLITE_CONSTRAINT_FOREIGNKEY" ||
    (e?.code === "SQLITE_CONSTRAINT" &&
      String(e?.message ?? "")
        .toLowerCase()
        .includes("foreign key"))
  )
}