import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, TreePine, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { canVolunteer, ROLE_LABELS } from "@/lib/constants";

const useLinks = (user) => [
  user && { to: "/dashboard", label: "Dashboard", id: "nav-link-dashboard" },
  canVolunteer(user) && { to: "/board", label: "Volunteer Board", id: "nav-link-volunteer" },
  { to: "/resources", label: "Local Resources", id: "nav-link-resources" },
  { to: "/businesses", label: "Businesses", id: "nav-link-businesses" },
  { to: "/safety", label: "Safety", id: "nav-link-safety" },
  user?.role === "admin" && { to: "/admin", label: "Admin", id: "nav-link-admin" },
].filter(Boolean);

const linkCls = ({ isActive }) =>
  `rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-[#1E3D2F] text-white" : "text-stone-700 hover:bg-stone-100"}`;

const UserMenu = ({ user, onLogout }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button data-testid="user-menu-btn" className="rounded-full ring-offset-2 focus:outline-none focus:ring-2 focus:ring-[#1E3D2F]">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.picture || undefined} />
          <AvatarFallback className="bg-[#D4A373] font-semibold text-white">{user.name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56 bg-white">
      <div className="px-2 py-1.5">
        <p className="text-sm font-semibold text-stone-900" data-testid="user-menu-name">{user.name}</p>
        <p className="text-xs text-stone-500">{ROLE_LABELS[user.role] || "Choose a role"}</p>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild><Link to="/profile" data-testid="user-menu-profile"><UserRound className="mr-2 h-4 w-4" />My profile</Link></DropdownMenuItem>
      <DropdownMenuItem onClick={onLogout} data-testid="logout-btn"><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = useLinks(user);
  const onLogout = async () => { await logout(); navigate("/"); };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#FAFAF7]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" data-testid="navbar-logo">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E3D2F] text-white"><TreePine className="h-5 w-5" /></span>
          <span className="leading-tight">
            <span className="block font-heading text-base font-bold text-stone-900">Parent Link</span>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#D96838]">The Village · Klamath County</span>
          </span>
        </Link>
        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {links.map((l) => <NavLink key={l.to} to={l.to} className={linkCls} data-testid={l.id}>{l.label}</NavLink>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <UserMenu user={user} onLogout={onLogout} />
            </>
          ) : user === false ? (
            <>
              <Link to="/login" data-testid="auth-open-btn" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 sm:block">Log in</Link>
              <Link to="/register" data-testid="nav-join-btn" className="rounded-lg bg-[#D96838] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#BE5527]">Join the Village</Link>
            </>
          ) : null}
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-stone-100 lg:hidden" data-testid="mobile-menu-btn" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#FAFAF7]">
              <nav className="mt-8 flex flex-col gap-2">
                {links.map((l) => <NavLink key={l.to} to={l.to} className={linkCls} data-testid={`mobile-${l.id}`}>{l.label}</NavLink>)}
                {user === false && <NavLink to="/login" className={linkCls} data-testid="mobile-login-link">Log in</NavLink>}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
