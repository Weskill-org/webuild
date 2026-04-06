// Manual type definitions for database tables
// These provide type safety until Supabase types auto-regenerate

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'company' | 'student' | 'campus' | 'admin' | null;
  university: string | null;
  company_name: string | null;
  website: string | null;
  logo_url: string | null;
  skills: string[];
  linkedin: string | null;
  bio: string | null;
  phone: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string | null;
  project_type: string | null;
  sub_category: string | null;
  required_skills: string[];
  budget_min: number;
  budget_max: number;
  pricing_type: 'fixed' | 'hourly' | 'milestone';
  duration: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'open' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';
  completed: boolean;
  payout_released: boolean;
  certificate_issued: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  order_index: number;
  created_at: string;
}

export interface ProjectApplication {
  id: string;
  project_id: string;
  applicant_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  cover_letter: string | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  owner_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  type: 'credit' | 'debit' | 'commission';
  amount: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  body: string;
  read: boolean;
  created_at: string;
}

export interface Certificate {
  id: string;
  project_id: string | null;
  student_id: string;
  company_name: string | null;
  project_title: string | null;
  course_name: string | null;
  payout_amount: number | null;
  issued_at: string;
  certificate_uid: string;
  display_id: string | null;
  qr_data: string | null;
}

export interface Batch {
  id: string;
  campus_id: string;
  name: string;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface BatchStudent {
  id: string;
  batch_id: string;
  student_id: string;
  joined_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  created_at: string;
}
