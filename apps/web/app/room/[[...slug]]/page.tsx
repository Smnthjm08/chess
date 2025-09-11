"use client"

import { usePathname } from 'next/navigation'
import React from 'react'

const Page = () => {
const pathname = usePathname();

  return (
    <div>
      room page {pathname}
    </div>
  )
}

export default Page
