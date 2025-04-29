"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Search, Plus, Pencil, Trash2 } from "lucide-react"
import type { ParsedPlan } from "@/lib/types"
import { ResourceCard } from "@/components/resource-card"
import { ResourceSummary } from "@/components/resource-summary"
import { ResourceGraph } from "@/components/resource-graph"
import { DetailedResourceView } from "@/components/detailed-resource-view"

interface PlanVisualizerProps {
  plan: ParsedPlan
}

export function PlanVisualizer({ plan }: PlanVisualizerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"card" | "detailed">("card")

  const resourceTypes = useMemo(() => {
    const types = new Set<string>()
    plan.resourceChanges.forEach((resource) => {
      types.add(resource.type)
    })
    return Array.from(types).sort()
  }, [plan])

  const filteredResources = useMemo(() => {
    return plan.resourceChanges.filter((resource) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        resource.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.type.toLowerCase().includes(searchQuery.toLowerCase())

      // Resource type filter
      const matchesType = resourceTypeFilter === "all" || resource.type === resourceTypeFilter

      // Action filter
      const matchesAction = actionFilter === "all" || resource.action === actionFilter

      return matchesSearch && matchesType && matchesAction
    })
  }, [plan.resourceChanges, searchQuery, resourceTypeFilter, actionFilter])

  const createResources = useMemo(() => filteredResources.filter((r) => r.action === "create"), [filteredResources])

  const updateResources = useMemo(() => filteredResources.filter((r) => r.action === "update"), [filteredResources])

  const deleteResources = useMemo(() => filteredResources.filter((r) => r.action === "delete"), [filteredResources])

  const highRiskResources = useMemo(() => {
    return filteredResources.filter((resource) => {
      // Check for high-risk actions
      if (resource.action === "delete") {
        // Database deletions
        if (
          resource.type.includes("aws_db_instance") ||
          resource.type.includes("aws_rds") ||
          resource.type.includes("database")
        ) {
          return true
        }

        // Production environment resources
        if (resource.address.toLowerCase().includes("prod") || resource.address.toLowerCase().includes("production")) {
          return true
        }
      }

      return false
    })
  }, [filteredResources])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Infrastructure Plan Visualization</CardTitle>
          <CardDescription>
            Visualizing {plan.resourceChanges.length} resources with{" "}
            <Badge variant="outline" className="bg-green-50 text-green-700 mr-1">
              {plan.summary.create} creates
            </Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 mr-1">
              {plan.summary.update} updates
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700">
              {plan.summary.delete} deletes
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {highRiskResources.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">High-Risk Changes Detected</h4>
                <p className="text-red-700 text-sm mt-1">
                  This plan includes {highRiskResources.length} high-risk changes that may affect production or critical
                  data.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search resources..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resource Types</SelectItem>
                {resourceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="resources">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="graph">Dependency Graph</TabsTrigger>
            </TabsList>

            <TabsContent value="resources">
              <div className="mb-4">
                <div className="flex justify-end">
                  <Select value={viewMode} onValueChange={setViewMode}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="View Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card View</SelectItem>
                      <SelectItem value="detailed">Detailed View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-6">
                {createResources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium flex items-center text-green-700 mb-3">
                      <Plus className="h-5 w-5 mr-2" />
                      Resources to Create ({createResources.length})
                    </h3>
                    {viewMode === "card" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {createResources.map((resource) => (
                          <ResourceCard key={resource.address} resource={resource} actionType="create" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {createResources.map((resource) => (
                          <DetailedResourceView key={resource.address} resource={resource} actionType="create" />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {updateResources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium flex items-center text-yellow-700 mb-3">
                      <Pencil className="h-5 w-5 mr-2" />
                      Resources to Update ({updateResources.length})
                    </h3>
                    {viewMode === "card" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {updateResources.map((resource) => (
                          <ResourceCard key={resource.address} resource={resource} actionType="update" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {updateResources.map((resource) => (
                          <DetailedResourceView key={resource.address} resource={resource} actionType="update" />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {deleteResources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium flex items-center text-red-700 mb-3">
                      <Trash2 className="h-5 w-5 mr-2" />
                      Resources to Delete ({deleteResources.length})
                    </h3>
                    {viewMode === "card" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {deleteResources.map((resource) => (
                          <ResourceCard key={resource.address} resource={resource} actionType="delete" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {deleteResources.map((resource) => (
                          <DetailedResourceView key={resource.address} resource={resource} actionType="delete" />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {filteredResources.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No resources match your current filters.</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="summary">
              <ResourceSummary plan={plan} />
            </TabsContent>

            <TabsContent value="graph">
              <ResourceGraph plan={plan} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
