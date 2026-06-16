import { useAuth } from "#/contexts/auth-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import { useGetUsers, useGetVenues, useUpdateUser } from "#/features/admin/hooks/query"
import { LinkVenueDialog } from "#/features/admin/components/link-venue-dialog"
import type { UserResponse, UserRole } from "@pub-hopper/schemas"
import { toast } from "sonner"

const ROLES: UserRole[] = ["user", "partner", "admin"]

function UserRow({ user, isSelf }: { user: UserResponse; isSelf: boolean }) {
  const updateUser = useUpdateUser(user.id)

  const handleRoleChange = (role: UserRole) => {
    updateUser.mutate(
      { role },
      {
        onSuccess: () => toast.success(`Role updated to ${role}`),
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : "Failed to update role"
          ),
      }
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{user.name}</p>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={user.role}
          onValueChange={(value) => handleRoleChange(value as UserRole)}
          disabled={isSelf || updateUser.isPending}
        >
          <SelectTrigger className="w-32" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <LinkVenueDialog user={user} />
      </div>
    </div>
  )
}

function UsersTable() {
  const users = useGetUsers()
  // Warm the venues cache so the link dialog's selector resolves without suspending.
  useGetVenues()
  const auth = useAuth()
  const currentUserId = auth?.user.id

  return (
    <div className="flex flex-col">
      {users.data.map((user) => (
        <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
      ))}
    </div>
  )
}

export { UsersTable }
