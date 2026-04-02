export type DayStatus = {
  isAttended: boolean;
  pageCount: number;
};

export interface ReminderData {
  reminder_time: string;
  reminder_days: number[];
}

export interface ExamGoalData {
  exam_rank: string;
  exam_date: string;
  prev_exam_date: string | null;
  target_attendance: number;
}
