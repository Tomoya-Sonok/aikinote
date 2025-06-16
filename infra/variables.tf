variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name (e.g. dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "aikinote"
}

variable "ecr_repository_names" {
  description = "Names of ECR repositories to create"
  type        = list(string)
  default     = ["aikinote-frontend", "aikinote-backend"]
}

variable "vpc_id" {
  description = "VPC ID to deploy resources"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}