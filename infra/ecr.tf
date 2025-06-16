resource "aws_ecr_repository" "repositories" {
  for_each = toset(var.ecr_repository_names)
  
  name                 = each.key
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECRライフサイクルポリシー - 古いイメージを自動削除
resource "aws_ecr_lifecycle_policy" "lifecycle_policies" {
  for_each = toset(var.ecr_repository_names)
  
  repository = aws_ecr_repository.repositories[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}