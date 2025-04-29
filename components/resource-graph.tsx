"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { ParsedPlan } from "@/lib/types"
import { Network } from "vis-network"
import { DataSet } from "vis-data"

interface ResourceGraphProps {
  plan: ParsedPlan
}

export function ResourceGraph({ plan }: ResourceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !containerRef.current) return

    // Create nodes with better tooltips
    const nodes = new DataSet(
      plan.resourceChanges.map((resource) => {
        let color = "#e2e8f0" // Default gray

        if (resource.action === "create") {
          color = "#dcfce7" // Green
        } else if (resource.action === "update") {
          color = "#fef9c3" // Yellow
        } else if (resource.action === "delete") {
          color = "#fee2e2" // Red
        }

        // Create a detailed tooltip
        const dependenciesText =
          resource.dependencies && resource.dependencies.length > 0
            ? `\nDependencies:\n${resource.dependencies.join("\n")}`
            : ""

        const tooltip = `Type: ${resource.type}\nAddress: ${resource.address}\nAction: ${resource.action}${dependenciesText}`

        return {
          id: resource.address,
          label: `${resource.name}\n(${resource.type})`,
          title: tooltip,
          color: {
            background: color,
            border: "#94a3b8",
            highlight: {
              background: color,
              border: "#475569",
            },
            hover: {
              background: color,
              border: "#475569",
            },
          },
          font: {
            color: "#334155",
            multi: true,
            size: 12,
          },
          shape: "box",
          margin: 10,
          widthConstraint: {
            maximum: 200,
          },
        }
      }),
    )

    // Create edges with better labels and styling
    const edges = new DataSet()

    plan.resourceChanges.forEach((resource) => {
      if (resource.dependencies && resource.dependencies.length > 0) {
        resource.dependencies.forEach((dep) => {
          // Check if the dependency exists in our nodes
          const dependencyExists = plan.resourceChanges.some((r) => r.address === dep)

          if (dependencyExists) {
            edges.add({
              from: dep,
              to: resource.address,
              arrows: "to",
              label: "depends on",
              font: {
                size: 10,
                color: "#64748b",
                align: "middle",
                background: "white",
              },
              color: {
                color: "#94a3b8",
                highlight: "#475569",
                hover: "#475569",
              },
              smooth: {
                type: "cubicBezier",
                roundness: 0.5,
              },
              title: `${resource.address} depends on ${dep}`,
            })
          }
        })
      }
    })

    const data = { nodes, edges }
    const options = {
      nodes: {
        shape: "box",
        margin: 10,
        borderWidth: 1,
        shadow: true,
      },
      edges: {
        width: 1,
        selectionWidth: 2,
        smooth: {
          type: "cubicBezier",
          roundness: 0.5,
        },
        font: {
          size: 10,
          strokeWidth: 0,
          align: "middle",
        },
      },
      physics: {
        enabled: true,
        hierarchicalRepulsion: {
          centralGravity: 0.0,
          springLength: 150,
          springConstant: 0.01,
          nodeDistance: 150,
          damping: 0.09,
        },
        solver: "hierarchicalRepulsion",
      },
      layout: {
        hierarchical: {
          direction: "UD",
          sortMethod: "directed",
          levelSeparation: 150,
          nodeSpacing: 200,
          treeSpacing: 200,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        hoverConnectedEdges: true,
        selectConnectedEdges: true,
      },
    }

    const network = new Network(containerRef.current, data, options)

    // Add a legend to the graph
    const legendContainer = document.createElement("div")
    legendContainer.className = "vis-network-legend"
    legendContainer.style.position = "absolute"
    legendContainer.style.top = "10px"
    legendContainer.style.right = "10px"
    legendContainer.style.padding = "10px"
    legendContainer.style.backgroundColor = "white"
    legendContainer.style.border = "1px solid #ddd"
    legendContainer.style.borderRadius = "4px"
    legendContainer.style.fontSize = "12px"
    legendContainer.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"
    legendContainer.innerHTML = `
      <div style="margin-bottom: 5px; font-weight: bold;">Legend</div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div style="width: 12px; height: 12px; background-color: #dcfce7; border: 1px solid #94a3b8; margin-right: 5px;"></div>
        <span>Create</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div style="width: 12px; height: 12px; background-color: #fef9c3; border: 1px solid #94a3b8; margin-right: 5px;"></div>
        <span>Update</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div style="width: 12px; height: 12px; background-color: #fee2e2; border: 1px solid #94a3b8; margin-right: 5px;"></div>
        <span>Delete</span>
      </div>
      <div style="display: flex; align-items: center; margin-top: 5px;">
        <div style="width: 40px; height: 1px; background-color: #94a3b8; margin-right: 5px; position: relative;">
          <div style="position: absolute; right: -5px; top: -4px; width: 0; height: 0; border-left: 5px solid #94a3b8; border-top: 5px solid transparent; border-bottom: 5px solid transparent;"></div>
        </div>
        <span>Dependency</span>
      </div>
    `
    containerRef.current.appendChild(legendContainer)

    // Add event listeners
    network.on("stabilizationProgress", (params) => {
      const maxIterations = params.total
      const currentIteration = params.iterations
      const progress = Math.round((currentIteration / maxIterations) * 100)

      // You could update a progress bar here if needed
      if (progress === 100) {
        // Stabilization complete
        network.stopSimulation()
      }
    })

    network.on("stabilizationIterationsDone", () => {
      network.setOptions({ physics: { enabled: false } })
    })

    // Cleanup
    return () => {
      network.destroy()
      if (containerRef.current && containerRef.current.contains(legendContainer)) {
        containerRef.current.removeChild(legendContainer)
      }
    }
  }, [plan, isClient])

  if (!isClient) {
    return (
      <Card>
        <CardContent className="h-[500px] flex items-center justify-center">
          <div>Loading dependency graph...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div ref={containerRef} className="h-[500px] w-full" />
      </CardContent>
    </Card>
  )
}
