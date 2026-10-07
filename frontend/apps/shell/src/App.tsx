import { Route, Routes } from 'react-router'
import { Header } from './Header.tsx'
import { RemoteArea } from './RemoteArea.tsx'
import { SignIn } from './SignIn.tsx'

/** Shell owns the header, sign-in and top-level routing so navigation survives any remote failure. */
export function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/seller/*" element={<RemoteArea key="seller" name="seller" />} />
        <Route path="/admin/*" element={<RemoteArea key="admin" name="admin" />} />
        <Route path="/*" element={<RemoteArea key="storefront" name="storefront" />} />
      </Routes>
    </>
  )
}
