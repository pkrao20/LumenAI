import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900">Welcome to Chat</h1>
        <p className="mt-3 text-lg text-zinc-500">
          An AI-powered chat assistant at your fingertips.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
