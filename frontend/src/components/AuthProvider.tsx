import { useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

const INACTIVITY_TIMEOUT = 20 * 60 * 1000 // 20 minutes in milliseconds

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, loading, user } = useAuthStore()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLoading(true)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()

            // Set user in store
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: userData.displayName || null,
              tenantId: userData.tenantId,
              role: userData.role,
              assignedFolders: userData.assignedFolders || [],
            })
          } else {
            // User document doesn't exist, sign out
            await auth.signOut()
            setUser(null)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setUser(null)
        }
      } else {
        // User is signed out
        setUser(null)
      }

      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [setUser, setLoading])

  // Auto-logout on inactivity
  useEffect(() => {
    if (!user) return

    const handleActivity = () => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        try {
          toast.info('You have been logged out due to inactivity')
          await auth.signOut()
        } catch (error) {
          console.error('Error during auto-logout:', error)
        }
      }, INACTIVITY_TIMEOUT)
    }

    // Events that indicate user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    // Initialize timeout
    handleActivity()

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity)
    })

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [user])

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return <>{children}</>
}
