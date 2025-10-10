import "react";
import { SignIn, SignUp, SignedIn, SignedOut } from "@clerk/clerk-react";

function AuthenticationPage() {
  return (
    <div className="auth-container">
      <SignedOut>
        <SignIn path="/sign-in" routing="path" />
        <SignUp path="/sign-up" routing="path" />
      </SignedOut>
      <SignedIn>
        <div className="redirect-message">
          <p>You're signed in!</p>
        </div>
      </SignedIn>
    </div>
  );
}
export default AuthenticationPage;
