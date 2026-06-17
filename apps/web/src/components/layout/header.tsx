import { useHasRole, useIsAuthenticated } from "#/contexts/auth-context"
import { Link } from "@tanstack/react-router"
import { Button } from "#/components/ui/button"

function Header() {
  const isLoggedIn = useIsAuthenticated()
  const isAdmin = useHasRole(["admin"])
  const isPartner = useHasRole(["partner"])

  return (
    <header className="flex items-center gap-4 bg-highlight p-4">
      <Link to="/" aria-label="Home">
        <img src="/logo.png" alt="" className="h-10 w-auto" />
      </Link>
      {isAdmin && (
        <>
          <Button
            variant="link"
            render={<Link to="/interests" />}
            nativeButton={false}
          >
            Interests
          </Button>
          <Button
            variant="link"
            render={<Link to="/admin" />}
            nativeButton={false}
          >
            Admin
          </Button>
        </>
      )}
      {(isPartner || isAdmin) && (
        <Button
          variant="link"
          render={<Link to="/partner" />}
          nativeButton={false}
        >
          Partner Dashboard
        </Button>
      )}
      <div className="ml-auto justify-self-end">
        {isLoggedIn ? (
          <Button
            variant="link"
            render={<Link to="/account" />}
            nativeButton={false}
          >
            Account
          </Button>
        ) : (
          <Button
            variant="link"
            render={<Link to="/login" />}
            nativeButton={false}
          >
            Login
          </Button>
        )}
      </div>
    </header>
  )
}
export { Header }
