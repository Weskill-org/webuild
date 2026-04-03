import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/hooks/use-toast';
import { Project, Message, Wallet, Transaction, Certificate, Notification } from '@/types/database';

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
  }, []);

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
        // --- Role-aware project fetching ---
        if (profile?.role === 'company') {
          // Company: only their own projects
          const { data: projData } = await supabase
            .from('projects')
            .select('*')
            .eq('owner_id', profile.id);
          setProjects((projData as Project[]) ?? []);
        } else if (profile?.role === 'student') {
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

          // Fetch ALL projects for student (Marketplace needs this)
          const { data: projData } = await supabase.from('projects').select('*');
          setProjects((projData as Project[]) ?? []);
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

            if (projIds.length > 0) {
              const { data: projData } = await supabase
                .from('projects')
                .select('*')
                .in('id', projIds);
              setProjects((projData as Project[]) ?? []);
            } else {
              setProjects([]);
            }
          } else {
            setProjects([]);
          }
        } else {
          // Fallback: admin or other roles
          const { data: projData } = await supabase.from('projects').select('*');
          setProjects((projData as Project[]) ?? []);
        }

        const { data: msgData } = await supabase
          .from('messages')
          .select('*')
          .or(`recipient_id.eq.${profile.id},sender_id.eq.${profile.id}`);
        setMessages((msgData as Message[]) ?? []);

        const { data: walletData } = await supabase
          .from('wallets')
          .select('*')
          .eq('owner_id', profile.id);
        
        const fetchedWallets = (walletData as Wallet[]) ?? [];
        setWallets(fetchedWallets);

        if (fetchedWallets.length > 0) {
          const { data: txData } = await supabase
            .from('transactions')
            .select('*')
            .eq('wallet_id', fetchedWallets[0].id);
          setTransactions((txData as Transaction[]) ?? []);
        }

        const { data: certData } = await supabase
          .from('certificates')
          .select('*')
          .eq('student_id', profile.id);
        setCertificates((certData as Certificate[]) ?? []);

        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
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

  // Active Projects: non-completed projects the user is involved in
  const activeProjectsCount = (() => {
    if (profile?.role === 'student') {
      // Student: projects they have an accepted application for, not yet completed
      return projects.filter((p) => acceptedProjectIds.includes(p.id) && p.status !== 'completed' && p.status !== 'submitted').length;
    }
    // Company & Campus: all fetched projects are already scoped to the user
    return projects.filter((p) => p.status !== 'completed').length;
  })();

  // Completed: finished projects the user is involved in
  const completedCount = (() => {
    if (profile?.role === 'student') {
      // Student: only count THEIR completed projects
      return projects.filter((p) => acceptedProjectIds.includes(p.id) && (p.status === 'completed' || p.status === 'submitted')).length;
    }
    return projects.filter((p) => p.status === 'completed').length;
  })();
  const walletBalance = wallets.reduce((acc, w) => acc + (w.balance ?? 0), 0);
  const unreadMessages = messages.filter((m) => !m.read && m.recipient_id === profile?.id).length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

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
