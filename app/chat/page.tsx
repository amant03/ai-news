import Chat from '@/components/Chat';

export const metadata = {
  title: 'AI Pulse Chat — Ask About Models',
  description: 'Get recommendations on the best AI models for your use case, budget, and requirements.',
};

export default function ChatPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <Chat />
    </main>
  );
}
