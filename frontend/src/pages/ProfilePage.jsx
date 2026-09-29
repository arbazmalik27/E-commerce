import AccountDashboardPage from './AccountDashboardPage'

/**
 * ProfilePage (Backward-Compatible Wrapper)
 * Routes /profile to the unified Account Center, defaulting to the Settings tab.
 */
function ProfilePage() {
  return <AccountDashboardPage defaultTab="settings" />
}

export default ProfilePage
