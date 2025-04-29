"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Plus, Pencil, Trash2 } from "lucide-react"
import type { ResourceChange } from "@/lib/types"
import { getResourceIcon } from "@/lib/resource-icons"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface DetailedResourceViewProps {
  resource: ResourceChange
  actionType: "create" | "update" | "delete"
}

export function DetailedResourceView({ resource, actionType }: DetailedResourceViewProps) {
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

  // Function to format JSON values for display
  const formatValue = (value: any): string => {
    if (value === null) return "null"
    if (value === undefined) return "undefined"
    if (typeof value === "object") return JSON.stringify(value, null, 2)
    return String(value)
  }

  // Function to determine if a value has changed
  const hasValueChanged = (before: any, after: any): boolean => {
    return JSON.stringify(before) !== JSON.stringify(after)
  }

  return (
    <Card className={`${actionColors[actionType]} border`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="mr-2 p-1.5 bg-white rounded-md">
              <ResourceIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">{resource.name}</CardTitle>
              <div className="text-xs text-gray-500 mt-1">{resource.type}</div>
            </div>
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
      </CardHeader>

      <CardContent>
        {isHighRisk && (
          <div className="mb-3 p-2 bg-red-100 rounded-md flex items-center text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 mr-1.5 flex-shrink-0" />
            <span>High-risk change detected!</span>
          </div>
        )}

        <div className="text-sm mb-4">
          <div className="font-medium mb-1">Resource Address:</div>
          <div className="bg-white p-2 rounded-md font-mono text-xs overflow-x-auto">{resource.address}</div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {actionType === "update" && resource.changeDetails?.before && resource.changeDetails?.after && (
            <AccordionItem value="changes">
              <AccordionTrigger className="text-sm font-medium">Attribute Changes</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 mt-2">
                  {Object.keys({ ...resource.changeDetails.before, ...resource.changeDetails.after }).map((key) => {
                    const beforeValue = resource.changeDetails?.before?.[key]
                    const afterValue = resource.changeDetails?.after?.[key]
                    const changed = hasValueChanged(beforeValue, afterValue)

                    return (
                      <div
                        key={key}
                        className={`p-2 rounded-md ${changed ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50"}`}
                      >
                        <div className="font-medium text-xs mb-1 flex items-center">
                          {key}
                          {changed && (
                            <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 text-[10px]">
                              Changed
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="text-xs">
                            <div className="text-gray-500 mb-1">Before:</div>
                            <pre className="bg-white p-1.5 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                              {formatValue(beforeValue)}
                            </pre>
                          </div>
                          <div className="text-xs">
                            <div className="text-gray-500 mb-1">After:</div>
                            <pre className="bg-white p-1.5 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                              {formatValue(afterValue)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {actionType === "create" && resource.changeDetails?.after && (
            <AccordionItem value="attributes">
              <AccordionTrigger className="text-sm font-medium">Resource Attributes</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 mt-2">
                  {Object.entries(resource.changeDetails.after).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-2 rounded-md">
                      <div className="font-medium text-xs mb-1">{key}</div>
                      <pre className="text-xs bg-white p-1.5 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                        {formatValue(value)}
                      </pre>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {actionType === "delete" && resource.changeDetails?.before && (
            <AccordionItem value="attributes">
              <AccordionTrigger className="text-sm font-medium">Resource Attributes</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 mt-2">
                  {Object.entries(resource.changeDetails.before).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-2 rounded-md">
                      <div className="font-medium text-xs mb-1">{key}</div>
                      <pre className="text-xs bg-white p-1.5 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
                        {formatValue(value)}
                      </pre>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {resource.dependencies && resource.dependencies.length > 0 && (
            <AccordionItem value="dependencies">
              <AccordionTrigger className="text-sm font-medium">Dependencies</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside text-xs space-y-1 mt-2">
                  {resource.dependencies.map((dep, index) => (
                    <li key={index} className="bg-white p-1.5 rounded-md">
                      {dep}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}

          {resource.changeDetails && (
            <AccordionItem value="raw">
              <AccordionTrigger className="text-sm font-medium">Raw Change Data</AccordionTrigger>
              <AccordionContent>
                <pre className="text-xs bg-white p-2 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto mt-2">
                  {JSON.stringify(resource.changeDetails, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  )
}
