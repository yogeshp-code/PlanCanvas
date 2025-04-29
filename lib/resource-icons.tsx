import {
  Database,
  Server,
  HardDrive,
  Network,
  Lock,
  Globe,
  Cpu,
  Layers,
  Cloud,
  Box,
  FileText,
  Workflow,
  ShieldAlert,
  Users,
  Gauge,
  Cog,
  BarChart,
  Mail,
  Webhook,
  type LucideIcon,
} from "lucide-react"

export function getResourceIcon(resourceType: string): LucideIcon {
  const type = resourceType.toLowerCase()

  // Database resources
  if (
    type.includes("db") ||
    type.includes("rds") ||
    type.includes("database") ||
    type.includes("dynamo") ||
    type.includes("redis") ||
    type.includes("aurora")
  ) {
    return Database
  }

  // Compute resources
  if (
    type.includes("ec2") ||
    type.includes("instance") ||
    type.includes("compute") ||
    type.includes("vm") ||
    type.includes("server")
  ) {
    return Server
  }

  // Storage resources
  if (
    type.includes("s3") ||
    type.includes("storage") ||
    type.includes("bucket") ||
    type.includes("ebs") ||
    type.includes("volume")
  ) {
    return HardDrive
  }

  // Network resources
  if (
    type.includes("vpc") ||
    type.includes("subnet") ||
    type.includes("route") ||
    type.includes("network") ||
    type.includes("security_group") ||
    type.includes("load_balancer") ||
    type.includes("elb") ||
    type.includes("alb")
  ) {
    return Network
  }

  // Security resources
  if (
    type.includes("iam") ||
    type.includes("role") ||
    type.includes("policy") ||
    type.includes("key") ||
    type.includes("certificate") ||
    type.includes("secret") ||
    type.includes("password")
  ) {
    return Lock
  }

  // DNS and domain resources
  if (type.includes("route53") || type.includes("dns") || type.includes("domain") || type.includes("cloudfront")) {
    return Globe
  }

  // Lambda and serverless resources
  if (type.includes("lambda") || type.includes("function") || type.includes("serverless")) {
    return Cpu
  }

  // Container resources
  if (
    type.includes("ecs") ||
    type.includes("eks") ||
    type.includes("container") ||
    type.includes("docker") ||
    type.includes("kubernetes")
  ) {
    return Box
  }

  // Monitoring resources
  if (type.includes("cloudwatch") || type.includes("monitor") || type.includes("alarm") || type.includes("log")) {
    return Gauge
  }

  // API Gateway resources
  if (type.includes("api") || type.includes("gateway") || type.includes("endpoint")) {
    return Webhook
  }

  // Identity resources
  if (type.includes("cognito") || type.includes("user") || type.includes("auth")) {
    return Users
  }

  // Analytics resources
  if (type.includes("kinesis") || type.includes("analytics") || type.includes("athena") || type.includes("redshift")) {
    return BarChart
  }

  // Messaging resources
  if (
    type.includes("sns") ||
    type.includes("sqs") ||
    type.includes("message") ||
    type.includes("notification") ||
    type.includes("email")
  ) {
    return Mail
  }

  // Configuration resources
  if (type.includes("parameter") || type.includes("config") || type.includes("setting")) {
    return Cog
  }

  // Security resources
  if (type.includes("waf") || type.includes("firewall") || type.includes("shield") || type.includes("guard")) {
    return ShieldAlert
  }

  // Step Functions and workflow resources
  if (type.includes("step") || type.includes("workflow") || type.includes("state")) {
    return Workflow
  }

  // Document resources
  if (type.includes("document") || type.includes("file")) {
    return FileText
  }

  // Default icon for AWS resources
  if (type.includes("aws")) {
    return Cloud
  }

  // Default fallback
  return Layers
}
