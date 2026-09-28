import { Outlet } from 'react-router-dom'
import { RouteProgress } from '../../shared/ui/RouteProgress'

export function RootLayout() {
  return (
    <>
      <RouteProgress />
      <Outlet />
    </>
  )
}
