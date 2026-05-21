import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from '@/hooks/use-toast';

/**
 * Manages Android push notification lifecycle:
 * - Requests permission & registers for push
 * - Stores FCM token in Supabase `fcm_tokens` table
 * - Shows heads-up toast for foreground notifications
 * - Navigates on notification tap based on `type` field
 * - Cleans up on unmount
 */
export default function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tokenRef = useRef<string | null>(null);
  const registeredRef = useRef(false);

  // --- Save FCM token to Supabase ---
  const saveToken = useCallback(async (token: string) => {
    if (!user) return;
    try {
      // Upsert: if (user_id, token) already exists, update the timestamp
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            user_id: user.id,
            token,
            device_info: `Android ${navigator.userAgent?.slice(0, 100) ?? 'unknown'}`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' }
        );

      if (error) {
        console.error('[Push] Error saving FCM token:', error);
      } else {
        console.log('[Push] FCM token saved successfully');
      }
    } catch (err) {
      console.error('[Push] Exception saving token:', err);
    }
  }, [user]);

  // --- Remove FCM token from Supabase (called on logout) ---
  const removeToken = useCallback(async () => {
    if (!user || !tokenRef.current) return;
    try {
      await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', tokenRef.current);
      console.log('[Push] FCM token removed');
    } catch (err) {
      console.error('[Push] Error removing token:', err);
    }
  }, [user]);

  // --- Navigate based on notification type ---
  const handleNotificationTap = useCallback((data: Record<string, string>) => {
    const type = data?.type ?? '';
    const chatId = data?.chatId;

    if (type === 'message' && chatId) {
      // Navigate to messages with chatId context
      navigate('/messages', { state: { chatId } });
    } else if (type === 'message') {
      navigate('/messages');
    } else {
      // All other notification types → notification screen
      navigate('/notifications');
    }
  }, [navigate]);

  useEffect(() => {
    // Only run on native Android/iOS
    if (!Capacitor.isNativePlatform()) return;
    if (!user) return;
    if (registeredRef.current) return;

    const setupPush = async () => {
      try {
        // 1. Check / request permission
        let permResult = await PushNotifications.checkPermissions();

        if (permResult.receive === 'prompt') {
          permResult = await PushNotifications.requestPermissions();
        }

        if (permResult.receive !== 'granted') {
          console.warn('[Push] Permission not granted:', permResult.receive);
          return;
        }

        // 2. Register for push
        await PushNotifications.register();
        registeredRef.current = true;

        // 3. Listen for registration success → save token
        PushNotifications.addListener('registration', async (token: Token) => {
          console.log('[Push] Registration token:', token.value);
          tokenRef.current = token.value;
          await saveToken(token.value);
        });

        // 4. Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('[Push] Registration error:', error);
        });

        // 5. Listen for foreground notifications → show heads-up toast
        PushNotifications.addListener(
          'pushNotificationReceived',
          (notification: PushNotificationSchema) => {
            // Show in-app toast for foreground notifications
            toast({
              title: notification.title ?? 'Notification',
              description: notification.body ?? '',
            });
          }
        );

        // 6. Listen for notification tap → navigate
        PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action: ActionPerformed) => {
            console.log('[Push] Notification tapped:', action);
            const data = action.notification.data ?? {};
            handleNotificationTap(data);
          }
        );
      } catch (err) {
        console.error('[Push] Setup error:', err);
      }
    };

    setupPush();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user, saveToken, handleNotificationTap]);

  return { removeToken, token: tokenRef.current };
}
