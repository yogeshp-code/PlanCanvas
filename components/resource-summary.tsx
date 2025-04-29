"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ParsedPlan } from "@/lib/types"
import { getResourceIcon } from "@/lib/resource-icons"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface ResourceSummaryProps {
  plan: ParsedPlan
}

export function ResourceSummary({ plan }: ResourceSummaryProps) {
  const serviceGroups = useMemo(() => {
    const groups: Record<string, { create: number; update: number; delete: number }> = {}

    plan.resourceChanges.forEach((resource) => {
      // Extract service name from resource type
      let service: string

      if (!resource.type) {
        service = "Unknown"
      } else if (resource.type.startsWith("aws_")) {
        // For AWS resources: aws_s3_bucket -> S3
        const parts = resource.type.split("_")
        if (parts.length > 1) {
          service = parts[1]
        } else {
          service = parts[0]
        }
      } else if (resource.type.includes("_")) {
        // For other providers with underscores: google_compute_instance -> Compute
        const parts = resource.type.split("_")
        if (parts.length > 1) {
          service = parts[1]
        } else {
          service = parts[0]
        }
      } else {
        // For resources without underscores
        service = resource.type
      }

      // Capitalize service name
      service = service.charAt(0).toUpperCase() + service.slice(1)

      if (!groups[service]) {
        groups[service] = { create: 0, update: 0, delete: 0 }
      }

      groups[service][resource.action]++
    })

    return Object.entries(groups)
      .map(([service, counts]) => ({
        service,
        ...counts,
        total: counts.create + counts.update + counts.delete,
      }))
      .sort((a, b) => b.total - a.total)
  }, [plan])

  const chartData = useMemo(() => {
    return serviceGroups.map((group) => ({
      name: group.service,
      Create: group.create,
      Update: group.update,
      Delete: group.delete,
    }))
  }, [serviceGroups])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-700">{plan.summary.create}</div>
              <div className="text-sm text-green-600 mt-1">Resources to Create</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-700">{plan.summary.update}</div>
              <div className="text-sm text-yellow-600 mt-1">Resources to Update</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-red-700">{plan.summary.delete}</div>
              <div className="text-sm text-red-600 mt-1">Resources to Delete</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Changes by Service</h3>
          <div className="h-[300px] w-full">
            <ChartContainer>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="Create" fill="#22c55e" stackId="stack" />
                  <Bar dataKey="Update" fill="#eab308" stackId="stack" />
                  <Bar dataKey="Delete" fill="#ef4444" stackId="stack" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            {chartData.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-500">No service data available</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Detailed Service Breakdown</h3>
          <div className="space-y-4">
            {serviceGroups.map((group) => {
              const ResourceIcon = getResourceIcon(group.service.toLowerCase())

              return (
                <div key={group.service} className="p-4 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="p-2 bg-white rounded-md mr-3">
                        <ResourceIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{group.service}</div>
                        <div className="text-sm text-gray-500">{group.total} resources</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {group.create > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {group.create} create
                        </Badge>
                      )}
                      {group.update > 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          {group.update} update
                        </Badge>
                      )}
                      {group.delete > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          {group.delete} delete
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-2">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="resources">
                        <AccordionTrigger className="text-sm py-2">View Resources</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {plan.resourceChanges
                              .filter((r) => {
                                let serviceName = r.type.split("_")[0]
                                if (r.type.startsWith("aws_")) {
                                  serviceName = r.type.split("_")[1] || serviceName
                                }
                                serviceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
                                return serviceName === group.service
                              })
                              .map((resource) => (
                                <div
                                  key={resource.address}
                                  className={`
                                    p-2 rounded-md text-xs
                                    ${resource.action === "create" ? "bg-green-50 border border-green-100" : ""}
                                    ${resource.action === "update" ? "bg-yellow-50 border border-yellow-100" : ""}
                                    ${resource.action === "delete" ? "bg-red-50 border border-red-100" : ""}
                                  `}
                                >
                                  <div className="font-medium">{resource.name}</div>
                                  <div className="text-gray-500 mt-1">{resource.address}</div>
                                </div>
                              ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
