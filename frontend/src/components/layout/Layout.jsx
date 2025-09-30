import "react"

import { Outlet,Link,Navigate } from "react-router-dom"
import { SignedIn,SignedOut,UserButton } from "@clerk/clerk-react"


function Layout(){

    return (
        <div className="app-layout">

            <header className="app-header">
                <div className="header-content">
                    <Link to="/" style={{ textDecoration: 'none' }}><h1>TrapSense AI</h1></Link>
                    <nav>
                        <SignedIn>
                            <Link to="/">Home</Link>
                            <UserButton/>
                        </SignedIn>
                    </nav>
                </div>
            </header>

            <main className="app-main">
                <SignedOut>
                    <Navigate to="/sign-in" replace={true}/>
                </SignedOut>
                <SignedIn>
                    <Outlet/>
                </SignedIn>
                
            </main>
        </div>
    )
}

export default Layout;