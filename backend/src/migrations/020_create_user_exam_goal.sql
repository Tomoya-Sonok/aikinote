CREATE TABLE "UserExamGoal" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE UNIQUE,
  exam_rank TEXT NOT NULL,
  exam_date DATE NOT NULL,
  prev_exam_date DATE,
  target_attendance INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "UserExamGoal" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own exam goals"
  ON "UserExamGoal"
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_exam_goal_user_id ON "UserExamGoal"(user_id);
