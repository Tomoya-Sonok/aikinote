aws_region     = "ap-northeast-1"
environment    = "dev"
app_name       = "aikinote"

# 以下の値は実際のVPC情報に置き換える必要があります
vpc_id             = "vpc-0a6cd48693298e30e"
public_subnet_ids  = ["subnet-08b90bdd7567ef4ee", "subnet-046126f8fdbb4ee9a"]
private_subnet_ids = ["subnet-09138215d4ee61ef5", "subnet-05c57ad12c8cf5bcf"]

# Supabase configuration (replace with actual values)
supabase_url                = "your-actual-supabase-url"
supabase_anon_key          = "your-actual-supabase-anon-key"
supabase_service_role_key  = "your-actual-supabase-service-role-key"