import type React from "react"
import type { TooltipProps } from "recharts"

export const ChartContainer = ({ children }: { children: React.ReactNode }) => {
  return <div className="rounded-md border bg-card text-card-foreground shadow-sm">{children}</div>
}

export const ChartBars = () => {
  return null
}

export const ChartTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border rounded-md shadow-md p-2">
        <p className="font-bold">{`${label}`}</p>
        {payload.map((item, index) => (
          <p key={index} className="text-gray-700">
            {`${item.name}: ${item.value}`}
          </p>
        ))}
      </div>
    )
  }

  return null
}
