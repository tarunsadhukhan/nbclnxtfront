// "use client"

// import { useEffect, useState } from 'react'
// import { useRouter, usePathname } from 'next/navigation'
// import { getUser } from '@/utils/auth'

// export default function ProtectedRoute({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   const router = useRouter()
//   const pathname = usePathname()
//   const [mounted, setMounted] = useState(false)

//   useEffect(() => {
//     setMounted(true)
    
//     // Skip auth check for login page
//     if (pathname === '/') {
//       return
//     }

//     const user = getUser()
//     if (!user) {
// //      router.replace('/')
//     }
//   }, [pathname, router])

//   // Don't render anything until after mount
//   if (!mounted) {
//     return null
//   }

//   // Always render children on login page
//   if (pathname === '/') {
//     return <>{children}</>
//   }

//   // Only render children if we're mounted and have a user
//   const user = getUser()
//   return user ? <>{children}</> : null
// }
