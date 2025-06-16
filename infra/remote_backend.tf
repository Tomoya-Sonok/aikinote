# 本番運用時はS3バックエンドを設定
# terraform {
#   backend "s3" {
#     bucket         = "terraform-state-aikinote"
#     key            = "aikinote/terraform.tfstate"
#     region         = "ap-northeast-1"
#     dynamodb_table = "terraform-state-lock"
#     encrypt        = true
#   }
# }

# ローカル開発では以下を使用
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}