import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/hooks/use-toast';
import { Project, Message, Wallet, Transaction, Certificate, Notification } from '@/types/database';
import { useQueryClient } from '@tanstack/react-query';

type TableName = 'projects' | 'wallets' | 'transactions' | 'messages' | 'certificates' | 'notifications';

interface RealtimeRow {
  id: string;
  recipient_id?: string;
  sender_id?: string;
  owner_id?: string;
  balance?: number;
  completed?: boolean;
  title?: string;
  sender_name?: string;
  [key: string]: any;
}

export default function useRealtime() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [acceptedProjectIds, setAcceptedProjectIds] = useState<string[]>([]);
  const [appliedProjectIds, setAppliedProjectIds] = useState<string[]>([]);
  const [campusStudentIds, setCampusStudentIds] = useState<string[]>([]);
  const [campusProjectIds, setCampusProjectIds] = useState<string[]>([]);

  const applyChange = useCallback((
    table: TableName, 
    payload: RealtimePostgresChangesPayload<RealtimeRow>
  ) => {
    const { eventType, new: newRow, old: oldRow } = payload;

    const updater = <T extends { id: string }>(setArr: React.Dispatch<React.SetStateAction<T[]>>) => {
      setArr((prev) => {
        if (eventType === 'INSERT' && newRow) {
          return [newRow as unknown as T, ...prev];
        } else if (eventType === 'UPDATE' && newRow) {
          return prev.map((r) => (r.id === newRow.id ? { ...r, ...newRow as unknown as T } : r));
        } else if (eventType === 'DELETE' && oldRow) {
          return prev.filter((r) => r.id !== oldRow.id);
        }
        return prev;
      });
    };

    switch (table) {
      case 'projects':
        updater(setProjects);
        queryClient.setQueryData<Project[]>(['realtime-projects', profile?.id], (old) => {
          if (!old) return old;
          let next = old;
          if (eventType === 'INSERT' && newRow) {
            next = [newRow as unknown as Project, ...old];
          } else if (eventType === 'UPDATE' && newRow) {
            next = old.map((r) => (r.id === newRow.id ? { ...r, ...newRow as unknown as Project } : r));
          } else if (eventType === 'DELETE' && oldRow) {
            next = old.filter((r) => r.id !== oldRow.id);
          }
          return next;
        });
        break;
      case 'messages':
        updater(setMessages);
        break;
      case 'wallets':
        updater(setWallets);
        break;
      case 'transactions':
        updater(setTransactions);
        break;
      case 'certificates':
        updater(setCertificates);
        break;
      case 'notifications':
        updater(setNotifications);
        break;
    }
  }, [profile?.id, queryClient]);

  useEffect(() => {
    if (!user || !profile?.id) return;

    const channel = supabase.channel('public-realtime');

    const tables: TableName[] = ['projects', 'wallets', 'transactions', 'messages', 'certificates', 'notifications'];

    tables.forEach((table) => {
      channel.on(
        'postgres_changes', 
        { event: '*', schema: 'public', table }, 
        (payload: RealtimePostgresChangesPayload<RealtimeRow>) => {
          try {
            const newRow = payload.new as RealtimeRow | null;
            const oldRow = payload.old as RealtimeRow | null;

            // Messages: only care if recipient or sender is the current user
            if (table === 'messages') {
              const isForUser = 
                (newRow && (newRow.recipient_id === profile?.id || newRow.sender_id === profile?.id)) || 
                (oldRow && (oldRow.recipient_id === profile?.id || oldRow.sender_id === profile?.id));
              if (!isForUser) return;

              if (payload.eventType === 'INSERT' && newRow?.recipient_id === profile?.id) {
                toast({ title: 'New message', description: `From ${newRow.sender_name ?? 'someone'}` });
              }
            }

            // Wallets & transactions: only if owner is current user
            if (table === 'wallets' || table === 'transactions') {
              const ownerId = newRow?.owner_id ?? oldRow?.owner_id;
              if (ownerId !== profile?.id) return;

              if (table === 'wallets' && payload.eventType === 'UPDATE' && newRow && oldRow && newRow.balance !== oldRow.balance) {
                const diff = (newRow.balance ?? 0) - (oldRow.balance ?? 0);
                toast({ title: 'Wallet updated', description: `Balance ${diff >= 0 ? 'increased' : 'decreased'} by $${Math.abs(diff)}` });
              }
            }

            // Projects
            if (table === 'projects') {
              if (payload.eventType === 'INSERT' && newRow) {
                if (profile?.role === 'student') {
                  toast({ title: 'New project posted', description: newRow.title });
                }
                if (profile?.role === 'company' && newRow.owner_id !== profile?.id) return;
              }

              if (payload.eventType === 'UPDATE' && newRow && oldRow) {
                if (!oldRow.completed && newRow.completed) {
                  const showToUser = profile?.role === 'company' ? newRow.owner_id === profile?.id : true;
                  if (showToUser) {
                    toast({ title: 'Project completed', description: newRow.title });
                  }
                }
              }
            }

            // Certificates: if owned by user
            if (table === 'certificates') {
              const studentId = (newRow as any)?.student_id ?? (oldRow as any)?.student_id;
              if (studentId !== profile?.id) return;
            }

            // Notifications: only if user_id matches
            if (table === 'notifications') {
              const userId = newRow?.user_id ?? oldRow?.user_id;
              if (userId !== profile?.id) return;

              if (payload.eventType === 'INSERT' && newRow) {
                toast({ title: newRow.title, description: newRow.body });
              }
            }

            applyChange(table, payload);
          } catch (err) {
            // swallow
          }
        }
      );
    });

    channel.subscribe();

    // Initial fetch
    (async () => {
      try {
        // --- Role-aware auxiliary data fetching ---
        if (profile?.role === 'student') {
          // Student: fetch their applications first for state
          const { data: allApps } = await supabase
            .from('project_applications')
            .select('project_id, status')
            .eq('applicant_id', profile.id);

          const apps = allApps ?? [];
          const accepted = apps.filter(a => a.status === 'accepted').map(a => a.project_id);
          const applied = apps.filter(a => a.status === 'pending').map(a => a.project_id);
          setAcceptedProjectIds(accepted);
          setAppliedProjectIds(applied);
        } else if (profile?.role === 'campus') {
          // Campus: get batches → students → their accepted applications → projects
          const { data: batches } = await supabase
            .from('batches')
            .select('id')
            .eq('campus_id', profile.id);
          const batchIds = (batches ?? []).map((b: any) => b.id);

          let studentIds: string[] = [];
          if (batchIds.length > 0) {
            const { data: batchStudents } = await supabase
              .from('batch_students')
              .select('student_id')
              .in('batch_id', batchIds);
            studentIds = [...new Set((batchStudents ?? []).map((bs: any) => bs.student_id))];
          }
          setCampusStudentIds(studentIds);

          if (studentIds.length > 0) {
            const { data: campusApps } = await supabase
              .from('project_applications')
              .select('project_id')
              .in('applicant_id', studentIds)
              .eq('status', 'accepted');
            const projIds = [...new Set((campusApps ?? []).map((a: any) => a.project_id))];
            setCampusProjectIds(projIds);
          }
        }

        // --- Fetch Projects with Caching ---
        const cachedProjects = queryClient.getQueryData<Project[]>(['realtime-projects', profile?.id]);
        if (cachedProjects) {
          setProjects(cachedProjects);
        } else {
          let projData: any = null;
          if (profile?.role === 'company') {
            const { data } = await supabase
              .from('projects')
              .select('id, owner_id, title, description, project_type, sub_category, required_skills, budget_min, budget_max, pricing_type, commission_type, commission_min, commission_max, duration, status, completed, created_at, updated_at, profiles:owner_id(company_name, logo_url)')
              .eq('owner_id', profile.id);
            projData = data;
          } else {
            const { data } = await supabase.from('projects').select('id, owner_id, title, description, project_type, sub_category, required_skills, budget_min, budget_max, pricing_type, commission_type, commission_min, commission_max, duration, status, completed, created_at, updated_at, profiles:owner_id(company_name, logo_url)');
            projData = data;
          }

          if (projData) {
            setProjects(projData as Project[]);
            queryClient.setQueryData(['realtime-projects', profile?.id], projData);
          }
        }

        const { data: msgData } = await supabase
          .from('messages')
          .select('id, sender_id, recipient_id, subject, body, read, created_at')
          .or(`recipient_id.eq.${profile.id},sender_id.eq.${profile.id}`);
        setMessages((msgData as Message[]) ?? []);

        const { data: walletData } = await supabase
          .from('wallets')
          .select('id, owner_id, balance, currency, created_at, updated_at')
          .eq('owner_id', profile.id);
        
        const fetchedWallets = (walletData as Wallet[]) ?? [];
        setWallets(fetchedWallets);

        if (fetchedWallets.length > 0) {
          const { data: txData } = await supabase
            .from('transactions')
            .select('id, wallet_id, type, amount, description, reference_id, created_at')
            .eq('wallet_id', fetchedWallets[0].id);
          setTransactions((txData as Transaction[]) ?? []);
        }

        const { data: certData } = await supabase
          .from('certificates')
          .select('id, project_id, student_id, company_name, project_title, course_name, payout_amount, issued_at, certificate_uid, display_id, qr_data')
          .eq('student_id', profile.id);
        setCertificates((certData as Certificate[]) ?? []);

        const { data: notifData } = await supabase
          .from('notifications')
          .select('id, user_id, title, body, type, read, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        setNotifications((notifData as Notification[]) ?? []);
      } catch (err) {
        console.error('Realtime initial fetch error', err);
      }
    })();

    return () => {
      channel.unsubscribe();
    };
  }, [user, profile?.id, profile?.role, applyChange]);

  // ⚡ Bolt: Wrapped derived state calculations in useMemo
  // 🎯 Why: These values were being recalculated on every render of useRealtime hook. Since this hook is used across many components (DashboardLayout, Projects, etc.), avoiding recalculations of expensive array operations improves overall app performance.
  // 📊 Impact: Prevents unnecessary array filtering/reducing when unrelated state changes trigger re-renders.

  // Active Projects: non-completed projects the user is involved in
  const activeProjectsCount = useMemo(() => {
    if (profile?.role === 'student') {
      // Student: projects they have an accepted application for, not yet completed
      return projects.filter((p) => acceptedProjectIds.includes(p.id) && p.status !== 'completed' && p.status !== 'submitted').length;
    }
    if (profile?.role === 'campus') {
      // Campus: projects their students are working on (accepted), not yet completed
      return projects.filter((p) => campusProjectIds.includes(p.id) && p.status !== 'completed' && p.status !== 'submitted').length;
    }
    // Company: projects they own, not yet completed
    return projects.filter((p) => p.status !== 'completed').length;
  }, [profile?.role, projects, acceptedProjectIds, campusProjectIds]);

  // ⚡ Bolt Optimization: Memoized computed counts
  // 🎯 Why: Prevented O(n) recalculations across the full projects list.
  // 📊 Impact: O(1) time complexity on re-renders unless relevant dependencies change.
  // Completed: finished projects the user is involved in
  const completedCount = useMemo(() => {
    if (profile?.role === 'student') {
      // Student: only count THEIR completed projects
      return projects.filter((p) => acceptedProjectIds.includes(p.id) && (p.status === 'completed' || p.status === 'submitted')).length;
    }
    if (profile?.role === 'campus') {
      // Campus: count projects their students finished (completed or submitted)
      return projects.filter((p) => campusProjectIds.includes(p.id) && (p.status === 'completed' || p.status === 'submitted')).length;
    }
    return projects.filter((p) => p.status === 'completed').length;
  }, [profile?.role, projects, acceptedProjectIds, campusProjectIds]);

  // ⚡ Bolt Optimization: Memoized derived states
  // 🎯 Why: Derived data from arrays (reduce, filter) was re-evaluating unnecessarily on any state change.
  // 📊 Impact: Avoids multiple O(n) passes on the wallets, messages, and notifications arrays on unrelated updates.
  const walletBalance = useMemo(() => wallets.reduce((acc, w) => acc + (w.balance ?? 0), 0), [wallets]);
  const unreadMessages = useMemo(() => messages.filter((m) => !m.read && m.recipient_id === profile?.id).length, [messages, profile?.id]);
  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return {
    projects,
    messages,
    wallets,
    transactions,
    certificates,
    notifications,
    activeProjectsCount,
    completedCount,
    walletBalance,
    unreadMessages,
    unreadNotifications,
  } as const;
}
