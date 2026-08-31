import Header from '@/components/Header';
import Chat from '@/components/Chat';
import { BUILD_TAG } from '@/lib/build';

export const metadata = {
  title: 'AI Pulse Chat — Ask About Models',
  description: 'Get recommendations on the best AI models for your use case, budget, and requirements.',
};

export default function ChatPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--fore)]">Chat</h1>
          <p className="text-sm text-[var(--mut)] mt-2">
            Ask AI Pulse about models, pricing, use cases, or recommendations.
          </p>
        </div>
        <Chat />
      </main>
      <footer className="border-t border-[var(--color-line)]">
        <div className="max-w-[1400px] mx-auto px-5 py-6 flex items-center justify-between text-xs text-[var(--dim)]">
          <span className="font-medium text-[var(--mut)]">AI Pulse</span>
          <span>build {BUILD_TAG}</span>
        </div>
      </footer>
    </div>
  );
}