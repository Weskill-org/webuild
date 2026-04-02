
-- Central record_activity function
CREATE OR REPLACE FUNCTION public.record_activity(
  p_actor_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_metadata jsonb DEFAULT '{}'
) RETURNS void AS $$
BEGIN
  INSERT INTO public.activity_feed (actor_id, action, target_type, target_id, metadata)
  VALUES (p_actor_id, p_action, p_target_type, p_target_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Project Triggers (Posted and Completed)
CREATE OR REPLACE FUNCTION public.on_project_activity()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_activity(
      NEW.owner_id,
      'project_posted',
      'project',
      NEW.id,
      jsonb_build_object('title', NEW.title)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      PERFORM public.record_activity(
        NEW.owner_id,
        'project_completed',
        'project',
        NEW.id,
        jsonb_build_object('title', NEW.title)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_project_activity
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.on_project_activity();

-- 2. Application Triggers
CREATE OR REPLACE FUNCTION public.on_application_activity()
RETURNS trigger AS $$
DECLARE
  v_project_title text;
BEGIN
  SELECT title INTO v_project_title FROM public.projects WHERE id = NEW.project_id;
  
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_activity(
      NEW.applicant_id,
      'application_submitted',
      'project',
      NEW.project_id,
      jsonb_build_object('title', v_project_title)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_application_activity
  AFTER INSERT ON public.project_applications
  FOR EACH ROW EXECUTE FUNCTION public.on_application_activity();

-- 3. Milestone Triggers
CREATE OR REPLACE FUNCTION public.on_milestone_activity()
RETURNS trigger AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.projects WHERE id = NEW.project_id;
  
  IF TG_OP = 'UPDATE' AND OLD.completed = false AND NEW.completed = true THEN
    PERFORM public.record_activity(
      v_owner_id,
      'milestone_completed',
      'milestone',
      NEW.id,
      jsonb_build_object('title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_milestone_activity
  AFTER UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.on_milestone_activity();

-- 4. Review Triggers
CREATE OR REPLACE FUNCTION public.on_review_activity()
RETURNS trigger AS $$
DECLARE
  v_project_title text;
BEGIN
  SELECT title INTO v_project_title FROM public.projects WHERE id = NEW.project_id;
  
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_activity(
      NEW.reviewer_id,
      'review_posted',
      'project',
      NEW.project_id,
      jsonb_build_object('title', v_project_title, 'rating', NEW.rating)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_review_activity
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.on_review_activity();

-- 5. Certificate Triggers
CREATE OR REPLACE FUNCTION public.on_certificate_activity()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_activity(
      NEW.student_id,
      'certificate_earned',
      'certificate',
      NEW.id,
      jsonb_build_object('title', NEW.project_title)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_certificate_activity
  AFTER INSERT ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.on_certificate_activity();

-- 6. Skill Badge Triggers
CREATE OR REPLACE FUNCTION public.on_badge_activity()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.passed = true THEN
    PERFORM public.record_activity(
      NEW.user_id,
      'certificate_earned', -- Using same action for UI consistency or could use 'badge_earned'
      'badge',
      NEW.id,
      jsonb_build_object('title', NEW.skill_name)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_badge_activity
  AFTER INSERT OR UPDATE ON public.skill_badges
  FOR EACH ROW EXECUTE FUNCTION public.on_badge_activity();

-- 7. Partnership Triggers
CREATE OR REPLACE FUNCTION public.on_partnership_activity()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_activity(
      NEW.company_id,
      'partnership_requested',
      'partnership',
      NEW.id,
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_partnership_activity
  AFTER INSERT ON public.partnership_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_partnership_activity();
