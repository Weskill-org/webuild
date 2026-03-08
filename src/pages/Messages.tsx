import DashboardLayout from "@/components/DashboardLayout";
import ConversationList from "@/components/chat/ConversationList";
import ChatThread from "@/components/chat/ChatThread";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/providers/AuthProvider";

const Messages = () => {
  const { profile } = useAuth();
  const {
    conversations,
    selectedPartner,
    setSelectedPartner,
    thread,
    loading,
    sendMessage,
    setTyping,
    isPartnerTyping,
  } = useChat();

  const selectedConv = conversations.find((c) => c.partnerId === selectedPartner);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)]">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        <div className="flex gap-4 h-[calc(100%-3rem)]">
          <ConversationList
            conversations={conversations}
            selectedPartner={selectedPartner}
            onSelect={setSelectedPartner}
            loading={loading}
          />
          <ChatThread
            selectedPartner={selectedPartner}
            selectedConv={selectedConv}
            thread={thread}
            profileId={profile?.id}
            isPartnerTyping={isPartnerTyping}
            onBack={() => setSelectedPartner(null)}
            onSend={sendMessage}
            onTyping={setTyping}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
