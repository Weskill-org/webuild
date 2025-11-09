import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/hooks/use-toast';

type TableName = 'projects' | 'wallets' | 'transactions' | 'messages' | 'certificates';

export default function useRealtime() {
  const { user, profile } = useAuth() as any;
  const [projects, setProjects] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);

  // Helper to apply change to state
  const applyChange = useCallback((table: TableName, payload: RealtimePostgresChangesPayload<any>) => {
    const { eventType, new: newRow, old: oldRow } = payload;

    const updater = (arr: any[], setArr: (v: any[]) => void) => {
      if (eventType === 'INSERT') {
        setArr([newRow, ...arr]);
      } else if (eventType === 'UPDATE') {
        setArr(arr.map((r) => (r.id === newRow.id ? newRow : r)));
      } else if (eventType === 'DELETE') {
        setArr(arr.filter((r) => r.id !== oldRow.id));
      }
    };

    switch (table) {
      case 'projects':
        updater(projects, setProjects);
        break;
      case 'messages':
        updater(messages, setMessages);
        break;
      case 'wallets':
        updater(wallets, setWallets);
        break;
      case 'transactions':
        updater(transactions, setTransactions);
        break;
      case 'certificates':
        updater(certificates, setCertificates);
        break;
    }
  }, [projects, messages, wallets, transactions, certificates]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('public-realtime');

    const tables: TableName[] = ['projects', 'wallets', 'transactions', 'messages', 'certificates'];

    // Subscribe to INSERT/UPDATE/DELETE for each table
    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        try {
          const ev = payload as RealtimePostgresChangesPayload<any>;

          // Role-aware filtering
          const newRow = ev.new ?? null;
          const oldRow = ev.old ?? null;

          // Messages: only care if recipient or sender is the current user
          if (table === 'messages') {
            const isForUser = (newRow && (newRow.recipient_id === profile?.id || newRow.sender_id === profile?.id)) || (oldRow && (oldRow.recipient_id === profile?.id || oldRow.sender_id === profile?.id));
            if (!isForUser) return;

            // New message received for user -> toast
            if (ev.eventType === 'INSERT' && newRow.recipient_id === profile?.id) {
              toast({ title: 'New message', description: `From ${newRow.sender_name ?? 'someone'}` });
            }
          }

          // Wallets & transactions: only if owner is current user
          if (table === 'wallets' || table === 'transactions') {
            const ownerId = newRow?.owner_id ?? oldRow?.owner_id;
            if (ownerId !== profile?.id) return;

            // Wallet balance change -> toast
            if (table === 'wallets' && ev.eventType === 'UPDATE' && newRow && oldRow && newRow.balance !== oldRow.balance) {
              const diff = (newRow.balance ?? 0) - (oldRow.balance ?? 0);
              toast({ title: 'Wallet updated', description: `Balance ${diff >= 0 ? 'increased' : 'decreased'} by $${Math.abs(diff)}` });
            }
          }

          // Projects: students see all new projects, companies see their own
          if (table === 'projects') {
            if (ev.eventType === 'INSERT') {
              // New project posted
              if (profile?.role === 'student') {
                toast({ title: 'New project posted', description: newRow?.title });
              }
              // for companies we only care if it's their own project
              if (profile?.role === 'company' && newRow?.owner_id !== profile?.id) return;
            }

            if (ev.eventType === 'UPDATE' && newRow && oldRow) {
              // Project completion
              if (!oldRow.completed && newRow.completed) {
                // If company owner or campus or student who applied - show toast
                const showToUser = profile?.role === 'company' ? newRow.owner_id === profile?.id : true;
                if (showToUser) {
                  toast({ title: 'Project completed', description: newRow.title });
                }
              }
            }
          }

          // Certificates: if owned by user
          if (table === 'certificates') {
            const ownerId = newRow?.owner_id ?? oldRow?.owner_id;
            if (ownerId !== profile?.id) return;
          }

          // If we reach here, apply the change to local state
          applyChange(table, ev as RealtimePostgresChangesPayload<any>);
        } catch (err) {
          // swallow - don't crash realtime subscription
        }
      });
    });

    channel.subscribe();

    // Initial fetch for current state
    (async () => {
      try {
        // Projects: for students show active/open projects, for companies show their posted projects, campus maybe all
        let projQuery = supabase.from('projects').select('*');
        if (profile?.role === 'company') {
          projQuery = projQuery.eq('owner_id', profile.id);
        }
        const { data: projData } = await projQuery;
        setProjects(projData ?? []);

        const { data: msgData } = await supabase.from('messages').select('*').or(`recipient_id.eq.${profile?.id},sender_id.eq.${profile?.id}`);
        setMessages(msgData ?? []);

        const { data: walletData } = await supabase.from('wallets').select('*').eq('owner_id', profile?.id);
        setWallets(walletData ?? []);

        const { data: txData } = await supabase.from('transactions').select('*').eq('owner_id', profile?.id);
        setTransactions(txData ?? []);

        const { data: certData } = await supabase.from('certificates').select('*').eq('owner_id', profile?.id);
        setCertificates(certData ?? []);
      } catch (err) {
        // console.error(err);
      }
    })();

    return () => {
      channel.unsubscribe();
    };
  }, [user, profile, applyChange]);

  // Derived stats
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
