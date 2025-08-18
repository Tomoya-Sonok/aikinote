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

# Supabase secrets from Parameter Store
data "aws_ssm_parameter" "supabase_url" {
  name            = "/aikinote/${var.environment}/supabase_url"
  with_decryption = true
}

data "aws_ssm_parameter" "supabase_anon_key" {
  name            = "/aikinote/${var.environment}/supabase_anon_key"
  with_decryption = true
}

data "aws_ssm_parameter" "supabase_service_role_key" {
  name            = "/aikinote/${var.environment}/supabase_service_role_key"
  with_decryption = true
}

# SSMパラメータ - 環境変数の管理用
resource "aws_ssm_parameter" "frontend_env" {
  name        = "/${var.app_name}/${var.environment}/frontend/env"
  description = "フロントエンド用環境変数"
  type        = "SecureString"
  value = jsonencode({
    NEXT_PUBLIC_SUPABASE_URL      = data.aws_ssm_parameter.supabase_url.value
    NEXT_PUBLIC_SUPABASE_ANON_KEY = data.aws_ssm_parameter.supabase_anon_key.value
  })

  tags = local.common_tags
}

resource "aws_ssm_parameter" "backend_env" {
  name        = "/${var.app_name}/${var.environment}/backend/env"
  description = "バックエンド用環境変数"
  type        = "SecureString"
  value = jsonencode({
    SUPABASE_URL              = data.aws_ssm_parameter.supabase_url.value
    SUPABASE_SERVICE_ROLE_KEY = data.aws_ssm_parameter.supabase_service_role_key.value
  })

  tags = local.common_tags
}
