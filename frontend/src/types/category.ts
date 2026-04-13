export interface UserCategory {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}
