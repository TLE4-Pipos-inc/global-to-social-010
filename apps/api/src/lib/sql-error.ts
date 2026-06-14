
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

export function isSqliteError(error: unknown): error is Error {
  return error instanceof Error
}

export function isUniqueRouteStopError(error: unknown): boolean {
  return (
    isSqliteError(error) &&
    error.message.includes("UNIQUE constraint failed") &&
    (error.message.includes("route_stops.route_id, route_stops.route_order") ||
      error.message.includes("route_stops.route_id, route_stops.venue_id"))
  )
}

export function isUniquePartnerUserError(error: unknown): boolean {
  return (
    isSqliteError(error) &&
    error.message.includes("UNIQUE constraint failed") &&
    error.message.includes("partners.user_id")
  )
}
