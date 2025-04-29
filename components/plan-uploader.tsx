"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileJson, FileText, AlertCircle } from "lucide-react"
import { PlanVisualizer } from "@/components/plan-visualizer"
import { parseTerraformPlan } from "@/lib/terraform-parser"
import type { ParsedPlan } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const samplePlan = {
  format_version: "1.0",
  terraform_version: "1.0.0",
  resource_changes: [
    {
      address: "aws_s3_bucket.example",
      type: "aws_s3_bucket",
      name: "example",
      change: {
        actions: ["create"],
        before: null,
        after: {
          bucket: "my-example-bucket",
          acl: "private",
          versioning: {
            enabled: true,
          },
          tags: {
            Environment: "Production",
            Name: "Example Bucket",
          },
        },
      },
      depends_on: ["aws_iam_role.example"],
    },
    {
      address: "aws_iam_role.example",
      type: "aws_iam_role",
      name: "example",
      change: {
        actions: ["create"],
        before: null,
        after: {
          name: "example-role",
          assume_role_policy:
            '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"s3.amazonaws.com"},"Action":"sts:AssumeRole"}]}',
        },
      },
    },
    {
      address: "aws_rds_cluster.example",
      type: "aws_rds_cluster",
      name: "example",
      change: {
        actions: ["update"],
        before: {
          cluster_identifier: "example-cluster",
          engine: "aurora",
          engine_version: "5.6.10a",
          master_username: "admin",
          backup_retention_period: 5,
          preferred_backup_window: "07:00-09:00",
          skip_final_snapshot: false,
        },
        after: {
          cluster_identifier: "example-cluster",
          engine: "aurora",
          engine_version: "5.7.12",
          master_username: "admin",
          backup_retention_period: 7,
          preferred_backup_window: "06:00-08:00",
          skip_final_snapshot: false,
        },
      },
      depends_on: ["aws_iam_role.example"],
    },
    {
      address: "aws_db_instance.production",
      type: "aws_db_instance",
      name: "production",
      change: {
        actions: ["delete"],
        before: {
          identifier: "production-db",
          engine: "mysql",
          engine_version: "5.7",
          instance_class: "db.t3.medium",
          allocated_storage: 20,
          storage_type: "gp2",
          multi_az: true,
          skip_final_snapshot: false,
        },
        after: null,
      },
    },
    {
      address: "aws_lambda_function.example",
      type: "aws_lambda_function",
      name: "example",
      change: {
        actions: ["update"],
        before: {
          function_name: "example-function",
          handler: "index.handler",
          runtime: "nodejs12.x",
          memory_size: 128,
          timeout: 3,
          environment: {
            variables: {
              API_ENDPOINT: "https://api.example.com/v1",
            },
          },
        },
        after: {
          function_name: "example-function",
          handler: "index.handler",
          runtime: "nodejs14.x",
          memory_size: 256,
          timeout: 10,
          environment: {
            variables: {
              API_ENDPOINT: "https://api.example.com/v2",
              DEBUG: "true",
            },
          },
        },
      },
    },
  ],
}

// Sample Terraform plan text output
const samplePlanText = `
Terraform will perform the following actions:

  # aws_s3_bucket.example will be created
  + resource "aws_s3_bucket" "example" {
      + bucket = "my-example-bucket"
      + acl    = "private"
      
      + versioning {
          + enabled = true
        }
        
      + tags = {
          + "Environment" = "Production"
          + "Name"        = "Example Bucket"
        }
    }

  # aws_iam_role.example will be created
  + resource "aws_iam_role" "example" {
      + name               = "example-role"
      + assume_role_policy = jsonencode({
          Version = "2012-10-17"
          Statement = [
            {
              Effect    = "Allow"
              Principal = { Service = "s3.amazonaws.com" }
              Action    = "sts:AssumeRole"
            }
          ]
        })
    }

  # aws_rds_cluster.example will be updated in-place
  ~ resource "aws_rds_cluster" "example" {
      ~ engine_version           = "5.6.10a" -> "5.7.12"
      ~ backup_retention_period  = 5 -> 7
      ~ preferred_backup_window  = "07:00-09:00" -> "06:00-08:00"
        cluster_identifier       = "example-cluster"
        engine                   = "aurora"
        master_username          = "admin"
        skip_final_snapshot      = false
    }

  # aws_db_instance.production will be destroyed
  - resource "aws_db_instance" "production" {
      - identifier          = "production-db"
      - engine              = "mysql"
      - engine_version      = "5.7"
      - instance_class      = "db.t3.medium"
      - allocated_storage   = 20
      - storage_type        = "gp2"
      - multi_az            = true
      - skip_final_snapshot = false
    }

Plan: 2 to add, 1 to change, 1 to destroy.
`

export function PlanUploader() {
  const [planInput, setPlanInput] = useState("")
  const [jsonInput, setJsonInput] = useState("")
  const [parsedPlan, setParsedPlan] = useState<ParsedPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsingWarning, setParsingWarning] = useState<string | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)
    setParsingWarning(null)

    try {
      const text = await file.text()

      if (file.name.endsWith(".json")) {
        setJsonInput(text)
        handleJsonParse(text)
      } else {
        setPlanInput(text)
        handleTextParse(text)
      }
    } catch (err) {
      setError("Failed to read the file. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTextParse = (text: string) => {
    try {
      setParsingWarning(null)
      const result = parseTerraformPlan(text, "text")

      if (result.resourceChanges.length === 0) {
        setParsingWarning(
          "No resources were found in the plan. The format might not be supported or the plan might be empty.",
        )
      } else if (result.resourceChanges.some((r) => !r.changeDetails)) {
        setParsingWarning(
          "Some resources were parsed without detailed change information. The visualization might be incomplete.",
        )
      }

      setParsedPlan(result)
      setError(null)
    } catch (err) {
      setError("Failed to parse the plan. Please check the format and try again.")
      console.error(err)
    }
  }

  const handleJsonParse = (json: string) => {
    try {
      setParsingWarning(null)
      const result = parseTerraformPlan(json, "json")

      if (result.resourceChanges.length === 0) {
        setParsingWarning(
          "No resources were found in the plan. The format might not be supported or the plan might be empty.",
        )
      } else if (result.resourceChanges.some((r) => !r.changeDetails)) {
        setParsingWarning(
          "Some resources were parsed without detailed change information. The visualization might be incomplete.",
        )
      }

      setParsedPlan(result)
      setError(null)
    } catch (err) {
      setError("Failed to parse the JSON plan. Please check the format and try again.")
      console.error(err)
    }
  }

  const handleVisualize = (type: "text" | "json") => {
    setIsLoading(true)
    setError(null)
    setParsingWarning(null)

    try {
      if (type === "text" && planInput) {
        handleTextParse(planInput)
      } else if (type === "json" && jsonInput) {
        handleJsonParse(jsonInput)
      } else {
        setError("Please provide input before visualizing.")
      }
    } catch (err) {
      setError("An error occurred during visualization. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setPlanInput("")
    setJsonInput("")
    setParsedPlan(null)
    setError(null)
    setParsingWarning(null)
  }

  if (parsedPlan) {
    return (
      <div>
        {parsingWarning && (
          <Alert variant="warning" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>{parsingWarning}</AlertDescription>
          </Alert>
        )}
        <PlanVisualizer plan={parsedPlan} />
        <div className="mt-6">
          <Button variant="outline" onClick={handleReset}>
            Upload Another Plan
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="text">
            <FileText className="h-4 w-4 mr-2" />
            Raw Text
          </TabsTrigger>
          <TabsTrigger value="json">
            <FileJson className="h-4 w-4 mr-2" />
            JSON Format
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your Terraform plan output here..."
              className="min-h-[300px] font-mono text-sm"
              value={planInput}
              onChange={(e) => setPlanInput(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => handleVisualize("text")} disabled={!planInput || isLoading} className="flex-1">
                Visualize Plan
              </Button>
              <div className="relative flex-1">
                <input
                  type="file"
                  id="text-file-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  accept=".txt,.log,.tf"
                />
                <Button variant="outline" className="w-full flex items-center justify-center" disabled={isLoading}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Plan File
                </Button>
              </div>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPlanInput(samplePlanText)
                }}
              >
                Load Sample Plan
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="json">
          <div className="space-y-4">
            <Textarea
              placeholder="Paste your Terraform plan JSON here..."
              className="min-h-[300px] font-mono text-sm"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => handleVisualize("json")} disabled={!jsonInput || isLoading} className="flex-1">
                Visualize Plan
              </Button>
              <div className="relative flex-1">
                <input
                  type="file"
                  id="json-file-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  accept=".json"
                />
                <Button variant="outline" className="w-full flex items-center justify-center" disabled={isLoading}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload JSON File
                </Button>
              </div>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setJsonInput(JSON.stringify(samplePlan, null, 2))
                }}
              >
                Load Sample Plan
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {error && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">{error}</div>}
    </div>
  )
}
