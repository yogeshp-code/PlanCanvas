"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from "lucide-react"
import type { ResourceChange } from "@/lib/types"
import { getResourceIcon } from "@/lib/resource-icons"

interface ResourceCardProps {
  resource: ResourceChange
  actionType: "create" | "update" | "delete"
}

export function ResourceCard({ resource, actionType }: ResourceCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isHighRisk =
    actionType === "delete" &&
    (resource.type.includes("aws_db_instance") ||
      resource.type.includes("aws_rds") ||
      resource.address.toLowerCase().includes("prod") ||
      resource.address.toLowerCase().includes("production"))

  const actionColors = {
    create: "bg-green-50 border-green-200",
    update: "bg-yellow-50 border-yellow-200",
    delete: "bg-red-50 border-red-200",
  }

  const actionIcons = {
    create: <Plus className="h-4 w-4 text-green-600" />,
    update: <Pencil className="h-4 w-4 text-yellow-600" />,
    delete: <Trash2 className="h-4 w-4 text-red-600" />,
  }

  const ResourceIcon = getResourceIcon(resource.type)

  return (
    <Card className={`${actionColors[actionType]} border`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="mr-2 p-1.5 bg-white rounded-md">
              <ResourceIcon className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-medium" title={resource.address}>
              {resource.name}
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={`
              ${actionType === "create" ? "bg-green-100 text-green-800" : ""}
              ${actionType === "update" ? "bg-yellow-100 text-yellow-800" : ""}
              ${actionType === "delete" ? "bg-red-100 text-red-800" : ""}
            `}
          >
            <span className="flex items-center">
              {actionIcons[actionType]}
              <span className="ml-1 capitalize">{actionType}</span>
            </span>
          </Badge>
        </div>
        <div className="text-xs text-gray-500 mt-1 truncate" title={resource.type}>
          {resource.type}
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {isHighRisk && (
          <div className="mb-3 p-2 bg-red-100 rounded-md flex items-center text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span>High-risk change detected!</span>
          </div>
        )}

        <div className="text-sm">
          <div className="truncate" title={resource.address}>
            <span className="font-medium">Address:</span> {resource.address}
          </div>

          {expanded && (
            <div className="mt-3 space-y-3">
              {resource.changeDetails && (
                <div>
                  <div className="font-medium mb-1">Change Details:</div>
                  {actionType === "update" && resource.changeDetails.before && resource.changeDetails.after ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium">Attribute Changes:</div>
                      {Object.keys(resource.changeDetails.after)
                        .map((key) => {
                          const beforeValue = resource.changeDetails.before[key]
                          const afterValue = resource.changeDetails.after[key]
                          const hasChanged = JSON.stringify(beforeValue) !== JSON.stringify(afterValue)

                          if (hasChanged) {
                            return (
                              <div key={key} className="bg-yellow-50 p-2 rounded-md">
                                <div className="font-medium text-xs">{key}</div>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div className="text-xs">
                                    <span className="text-gray-500">Before: </span>
                                    <span className="font-mono">{JSON.stringify(beforeValue)}</span>
                                  </div>
                                  <div className="text-xs">
                                    <span className="text-gray-500">After: </span>
                                    <span className="font-mono">{JSON.stringify(afterValue)}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        })
                        .filter(Boolean)}
                    </div>
                  ) : (
                    <pre className="text-xs bg-white p-2 rounded-md overflow-x-auto max-h-[200px] overflow-y-auto">
                      {JSON.stringify(resource.changeDetails, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {resource.dependencies && resource.dependencies.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Dependencies:</div>
                  <ul className="text-xs list-disc list-inside">
                    {resource.dependencies.map((dep, index) => (
                      <li key={index} className="truncate" title={dep}>
                        {dep}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full text-gray-600" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <span className="flex items-center">
              <ChevronUp className="h-4 w-4 mr-1" />
              Show Less
            </span>
          ) : (
            <span className="flex items-center">
              <ChevronDown className="h-4 w-4 mr-1" />
              Show More
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
