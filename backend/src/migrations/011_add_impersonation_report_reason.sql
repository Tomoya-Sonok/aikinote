-- 011: PostReport に「なりすまし (impersonation)」通報理由を追加
ALTER TABLE "PostReport"
  DROP CONSTRAINT IF EXISTS "PostReport_reason_check",
  ADD CONSTRAINT "PostReport_reason_check"
    CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'impersonation', 'other'));
