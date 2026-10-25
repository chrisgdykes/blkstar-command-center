import { redirect } from 'next/navigation'

// Device access route — /d/{token}
// For now, just redirect to the main dashboard
// Later: validate token, set device context, configure display mode
export default function DevicePage() {
  redirect('/')
}
