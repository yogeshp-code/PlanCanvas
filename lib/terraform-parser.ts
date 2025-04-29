import type { ParsedPlan, ResourceChange } from "./types"
// Import the library correctly
import terraformPlanParser from "terraform-plan-parser"

export function parseTerraformPlan(input: string, format: "json" | "text"): ParsedPlan {
  try {
    // For JSON format, use the terraform-plan-parser library
    if (format === "json") {
      return parseTerraformPlanJson(input)
    } else {
      // For text format, first check if it's actually JSON
      if (input.trim().startsWith("{")) {
        try {
          return parseTerraformPlanJson(input)
        } catch (e) {
          // Not valid JSON, continue with text parsing
        }
      }
      return parseTerraformPlanText(input)
    }
  } catch (error) {
    console.error("Error parsing Terraform plan:", error)
    throw new Error(`Failed to parse Terraform plan: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function parseTerraformPlanJson(jsonInput: string): ParsedPlan {
  try {
    // Parse the JSON
    const planJson = JSON.parse(jsonInput)

    // Try using terraform-plan-parser library first
    try {
      const parsedPlan = terraformPlanParser(planJson)

      // Convert to our internal format
      const resourceChanges: ResourceChange[] = parsedPlan.changedResources.map((resource) => {
        // Determine the action
        let action: "create" | "update" | "delete"
        if (resource.action === "create") {
          action = "create"
        } else if (resource.action === "update") {
          action = "update"
        } else if (resource.action === "delete") {
          action = "delete"
        } else {
          action = "update" // Default fallback
        }

        return {
          address: resource.address,
          type: resource.type,
          name: extractResourceName(resource.address),
          action,
          changeDetails: {
            before: resource.before || null,
            after: resource.after || null,
            actions: [action],
          },
          dependencies: resource.dependencies || [],
        }
      })

      // Calculate summary
      const summary = {
        create: resourceChanges.filter((r) => r.action === "create").length,
        update: resourceChanges.filter((r) => r.action === "update").length,
        delete: resourceChanges.filter((r) => r.action === "delete").length,
      }

      return {
        resourceChanges,
        summary,
      }
    } catch (e) {
      // If terraform-plan-parser fails, fall back to our custom parser
      console.warn("terraform-plan-parser failed, falling back to custom parser", e)
      return parseWithCustomJsonParser(planJson)
    }
  } catch (error) {
    console.error("Error parsing Terraform JSON plan:", error)
    throw new Error("Failed to parse Terraform JSON plan. Please check the format.")
  }
}

function parseWithCustomJsonParser(planJson: any): ParsedPlan {
  const resourceChanges: ResourceChange[] = []

  // Handle Terraform 0.12+ JSON format with resource_changes
  if (planJson.resource_changes) {
    planJson.resource_changes.forEach((change: any) => {
      if (!change.change || !change.change.actions || change.change.actions.length === 0) {
        return // Skip resources with no actions
      }

      // Determine the primary action
      let action: "create" | "update" | "delete"
      if (change.change.actions.includes("create")) {
        action = "create"
      } else if (change.change.actions.includes("delete")) {
        action = "delete"
      } else if (change.change.actions.includes("update")) {
        action = "update"
      } else {
        return // Skip if no recognized action
      }

      // Clean up the address (remove "will be created" etc.)
      const address = change.address.replace(/\s+will be\s+(created|updated|deleted).*$/i, "")

      resourceChanges.push({
        address,
        type: change.type,
        name: extractResourceName(address),
        action,
        changeDetails: {
          before: change.change.before,
          after: change.change.after,
          actions: change.change.actions,
        },
        dependencies: change.depends_on || [],
      })
    })
  }
  // Handle OpenTofu/Terraform 0.11 format
  else if (planJson.planned_values && planJson.prior_state) {
    const plannedResources = extractResourcesFromModule(planJson.planned_values.root_module)
    const priorResources = extractResourcesFromModule(planJson.prior_state.values?.root_module)

    // Process all resources from both planned and prior state
    const allResourceAddresses = new Set([
      ...plannedResources.map((r) => r.address),
      ...priorResources.map((r) => r.address),
    ])

    allResourceAddresses.forEach((address) => {
      const plannedResource = plannedResources.find((r) => r.address === address)
      const priorResource = priorResources.find((r) => r.address === address)

      let action: "create" | "update" | "delete"
      let changeDetails: any = {}

      if (plannedResource && !priorResource) {
        action = "create"
        changeDetails = {
          before: null,
          after: plannedResource.values,
          actions: ["create"],
        }
      } else if (!plannedResource && priorResource) {
        action = "delete"
        changeDetails = {
          before: priorResource.values,
          after: null,
          actions: ["delete"],
        }
      } else if (plannedResource && priorResource) {
        action = "update"
        changeDetails = {
          before: priorResource.values,
          after: plannedResource.values,
          actions: ["update"],
        }
      } else {
        return // Skip if neither exists (shouldn't happen)
      }

      const resource = plannedResource || priorResource

      // Clean up the address
      const cleanAddress = address.replace(/\s+will be\s+(created|updated|deleted).*$/i, "")

      resourceChanges.push({
        address: cleanAddress,
        type: resource.type || extractResourceType(cleanAddress),
        name: extractResourceName(cleanAddress),
        action,
        changeDetails,
        dependencies: resource.dependencies || [],
      })
    })
  }

  // If we couldn't parse using known formats, try a generic approach
  if (resourceChanges.length === 0) {
    findResourcesInJson(planJson, resourceChanges)
  }

  // Calculate summary
  const summary = {
    create: resourceChanges.filter((r) => r.action === "create").length,
    update: resourceChanges.filter((r) => r.action === "update").length,
    delete: resourceChanges.filter((r) => r.action === "delete").length,
  }

  return {
    resourceChanges,
    summary,
  }
}

function parseTerraformPlanText(textInput: string): ParsedPlan {
  const resourceChanges: ResourceChange[] = []
  const lines = textInput.split("\n")

  // Regular expressions for matching different parts of the plan
  const planStartRegex = /Terraform will perform the following actions:/i
  const resourceRegex = /^\s*#\s*(.*?)\s+will be\s+(created|updated|deleted|destroyed)/i
  const resourceDefRegex = /^\s*[+~-]\s+resource\s+"([^"]+)"\s+"([^"]+)"\s*{/i
  const dependencyRegex = /^\s*#\s+depends on:\s*$/i
  const dependencyItemRegex = /^\s*#\s+-\s+(.*)/i
  const attributeRegex = /^\s*([+~-])?\s*(\w+)\s*=\s*(.*)/i

  let inPlanSection = false
  let currentResource: ResourceChange | null = null
  let collectingDependencies = false
  let dependencies: string[] = []
  let beforeAttributes: Record<string, any> = {}
  let afterAttributes: Record<string, any> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines
    if (!line) continue

    // Check if we're in the plan section
    if (planStartRegex.test(line)) {
      inPlanSection = true
      continue
    }

    if (!inPlanSection) continue

    // Check for resource address line (# aws_s3_bucket.example will be created)
    const resourceMatch = line.match(resourceRegex)
    if (resourceMatch) {
      // Save previous resource if exists
      if (currentResource) {
        finalizeCurrentResource()
      }

      const address = resourceMatch[1].trim()
      const action = determineAction(resourceMatch[2])

      currentResource = {
        address,
        type: extractResourceType(address),
        name: extractResourceName(address),
        action,
      }

      collectingDependencies = false
      dependencies = []
      beforeAttributes = {}
      afterAttributes = {}
      continue
    }

    // Check for resource definition line (+ resource "aws_s3_bucket" "example" {)
    const resourceDefMatch = line.match(resourceDefRegex)
    if (resourceDefMatch && !currentResource) {
      const type = resourceDefMatch[1]
      const name = resourceDefMatch[2]
      const address = `${type}.${name}`

      let action: "create" | "update" | "delete"
      if (line.startsWith("+")) {
        action = "create"
      } else if (line.startsWith("-")) {
        action = "delete"
      } else {
        action = "update"
      }

      currentResource = {
        address,
        type,
        name,
        action,
      }

      collectingDependencies = false
      dependencies = []
      beforeAttributes = {}
      afterAttributes = {}
      continue
    }

    // Check for dependencies section
    if (currentResource && line.match(dependencyRegex)) {
      collectingDependencies = true
      continue
    }

    // Collect dependency items
    if (collectingDependencies) {
      const depMatch = line.match(dependencyItemRegex)
      if (depMatch) {
        dependencies.push(depMatch[1])
      } else if (line === "") {
        collectingDependencies = false
      }
      continue
    }

    // Parse attribute changes
    if (currentResource) {
      const attrMatch = line.match(attributeRegex)
      if (attrMatch) {
        const prefix = attrMatch[1] || ""
        const attrName = attrMatch[2]
        let attrValue = attrMatch[3].trim()

        // Try to parse the value
        try {
          // Remove trailing comma if present
          if (attrValue.endsWith(",")) {
            attrValue = attrValue.slice(0, -1)
          }

          // Handle special cases
          if (attrValue === "null") {
            attrValue = null
          } else if (attrValue === "true") {
            attrValue = true
          } else if (attrValue === "false") {
            attrValue = false
          } else if (!isNaN(Number(attrValue))) {
            attrValue = Number(attrValue)
          } else if (attrValue.startsWith('"') && attrValue.endsWith('"')) {
            attrValue = attrValue.slice(1, -1)
          }
        } catch (e) {
          // Keep as string if parsing fails
        }

        if (prefix === "-") {
          beforeAttributes[attrName] = attrValue
        } else if (prefix === "+") {
          afterAttributes[attrName] = attrValue
        } else {
          // Unchanged attribute
          beforeAttributes[attrName] = attrValue
          afterAttributes[attrName] = attrValue
        }
      }
    }
  }

  // Add the last resource
  if (currentResource) {
    finalizeCurrentResource()
  }

  // Helper function to finalize the current resource
  function finalizeCurrentResource() {
    if (!currentResource) return

    if (dependencies.length > 0) {
      currentResource.dependencies = [...dependencies]
    }

    if (Object.keys(beforeAttributes).length > 0 || Object.keys(afterAttributes).length > 0) {
      currentResource.changeDetails = {
        before: beforeAttributes,
        after: afterAttributes,
        actions: [currentResource.action],
      }
    }

    resourceChanges.push(currentResource)
  }

  // Calculate summary
  const summary = {
    create: resourceChanges.filter((r) => r.action === "create").length,
    update: resourceChanges.filter((r) => r.action === "update").length,
    delete: resourceChanges.filter((r) => r.action === "delete").length,
  }

  return {
    resourceChanges,
    summary,
  }
}

// Helper functions
function determineAction(actionText: string): "create" | "update" | "delete" {
  const text = actionText.toLowerCase()
  if (text.includes("creat")) return "create"
  if (text.includes("updat")) return "update"
  if (text.includes("delet") || text.includes("destroy")) return "delete"
  return "update" // Default fallback
}

function extractResourceType(address: string): string {
  // Extract the resource type from the address
  // Format is usually: resource_type.resource_name[index]

  // First check if it's a module resource
  if (address.startsWith("module.")) {
    // For module resources, find the resource type after the module path
    const moduleMatch = address.match(/module\.[^.]+\.([^.]+)\.([^.]+)/)
    if (moduleMatch) {
      return moduleMatch[1] // Return the resource type
    }
  }

  // Standard resource format
  const parts = address.split(".")
  if (parts.length < 2) return address

  return parts[0]
}

function extractResourceName(address: string): string {
  // Extract the resource name from the address

  // First check if it's a module resource
  if (address.startsWith("module.")) {
    // For module resources, extract the name after the module path and resource type
    const moduleMatch = address.match(/module\.[^.]+\.([^.]+)\.([^.]+)/)
    if (moduleMatch) {
      return moduleMatch[2] // Return the resource name
    }
  }

  // Standard resource format: resource_type.resource_name
  const parts = address.split(".")
  if (parts.length < 2) return address

  let name = parts.slice(1).join(".")

  // Handle array indices
  const indexMatch = name.match(/^(.+)\[.+\]$/)
  if (indexMatch) {
    name = indexMatch[1]
  }

  return name
}

function extractResourcesFromModule(module: any): any[] {
  if (!module) return []

  let resources: any[] = []

  // Add resources from the current module
  if (module.resources) {
    resources = [...module.resources]
  }

  // Add resources from child modules
  if (module.child_modules) {
    module.child_modules.forEach((childModule: any) => {
      resources = [...resources, ...extractResourcesFromModule(childModule)]
    })
  }

  return resources
}

function findResourcesInJson(json: any, resourceChanges: ResourceChange[], path = ""): void {
  if (!json || typeof json !== "object") return

  // Check if this object looks like a resource
  if (json.address && (json.type || json.resource_type) && (json.change || json.action || json.actions)) {
    const type = json.type || json.resource_type
    const address = json.address.replace(/\s+will be\s+(created|updated|deleted).*$/i, "")

    // Determine the action
    let action: "create" | "update" | "delete" | null = null

    if (json.action) {
      if (typeof json.action === "string") {
        const actionStr = json.action.toLowerCase()
        if (actionStr.includes("creat")) action = "create"
        else if (actionStr.includes("updat")) action = "update"
        else if (actionStr.includes("delet") || actionStr.includes("destroy")) action = "delete"
      }
    } else if (json.change && json.change.actions) {
      if (json.change.actions.includes("create")) action = "create"
      else if (json.change.actions.includes("update")) action = "update"
      else if (json.change.actions.includes("delete")) action = "delete"
    } else if (json.actions) {
      if (json.actions.includes("create")) action = "create"
      else if (json.actions.includes("update")) action = "update"
      else if (json.actions.includes("delete")) action = "delete"
    } else if (json.change) {
      if (json.change.before === null && json.change.after !== null) action = "create"
      else if (json.change.before !== null && json.change.after === null) action = "delete"
      else if (json.change.before !== null && json.change.after !== null) action = "update"
    }

    if (action) {
      resourceChanges.push({
        address,
        type,
        name: extractResourceName(address),
        action,
        changeDetails: json.change || {
          before: json.before || null,
          after: json.after || null,
          actions: [action],
        },
        dependencies: json.depends_on || json.dependencies || [],
      })
    }
    return
  }

  // Recursively search through the object
  if (Array.isArray(json)) {
    json.forEach((item, index) => {
      findResourcesInJson(item, resourceChanges, `${path}[${index}]`)
    })
  } else {
    Object.entries(json).forEach(([key, value]) => {
      findResourcesInJson(value, resourceChanges, path ? `${path}.${key}` : key)
    })
  }
}
