output "alb_dns_name" {
  description = "ALBのDNS名"
  value       = aws_lb.main.dns_name
}

output "ecr_frontend_repository_url" {
  description = "フロントエンド用ECRリポジトリURL"
  value       = aws_ecr_repository.repositories["aikinote-frontend"].repository_url
}

output "ecr_backend_repository_url" {
  description = "バックエンド用ECRリポジトリURL"
  value       = aws_ecr_repository.repositories["aikinote-backend"].repository_url
}

output "ecs_cluster_name" {
  description = "ECSクラスター名"
  value       = aws_ecs_cluster.main.name
}

output "frontend_service_name" {
  description = "フロントエンドサービス名"
  value       = aws_ecs_service.frontend.name
}

output "backend_service_name" {
  description = "バックエンドサービス名"
  value       = aws_ecs_service.backend.name
}