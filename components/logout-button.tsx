export function LogoutButton() {
  return (
    <form className="inline" action="/api/auth/logout" method="post">
      <button type="submit" className="button secondary">
        Log out
      </button>
    </form>
  );
}
