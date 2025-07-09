# メインのTerraform設定ファイル
# このファイルでは、特定のモジュールに当てはまらない共通リソースを定義

# タグ付けのためのローカル変数
locals {
  common_tags = {
    Project     = "AikiNote"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# SSMパラメータ - 環境変数の管理用
resource "aws_ssm_parameter" "frontend_env" {
  name        = "/${var.app_name}/${var.environment}/frontend/env"
  description = "フロントエンド用環境変数"
  type        = "SecureString"
  value       = jsonencode({
    NEXT_PUBLIC_SUPABASE_URL      = var.supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY = var.supabase_anon_key
  })

  tags = local.common_tags
}

resource "aws_ssm_parameter" "backend_env" {
  name        = "/${var.app_name}/${var.environment}/backend/env"
  description = "バックエンド用環境変数"
  type        = "SecureString"
  value       = jsonencode({
    SUPABASE_URL              = var.supabase_url
    SUPABASE_SERVICE_ROLE_KEY = var.supabase_service_role_key
  })

  tags = local.common_tags
}