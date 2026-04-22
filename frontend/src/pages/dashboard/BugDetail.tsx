import React from 'react'
import { useParams } from 'react-router-dom'

export default function BugDetail() {
  const { id } = useParams()
  return (
    <div>
      <h2 className="text-2xl font-semibold">Bug {id}</h2>
      <p className="mt-4 text-sm text-gray-600">Full bug detail, screenshots, comments, and activity log.</p>
    </div>
  )
}
