# SSL Certificate using AWS Certificate Manager (ACM)
resource "aws_acm_certificate" "main" {
  domain_name               = "aikinote.com"
  subject_alternative_names = ["*.aikinote.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "aikinote-certificate-${var.environment}"
    Environment = var.environment
    Project     = var.app_name
    ManagedBy   = "Terraform"
  }
}

# Output certificate validation records for manual DNS setup
output "certificate_validation_records" {
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  description = "Certificate validation DNS records to be added to GMO DNS"
}

# Certificate validation (will be pending until DNS records are added)
# Note: This will remain in "PENDING_VALIDATION" state until DNS records are added manually
# resource "aws_acm_certificate_validation" "main" {
#   certificate_arn = aws_acm_certificate.main.arn
#   
#   timeouts {
#     create = "10m"
#   }
# }
