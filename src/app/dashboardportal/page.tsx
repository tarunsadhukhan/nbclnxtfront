"use client"

// import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
// import { isAuthenticated } from "@/utils/auth"

export default function DashboardPage() {
  const router = useRouter()

  // useEffect(() => {
  //   if (!isAuthenticated()) {
  //     router.replace("/")
  //   }
  // }, [router])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">2024-2025</div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Total Sales</h3>
          <p className="text-2xl font-bold">₹45,231</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Total Orders</h3>
          <p className="text-2xl font-bold">124</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Active Projects</h3>
          <p className="text-2xl font-bold">8</p>
        </Card>
      </div>
    </div>
  )
}