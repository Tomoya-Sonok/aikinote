export type TrainingPageAttachment = {
  id: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
};

export type TrainingPageData = {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  date: string;
  tags: string[];
  attachments: TrainingPageAttachment[];
};
