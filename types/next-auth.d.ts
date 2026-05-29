import 'next-auth'

declare module 'next-auth' {
  interface User {
    householdId?: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      householdId: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    householdId?: string
  }
}
