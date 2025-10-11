import { Outlet, Link, Navigate, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { ExpandableTabs } from "../common/NavBar"; // adjust path
import { Home, Upload, BarChart } from "lucide-react";

function Layout() {
  const navigate = useNavigate();

  const tabs = [
    { title: "Home", icon: Home, path: "/" },
    { type: "separator" },
    { title: "Upload", icon: Upload, path: "/upload" },
    { type: "separator" },
    { title: "Dashboard", icon: BarChart, path: "/dashboard" },
  ];

  return (
    <div className="app-layout">
      <header className="app-header flex items-center justify-between p-4 border-b bg-background shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/" style={{ textDecoration: "none" }}>
            <h1 className="text-xl font-semibold">TrapSense AI</h1>
          </Link>
        </div>

        <SignedIn>
          <ExpandableTabs
            tabs={tabs}
            activeColor="text-primary"
            onChange={(index) => {
              const tab = tabs[index];
              if (tab?.path) navigate(tab.path);
            }}
          />
          <UserButton />
        </SignedIn>
      </header>

      <main className="app-main p-4">
        <SignedOut>
          <Navigate to="/sign-in" replace={true} />
        </SignedOut>
        <SignedIn>
          <Outlet />
        </SignedIn>
      </main>
    </div>
  );
}

export default Layout;
