import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/hooks/use-toast';
import type { Project, Message, Wallet, Transaction, Certificate } from '@/types/database';

type TableName = 'projects' | 'wallets' | 'transactions' | 'messages' | 'certificates';

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
          return prev.map((r) => (r.id === newRow.id ? newRow as unknown as T : r));
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
    }
  }, []);

  useEffect(() => {
    if (!user || !profile?.id) return;

    const channel = supabase.channel('public-realtime');

    const tables: TableName[] = ['projects', 'wallets', 'transactions', 'messages', 'certificates'];

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
        let projQuery = supabase.from('projects').select('*');
        if (profile?.role === 'company') {
          projQuery = projQuery.eq('owner_id', profile.id);
        }
        const { data: projData } = await projQuery;
        setProjects((projData as Project[]) ?? []);

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
      } catch (err) {
        console.error('Realtime initial fetch error', err);
      }
    })();

    return () => {
      channel.unsubscribe();
    };
  }, [user, profile?.id, profile?.role, applyChange]);

  const activeProjectsCount = projects.filter((p) => !p.completed).length;
  const completedCount = projects.filter((p) => p.completed).length;
  const walletBalance = wallets.reduce((acc, w) => acc + (w.balance ?? 0), 0);
  const unreadMessages = messages.filter((m) => !m.read && m.recipient_id === profile?.id).length;

  return {
    projects,
    messages,
    wallets,
    transactions,
    certificates,
    activeProjectsCount,
    completedCount,
    walletBalance,
    unreadMessages,
  } as const;
}
