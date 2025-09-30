import './App.css'
import Home from './pages/Home'
import {BrowserRouter as Routes,Route} from 'react-router-dom'
import ClerkProviderPage from './auth/ClerkProviderPage'
import AuthenticationPage from './auth/AuthenticationPage'
import Layout from './components/layout/Layout'


function App() {
  

  return (
    <ClerkProviderPage>
      
        <Routes>
          <Route path='/sign-in/*' element={<AuthenticationPage/>}/>
          <Route path='/sign-up' element={<AuthenticationPage/>}/>
          <Route element={<Layout/>}>
            <Route path='/' element={<Home/>}/>
          </Route>
        </Routes>
      
    </ClerkProviderPage>
    
  )
}

export default App
